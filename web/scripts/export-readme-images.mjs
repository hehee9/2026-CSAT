import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { access, mkdir, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { copyDataFiles } from './copy-data.mjs'
import {
  EXPORT_GROUP_ORDER,
  EXPORT_TARGETS,
  getExportTargetById,
  getExportTargetsByGroup
} from './export-manifest.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const webRoot = path.resolve(__dirname, '..')
const DEFAULT_VIEWPORT = { width: 1920, height: 1400 }
const DOWNLOAD_TIMEOUT_MS = 20000
const READINESS_POLL_INTERVAL_MS = 250
const DIAGNOSTICS_DIR = path.join(webRoot, '.tmp', 'export-diagnostics')
const GROUP_TIMEOUTS = {
  overview: 20000,
  subjects: 25000,
  cost: 45000
}
const NO_DATA_PATTERNS = [
  '데이터가 없습니다',
  '비용 데이터가 없습니다',
  'No data available',
  'No cost data available'
]

function parseCsvList(rawValue) {
  if (!rawValue) return []

  return rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function uniqueValues(values) {
  return [...new Set(values)]
}

function parseArgs(argv) {
  const options = {
    onlyIds: [],
    groups: [],
    positionals: [],
    headed: false,
    baseUrl: '',
    viewport: { ...DEFAULT_VIEWPORT }
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]

    if (arg === '--only') {
      options.onlyIds.push(...parseCsvList(argv[i + 1] || ''))
      i += 1
      continue
    }

    if (arg === '--group') {
      options.groups.push(argv[i + 1] || '')
      i += 1
      continue
    }

    if (arg === '--headed') {
      options.headed = true
      continue
    }

    if (arg === '--base-url') {
      options.baseUrl = argv[i + 1] || ''
      i += 1
      continue
    }

    if (arg === '--viewport') {
      const rawViewport = argv[i + 1] || ''
      const match = rawViewport.match(/^(\d+)x(\d+)$/i)
      if (!match) {
        throw new Error(`Invalid viewport: ${rawViewport}`)
      }
      options.viewport = {
        width: Number(match[1]),
        height: Number(match[2])
      }
      i += 1
      continue
    }

    if (!arg.startsWith('--')) {
      options.positionals.push(arg)
    }
  }

  options.onlyIds = uniqueValues(options.onlyIds)
  options.groups = uniqueValues(options.groups.map((group) => group.trim()).filter(Boolean))

  if (options.onlyIds.length === 0 && process.env.npm_config_only) {
    options.onlyIds = uniqueValues(parseCsvList(process.env.npm_config_only))
  }

  if (options.groups.length === 0 && process.env.npm_config_group) {
    options.groups = uniqueValues(parseCsvList(process.env.npm_config_group))
  }

  if (options.onlyIds.length === 0 && options.groups.length === 0 && options.positionals.length > 0) {
    const positionals = uniqueValues(options.positionals.flatMap((value) => parseCsvList(value)))
    const allTargets = positionals.every((value) => Boolean(getExportTargetById(value)))
    const allGroups = positionals.every((value) => EXPORT_GROUP_ORDER.includes(value))

    if (allTargets) {
      options.onlyIds = positionals
    } else if (allGroups) {
      options.groups = positionals
    }
  }

  return options
}

function buildTargetUrl(baseUrl, target) {
  const url = new URL(baseUrl)
  url.searchParams.set('lang', 'ko')

  Object.entries(target.params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value)
    }
  })

  return url.toString()
}

function resolveTargets(options) {
  if (options.onlyIds.length > 0) {
    const unknownIds = options.onlyIds.filter((id) => !getExportTargetById(id))
    if (unknownIds.length > 0) {
      throw new Error(`Unknown export target: ${unknownIds.join(', ')}`)
    }

    return options.onlyIds.map((id) => getExportTargetById(id))
  }

  const groups = options.groups.length > 0 ? options.groups : EXPORT_GROUP_ORDER
  const unknownGroups = groups.filter((group) => !EXPORT_GROUP_ORDER.includes(group))

  if (unknownGroups.length > 0) {
    throw new Error(`Unknown export group: ${unknownGroups.join(', ')}`)
  }

  return groups.flatMap((group) => getExportTargetsByGroup(group))
}

