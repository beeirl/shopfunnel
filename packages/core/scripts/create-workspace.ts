import { Database } from '../src/database'
import { Identifier } from '../src/identifier'
import { WorkspaceTable } from '../src/workspace/index.sql'

// Parse arguments
const [nameOrId] = process.argv.slice(2)

// Check if user accidentally passed an ID instead of a name
if (nameOrId?.startsWith('wrk_')) {
  console.error('Error: Received workspace ID instead of name')
  console.error('Usage: bun scripts/create-workspace.ts [name]')
  console.error('  name: Workspace name (default: "Default")')
  process.exit(1)
}

const name = nameOrId || 'Default'

// Generate workspace ID
const workspaceId = Identifier.create('workspace')

// Create workspace
await Database.use(async (tx) => {
  await tx.insert(WorkspaceTable).values({
    id: workspaceId,
    name,
  })
})

console.log(`Workspace Id: ${workspaceId}`)
