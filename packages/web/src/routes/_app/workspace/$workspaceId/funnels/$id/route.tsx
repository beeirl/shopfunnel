import { createFileRoute, Outlet } from '@tanstack/react-router'
import { checkBilling, checkOnboarding } from '../../-common'

export const Route = createFileRoute('/_app/workspace/$workspaceId/funnels/$id')({
  component: () => <Outlet />,
  beforeLoad: async ({ params }) => {
    await checkOnboarding({ data: params.workspaceId })
    await checkBilling({ data: params.workspaceId })
  },
})
