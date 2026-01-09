#!/usr/bin/env bun

import { $ } from 'bun'
import path from 'path'

// Help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: bun scripts/deploy.ts <stage> [options]

Arguments:
  stage          SST/Tinybird stage (required)
                 - "production" deploys to Tinybird Cloud
                 - Any other stage deploys to a Tinybird branch

Options:
  --force        Set secret even if already exists
  -h, --help     Show this help

Examples:
  bun scripts/deploy.ts dev            # Deploy to branch "dev"
  bun scripts/deploy.ts production     # Deploy to cloud
  bun scripts/deploy.ts staging        # Deploy to branch "staging"
  bun scripts/deploy.ts dev --force    # Override existing secret
`)
  process.exit(0)
}

const dir = new URL('..', import.meta.url).pathname
const root = path.resolve(dir, '..', '..')

const TOKEN_NAME = 'api'

// Required stage argument
const stage = process.argv[2]
if (!stage || stage.startsWith('-')) throw new Error('Stage is required')

const force = process.argv.includes('--force')
const isProduction = stage === 'production'

console.log(`Stage: ${stage}`)
console.log(`Target: ${isProduction ? 'Tinybird Cloud' : `Tinybird Branch "${stage}"`}`)

// Deploy
if (isProduction) {
  console.log('Deploying to Tinybird Cloud...')
  await $`TB_VERSION_WARNING=0 tb --cloud deploy --wait`.cwd(dir)
} else {
  // Check if branch exists, create if not
  const branches = await $`TB_VERSION_WARNING=0 tb --cloud branch ls`
    .cwd(dir)
    .text()
    .catch(() => '')

  // Check for exact branch name match (handles both YAML and table output formats)
  const branchExists = new RegExp(`\\b${stage}\\b`).test(branches)

  if (!branchExists) {
    console.log(`Creating branch "${stage}"...`)
    await $`TB_VERSION_WARNING=0 tb --cloud branch create ${stage}`.cwd(dir)
  }

  console.log(`Deploying to branch "${stage}"...`)
  await $`TB_VERSION_WARNING=0 tb --branch ${stage} deploy --wait`.cwd(dir)
}

// Check if SST secret already exists
const secrets = await $`bunx sst secret list --stage ${stage}`
  .cwd(root)
  .text()
  .catch(() => '')
const hasSecret = secrets.includes('TINYBIRD_TOKEN')

if (hasSecret && !force) {
  console.log('TINYBIRD_TOKEN already set. Use --force to override.')
  process.exit(0)
}

// Get token from appropriate target
async function getToken(name: string): Promise<string> {
  const tbArgs = isProduction ? ['--cloud'] : ['--branch', stage]
  const output = await $`TB_VERSION_WARNING=0 tb ${tbArgs} --show-tokens token ls`.cwd(dir).text()

  const lines = output.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // YAML format: "name: api" followed by "token: p.xxx"
    if (line?.trim() === `name: ${name}`) {
      const tokenLine = lines[i + 1]
      if (tokenLine?.startsWith('token: ')) {
        return tokenLine.replace('token: ', '').trim()
      }
    }
    // Table format: "| api | p.xxx... |" - find row with exact name match in first column
    if (line?.includes('|')) {
      const columns = line.split('|').map((col) => col.trim())
      if (columns[1] === name && columns[2]?.startsWith('p.')) {
        return columns[2]
      }
    }
  }
  throw new Error(`Token '${name}' not found`)
}

console.log(`Retrieving ${TOKEN_NAME} token...`)
const token = await getToken(TOKEN_NAME)

if (!token.startsWith('p.')) {
  throw new Error('Invalid token format')
}

// Set SST secret
console.log('Setting TINYBIRD_TOKEN...')
await $`bunx sst secret set TINYBIRD_TOKEN ${token} --stage ${stage}`.cwd(root)

console.log('Done!')
