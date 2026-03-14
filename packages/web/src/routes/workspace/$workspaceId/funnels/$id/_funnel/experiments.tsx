import { DataGrid } from '@/components/data-grid'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { getSessionQueryOptions } from '@/routes/workspace/$workspaceId/-common'
import { Heading } from '@/routes/workspace/$workspaceId/_dashboard/-components/heading'
import { IconPlus as PlusIcon } from '@tabler/icons-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { formatDistanceToNow } from 'date-fns'
import * as React from 'react'
import { listVariantsQueryOptions } from '../-common'
import { ExperimentCreateDialog, listExperimentsQueryOptions } from './-experiment-create-dialog'

export const Route = createFileRoute('/workspace/$workspaceId/funnels/$id/_funnel/experiments')({
  component: RouteComponent,
  beforeLoad: async ({ context, params }) => {
    const session = await context.queryClient.ensureQueryData(getSessionQueryOptions(params.workspaceId))
    if (!session.isAdmin) {
      throw redirect({ to: '/workspace/$workspaceId/funnels/$id/responses', params })
    }
  },
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        listExperimentsQueryOptions({ workspaceId: params.workspaceId, funnelId: params.id }),
      ),
      context.queryClient.ensureQueryData(
        listVariantsQueryOptions({ workspaceId: params.workspaceId, funnelId: params.id }),
      ),
    ])
  },
})

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'running':
      return (
        <Badge className="border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          Running
        </Badge>
      )
    case 'completed':
      return <Badge variant="secondary">Completed</Badge>
    case 'draft':
    default:
      return <Badge variant="outline">Draft</Badge>
  }
}

function RouteComponent() {
  const params = Route.useParams()

  const experimentsQuery = useSuspenseQuery(
    listExperimentsQueryOptions({ workspaceId: params.workspaceId, funnelId: params.id }),
  )
  const experiments = experimentsQuery.data

  const [experimentCreateHandle] = React.useState(() => ExperimentCreateDialog.createHandle())

  return (
    <div className="p-6 sm:pt-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Heading.Root>
          <Heading.Content>
            <Heading.Title>Experiments</Heading.Title>
          </Heading.Content>
          <Heading.Actions>
            <Dialog.Trigger handle={experimentCreateHandle} render={<Button />}>
              <PlusIcon />
              Create experiment
            </Dialog.Trigger>
          </Heading.Actions>
        </Heading.Root>

        <DataGrid.Root className="grid-cols-[1fr_auto_auto_auto]">
          <DataGrid.Header>
            <DataGrid.Head>Name</DataGrid.Head>
            <DataGrid.Head>Status</DataGrid.Head>
            <DataGrid.Head hideOnMobile>Started</DataGrid.Head>
            <DataGrid.Head hideOnMobile>Ended</DataGrid.Head>
          </DataGrid.Header>
          <DataGrid.Body>
            {experiments.map((experiment) => (
              <DataGrid.Row
                key={experiment.id}
                render={<Link from={Route.fullPath} to="./$experimentId" params={{ experimentId: experiment.id }} />}
              >
                <DataGrid.Cell>
                  <span className="truncate text-sm font-medium">{experiment.name}</span>
                </DataGrid.Cell>
                <DataGrid.Cell>
                  <StatusBadge status={experiment.status} />
                </DataGrid.Cell>
                <DataGrid.Cell hideOnMobile>
                  <span className="text-sm text-muted-foreground">
                    {experiment.startedAt ? formatDistanceToNow(experiment.startedAt, { addSuffix: true }) : '\u2014'}
                  </span>
                </DataGrid.Cell>
                <DataGrid.Cell hideOnMobile>
                  <span className="text-sm text-muted-foreground">
                    {experiment.endedAt ? formatDistanceToNow(experiment.endedAt, { addSuffix: true }) : '\u2014'}
                  </span>
                </DataGrid.Cell>
              </DataGrid.Row>
            ))}
          </DataGrid.Body>
        </DataGrid.Root>

        <ExperimentCreateDialog handle={experimentCreateHandle} />
      </div>
    </div>
  )
}