function buildTargetBatches(targets) {
  const batches = []
  const batchMap = new Map()

  targets.forEach((target) => {
    if (!batchMap.has(target.group)) {
      const batch = { group: target.group, targets: [] }
      batchMap.set(target.group, batch)
      batches.push(batch)
    }

    batchMap.get(target.group).targets.push(target)
  })

  return batches
}

function getGroupTimeout(group) {
  return GROUP_TIMEOUTS[group] || GROUP_TIMEOUTS.overview
}

function sanitizeName(value) {
  return value.replace(/[^a-z0-9._-]+/gi, '_')
}

async function startDevServer() {
  const server = await createServer({
    root: webRoot,
    server: {
      host: '127.0.0.1',
      port: 4173,
      strictPort: true
    }
  })

  await server.listen()
  const baseUrl = server.resolvedUrls?.local?.[0]

  if (!baseUrl) {
    throw new Error('Failed to resolve local Vite server URL')
  }

  return { server, baseUrl }
}

async function collectPageDiagnostics(page) {
  try {
    return await page.evaluate(({ noDataPatterns }) => {
      const bodyText = document.body?.innerText || ''
      const hasNoDataText = noDataPatterns.some((pattern) => bodyText.includes(pattern))
      return {
        title: document.title,
        dashboardReady: Boolean(document.querySelector('[data-dashboard-ready="true"]')),
        exportKeys: Array.from(document.querySelectorAll('[data-export-key]'))
          .map((element) => element.getAttribute('data-export-key'))
          .filter(Boolean),
        hasNoDataText,
        bodySnippet: bodyText.replace(/\s+/g, ' ').trim().slice(0, 1000)
      }
    }, { noDataPatterns: NO_DATA_PATTERNS })
  } catch (error) {
    return {
      title: '',
      dashboardReady: false,
      exportKeys: [],
      hasNoDataText: false,
      bodySnippet: `Failed to collect page diagnostics: ${error.message}`
    }
  }
}

async function writeDiagnostics(page, target, url, status, reason) {
  await mkdir(DIAGNOSTICS_DIR, { recursive: true })

  const baseName = sanitizeName(`${target.group}-${target.id}`)
  const screenshotPath = path.join(DIAGNOSTICS_DIR, `${baseName}.png`)
  const metadataPath = path.join(DIAGNOSTICS_DIR, `${baseName}.json`)
  const pageDiagnostics = await collectPageDiagnostics(page)

  try {
    await page.screenshot({ path: screenshotPath, fullPage: true })
  } catch (error) {
    pageDiagnostics.screenshotError = error.message
  }

  await writeFile(metadataPath, JSON.stringify({
    status,
    reason,
    targetId: target.id,
    group: target.group,
    exportKey: target.exportKey,
    url,
    capturedAt: new Date().toISOString(),
    screenshotPath,
    ...pageDiagnostics
  }, null, 2))

  return { metadataPath, screenshotPath }
}

async function waitForDashboardState(page, target, timeoutMs) {
  const exportSelector = `[data-export-key="${target.exportKey}"]`
  const deadline = Date.now() + timeoutMs
  let dashboardReadySeen = false

  while (Date.now() < deadline) {
    const state = await page.evaluate(({ exportKey, noDataPatterns }) => {
      const dashboardReady = Boolean(document.querySelector('[data-dashboard-ready="true"]'))
      const exportButton = document.querySelector(`[data-export-key="${exportKey}"]`)
      const isVisible = Boolean(
        exportButton &&
        exportButton.getBoundingClientRect().width > 0 &&
        exportButton.getBoundingClientRect().height > 0 &&
        getComputedStyle(exportButton).visibility !== 'hidden' &&
        getComputedStyle(exportButton).display !== 'none'
      )
      const bodyText = document.body?.innerText || ''
      const noDataPattern = noDataPatterns.find((pattern) => bodyText.includes(pattern)) || ''

      return {
        dashboardReady,
        exportReady: isVisible,
        noDataPattern
      }
    }, { exportKey: target.exportKey, noDataPatterns: NO_DATA_PATTERNS })

    if (state.dashboardReady) {
      dashboardReadySeen = true
    }

    if (state.exportReady) {
      await page.waitForTimeout(300)
      return {
        status: 'ready',
        reason: `Export control became visible: ${exportSelector}`
      }
    }

    if (dashboardReadySeen && state.noDataPattern) {
      return {
        status: 'skipped',
        reason: `No data state detected: ${state.noDataPattern}`
      }
    }

    await page.waitForTimeout(READINESS_POLL_INTERVAL_MS)
  }

  return {
    status: 'failed-to-diagnose',
    reason: dashboardReadySeen
      ? `Timed out waiting for export control: ${exportSelector}`
      : 'Timed out waiting for dashboard readiness'
  }
}

