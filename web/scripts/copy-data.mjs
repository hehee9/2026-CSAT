import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cp, mkdir } from 'node:fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const webRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(webRoot, '..')
const publicDir = path.join(webRoot, 'public')

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
}

if (process.argv[1] === __filename) {
  copyDataFiles().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
