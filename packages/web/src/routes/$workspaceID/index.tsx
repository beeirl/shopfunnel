import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/$workspaceID/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/$workspaceID/"!</div>
}
