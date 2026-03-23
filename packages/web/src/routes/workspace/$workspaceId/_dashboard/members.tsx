import { DataGrid } from '@/components/data-grid'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { withActor } from '@/context/auth.withActor'
import { Identifier } from '@shopfunnel/core/identifier'
import { User } from '@shopfunnel/core/user/index'
import { IconPlus as PlusIcon } from '@tabler/icons-react'
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { z } from 'zod'

import { Heading } from './-components/heading'

const listMembers = createServerFn()
  .inputValidator(Identifier.schema('workspace'))
  .handler(({ data: workspaceId }) => {
    return withActor(() => User.list(), workspaceId)
  })

const listMembersQueryOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['members', workspaceId],
    queryFn: () => listMembers({ data: workspaceId }),
  })

const inviteMember = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      email: z.email(),
      role: z.enum(['admin', 'member']),
    }),
  )
  .handler(({ data }) => {
    return withActor(() => User.invite({ email: data.email, role: data.role }), data.workspaceId)
  })

export const Route = createFileRoute('/workspace/$workspaceId/_dashboard/members')({
  staticData: { title: 'Members' },
  component: MembersRoute,
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(listMembersQueryOptions(params.workspaceId))
  },
})

function InviteMemberDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const params = Route.useParams()

  const [email, setEmail] = React.useState('')
  const [emailError, setEmailError] = React.useState<string | null>(null)
  const [role, setRole] = React.useState<'admin' | 'member'>('member')

  const inviteMemberMutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: 'admin' | 'member' }) =>
      inviteMember({ data: { workspaceId: params.workspaceId, email, role } }),
    onSuccess: () => {
      setEmail('')
      setRole('member')
      onSuccess()
      onOpenChange(false)
    },
  })

  const handleInvite = () => {
    const trimmed = email.trim()
    if (!trimmed) return
    const result = z.string().email().safeParse(trimmed)
    if (!result.success) {
      setEmailError('Please enter a valid email address')
      return
    }
    setEmailError(null)
    inviteMemberMutation.mutate({ email: trimmed, role })
  }

  React.useEffect(() => {
    if (!open) {
      setEmail('')
      setEmailError(null)
      setRole('member')
    }
  }, [open])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Invite member</Dialog.Title>
          <Dialog.Description>Send an invitation email to add a new member to this workspace.</Dialog.Description>
        </Dialog.Header>

        <div className="flex flex-col gap-3">
          <Field.Root data-invalid={!!emailError || undefined}>
            <Field.Content>
              <Input
                placeholder="Email address"
                type="email"
                value={email}
                aria-invalid={!!emailError || undefined}
                onValueChange={(v) => {
                  setEmail(v)
                  if (emailError) setEmailError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInvite()
                }}
              />
              <Field.Error>{emailError}</Field.Error>
            </Field.Content>
          </Field.Root>
          <Select.Root
            items={[
              { label: 'Member', value: 'member' },
              { label: 'Admin', value: 'admin' },
            ]}
            value={role}
            onValueChange={(value) => {
              if (value === 'admin' || value === 'member') setRole(value)
            }}
          >
            <Select.Trigger className="w-full">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Group>
                <Select.Item value="member">Member</Select.Item>
                <Select.Item value="admin">Admin</Select.Item>
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </div>

        <Dialog.Footer>
          <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
          <Button onClick={handleInvite} disabled={inviteMemberMutation.isPending || !email.trim()}>
            {inviteMemberMutation.isPending && <Spinner />}
            Invite
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  )
}

function MembersRoute() {
  const params = Route.useParams()
  const queryClient = useQueryClient()

  const membersQuery = useSuspenseQuery(listMembersQueryOptions(params.workspaceId))
  const members = membersQuery.data

  const [inviteDialogOpen, setInviteDialogOpen] = React.useState(false)

  const handleInviteSuccess = () => {
    queryClient.invalidateQueries(listMembersQueryOptions(params.workspaceId))
  }

  return (
    <div className="flex h-full w-full max-w-6xl flex-col gap-4">
      <Heading.Root>
        <Heading.Content>
          <Heading.Title>Members</Heading.Title>
        </Heading.Content>
        <Heading.Actions>
          <Button onClick={() => setInviteDialogOpen(true)}>
            <PlusIcon />
            Invite member
          </Button>
        </Heading.Actions>
      </Heading.Root>

      <DataGrid.Root className="grid-cols-[auto_auto_1fr]">
        <DataGrid.Header>
          <DataGrid.Head>Email</DataGrid.Head>
          <DataGrid.Head>Role</DataGrid.Head>
          <DataGrid.Head />
        </DataGrid.Header>

        <DataGrid.Body>
          {members.map((member) => (
            <DataGrid.Row key={member.id}>
              <DataGrid.Cell className="overflow-hidden pr-2 md:pr-8">
                <span className="truncate text-sm font-medium text-foreground">
                  {member.authEmail ?? member.email ?? 'No email'}
                </span>
              </DataGrid.Cell>

              <DataGrid.Cell>
                <span className="text-sm text-muted-foreground">{member.role === 'admin' ? 'Admin' : 'Member'}</span>
              </DataGrid.Cell>

              <DataGrid.Cell>
                {!member.accountId && <span className="text-sm text-muted-foreground">Invited</span>}
              </DataGrid.Cell>
            </DataGrid.Row>
          ))}
        </DataGrid.Body>
      </DataGrid.Root>

      <InviteMemberDialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} onSuccess={handleInviteSuccess} />
    </div>
  )
}
