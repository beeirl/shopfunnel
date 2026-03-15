import { withActor } from '@/context/auth.withActor'
import { Funnel } from '@shopfunnel/core/funnel/index'
import { Identifier } from '@shopfunnel/core/identifier'
import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const getExperiment = createServerFn()
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      experimentId: Identifier.schema('funnel_experiment'),
    }),
  )
  .handler(({ data }) => {
    return withActor(() => Funnel.getExperiment(data.experimentId), data.workspaceId)
  })

export const getExperimentQueryOptions = (input: { workspaceId: string; experimentId: string }) =>
  queryOptions({
    queryKey: ['experiment', input.workspaceId, input.experimentId],
    queryFn: () => getExperiment({ data: input }),
  })
