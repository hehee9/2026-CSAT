import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { rm } from 'node:fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const webRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(webRoot, '..')
const docsAssetsDir = path.join(repoRoot, 'docs', 'assets')

async function cleanPagesBuild() {
  await rm(docsAssetsDir, { recursive: true, force: true })
  console.log(`Removed ${path.relative(repoRoot, docsAssetsDir)}`)
}

if (process.argv[1] === __filename) {
  cleanPagesBuild().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}

export { cleanPagesBuild }