async function exportTarget(page, baseUrl, target) {
  const url = buildTargetUrl(baseUrl, target)
  const timeoutMs = getGroupTimeout(target.group)

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    const readiness = await waitForDashboardState(page, target, timeoutMs)

    if (readiness.status === 'skipped' || readiness.status === 'failed-to-diagnose') {
      const diagnostics = await writeDiagnostics(page, target, url, readiness.status, readiness.reason)
      console.warn(
        `${readiness.status === 'skipped' ? 'Skipped' : 'Failed to diagnose'} ${target.id} (${readiness.reason})`
      )
      return {
        status: readiness.status,
        target,
        reason: readiness.reason,
        diagnostics
      }
    }

    const outputDir = path.dirname(target.outputPath)
    await mkdir(outputDir, { recursive: true })

    const downloadPromise = page.waitForEvent('download', { timeout: DOWNLOAD_TIMEOUT_MS })
    await page.locator(`[data-export-key="${target.exportKey}"]`).click()
    const download = await downloadPromise
    await download.saveAs(target.outputPath)
    await access(target.outputPath)

    console.log(`Exported ${target.id} -> ${target.outputPath}`)
    return {
      status: 'exported',
      target
    }
  } catch (error) {
    const diagnostics = await writeDiagnostics(page, target, url, 'failed-to-diagnose', error.message)
    console.warn(`Failed to diagnose ${target.id} (${error.message})`)
    return {
      status: 'failed-to-diagnose',
      target,
      reason: error.message,
      diagnostics
    }
  }
}

async function runBatch(browser, baseUrl, targets, options) {
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: options.viewport
  })
  const results = []

  try {
    for (const target of targets) {
      const page = await context.newPage()

      try {
        results.push(await exportTarget(page, baseUrl, target))
      } finally {
        await page.close()
      }
    }
  } finally {
    await context.close()
  }

  return results
}

function printSummary(results) {
  const summary = results.reduce((accumulator, result) => {
    accumulator[result.status] += 1
    return accumulator
  }, {
    exported: 0,
    skipped: 0,
    'failed-to-diagnose': 0
  })

  console.log('')
  console.log('Export summary')
  console.log(`- exported: ${summary.exported}`)
  console.log(`- skipped: ${summary.skipped}`)
  console.log(`- failed-to-diagnose: ${summary['failed-to-diagnose']}`)
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const targets = resolveTargets(options)

  if (targets.length === 0) {
    throw new Error('No export targets resolved')
  }

  let devServer = null
  let baseUrl = options.baseUrl

  if (!baseUrl) {
    await copyDataFiles()
    devServer = await startDevServer()
    baseUrl = devServer.baseUrl
  }

  const browser = await chromium.launch({ headless: !options.headed })
  const batches = buildTargetBatches(targets)
  const results = []

  try {
    for (const batch of batches) {
      console.log(`Running export batch: ${batch.group} (${batch.targets.length} targets)`)
      const batchResults = await runBatch(browser, baseUrl, batch.targets, options)
      results.push(...batchResults)
    }
  } finally {
    await browser.close()
    if (devServer) {
      await devServer.server.close()
    }
  }

  printSummary(results)

  if (results.every((result) => result.status !== 'exported')) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
