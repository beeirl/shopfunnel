import { and, eq } from 'drizzle-orm'
import { AuthTable } from '../src/auth/index.sql'
import { Database } from '../src/database'
import { Identifier } from '../src/identifier'
import { UserTable } from '../src/user/index.sql'

// Parse arguments
const [workspaceId, email, role = 'admin'] = process.argv.slice(2)

// Validate arguments
if (!workspaceId || !email) {
  console.error('Usage: bun scripts/invite-user.ts <workspace-id> <email> [role]')
  console.error('  role: admin (default) | member')
  process.exit(1)
}

// Validate email
if (!email.includes('@')) {
  console.error(`Invalid email: ${email}`)
  process.exit(1)
}

// Validate role
if (role !== 'admin' && role !== 'member') {
  console.error(`Invalid role: ${role}. Must be 'admin' or 'member'`)
  process.exit(1)
}

// Look up existing account for email
const accountId = await Database.use(async (tx) => {
  const result = await tx
    .select({ accountId: AuthTable.accountId })
    .from(AuthTable)
    .where(and(eq(AuthTable.provider, 'email'), eq(AuthTable.subject, email)))
    .limit(1)
  return result[0]?.accountId
})

// Create user record
const userId = Identifier.create('user')

await Database.use(async (tx) => {
  if (accountId) {
    // User has an account - link directly
    await tx.insert(UserTable).values({
      id: userId,
      workspaceId,
      accountId,
      name: '',
      role,
    })
    console.log(`Linked existing account to workspace`)
  } else {
    // User doesn't have an account - pending invitation
    await tx.insert(UserTable).values({
      id: userId,
      workspaceId,
      email,
      name: '',
      role,
    })
    console.log(`Created pending invitation`)
  }
})

console.log(`User Id: ${userId}`)
