import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { access, mkdir } from 'node:fs/promises'
import process from 'node:process'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { copyDataFiles } from './copy-data.mjs'
import { EXPORT_TARGETS, getExportTargetById } from './export-manifest.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const webRoot = path.resolve(__dirname, '..')
const DEFAULT_VIEWPORT = { width: 1920, height: 1400 }

function parseArgs(argv) {
  const options = {
    only: '',
    headed: false,
    baseUrl: '',
    viewport: { ...DEFAULT_VIEWPORT }
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]

    if (arg === '--only') {
      options.only = argv[i + 1] || ''
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

async function waitForDashboard(page, exportKey) {
  await page.waitForSelector('[data-dashboard-ready="true"]', { timeout: 30000 })
  await page.waitForSelector(`[data-export-key="${exportKey}"]`, { timeout: 30000 })
  await page.waitForTimeout(300)
}

async function exportTarget(page, baseUrl, target) {
  const url = buildTargetUrl(baseUrl, target)

  await page.goto(url, { waitUntil: 'networkidle' })
  await waitForDashboard(page, target.exportKey)

  const outputDir = path.dirname(target.outputPath)
  await mkdir(outputDir, { recursive: true })

  const downloadPromise = page.waitForEvent('download', { timeout: 15000 })
  await page.locator(`[data-export-key="${target.exportKey}"]`).click()
  const download = await downloadPromise
  await download.saveAs(target.outputPath)
  await access(target.outputPath)

  console.log(`Exported ${target.id} -> ${target.outputPath}`)
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const targets = options.only
    ? [getExportTargetById(options.only)].filter(Boolean)
    : EXPORT_TARGETS

  if (targets.length === 0) {
    throw new Error(`Unknown export target: ${options.only}`)
  }

  let devServer = null
  let baseUrl = options.baseUrl

  if (!baseUrl) {
    await copyDataFiles()
    devServer = await startDevServer()
    baseUrl = devServer.baseUrl
  }

  const browser = await chromium.launch({ headless: !options.headed })
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: options.viewport
  })
  const page = await context.newPage()

  try {
    for (const target of targets) {
      await exportTarget(page, baseUrl, target)
    }
  } finally {
    await context.close()
    await browser.close()
    if (devServer) {
      await devServer.server.close()
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
