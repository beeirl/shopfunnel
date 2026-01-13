import { Database } from '../src/database'
import { Identifier } from '../src/identifier'
import { WorkspaceTable } from '../src/workspace/index.sql'

// Parse arguments
const [name = 'Default'] = process.argv.slice(2)

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
