import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const webRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(webRoot, '..')
const publicDir = path.join(webRoot, 'public')

function _metadataFromConfig(config) {
  const metadata = {}

  for (const model of config.models || []) {
    if (!model?.name) continue
    metadata[model.name] = {
      supportsVision: model.supports_vision !== false
    }
  }

  return metadata
}

async function _writeModelMetadata() {
  const configPath = path.join(repoRoot, 'problems', 'config.json')
  const fallbackPath = path.join(webRoot, 'model_metadata.json')
  const outputPath = path.join(publicDir, 'model_metadata.json')
  let metadata
  let sourcePath = configPath

  try {
    const config = JSON.parse(await readFile(configPath, 'utf8'))
    metadata = _metadataFromConfig(config)
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error
    }
    metadata = JSON.parse(await readFile(fallbackPath, 'utf8'))
    sourcePath = fallbackPath
    console.warn(`Using fallback model metadata: ${path.relative(repoRoot, fallbackPath)}`)
  }

  await writeFile(outputPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8')
  console.log(`Generated ${path.relative(repoRoot, outputPath)} from ${path.relative(repoRoot, sourcePath)}`)
}

async function _copyIfExists(sourcePath, targetPath, options = {}) {
  try {
    await cp(sourcePath, targetPath, { force: true })
    if (!options.silent) {
      console.log(`Copied ${path.relative(repoRoot, sourcePath)} -> ${path.relative(repoRoot, targetPath)}`)
    }
  } catch (error) {
    if (error.code === 'ENOENT' && options.optional) {
      console.warn(`Skipping missing file: ${path.relative(repoRoot, sourcePath)}`)
      return
    }
    throw error
  }
}

export async function copyDataFiles() {
  await mkdir(publicDir, { recursive: true })

  await _copyIfExists(
    path.join(repoRoot, 'all_results.json'),
    path.join(publicDir, 'all_results.json')
  )

  await _copyIfExists(
    path.join(repoRoot, 'problems', 'token_usage.json'),
    path.join(publicDir, 'token_usage.json'),
    { optional: true }
  )

  await _writeModelMetadata()
}

if (process.argv[1] === __filename) {
  copyDataFiles().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
