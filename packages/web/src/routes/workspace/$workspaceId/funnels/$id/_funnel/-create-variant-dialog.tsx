import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import * as React from 'react'
import { createVariantFn, listVariantsQueryOptions } from '../-common'
import { useFunnel } from './-context'

type DialogHandle = ReturnType<typeof Dialog.createHandle>

function CreateVariantDialog({ handle }: { handle: DialogHandle }) {
  const { data: funnel } = useFunnel()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [name, setName] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: (title: string) =>
      createVariantFn({
        data: {
          workspaceId: funnel.workspaceId,
          funnelId: funnel.id,
          title,
          fromId: funnel.variantId,
        },
      }),
    onSuccess: async (newVariantId) => {
      await queryClient.invalidateQueries(
        listVariantsQueryOptions({ workspaceId: funnel.workspaceId, funnelId: funnel.id }),
      )
      handle.close()
      router.navigate({ search: { variant: newVariantId } as never })
    },
  })

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setName('')
      setError(null)
    }
  }

  const handleCreate = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Name cannot be empty')
      return
    }
    createMutation.mutate(trimmed)
  }

  return (
    <Dialog.Root handle={handle} onOpenChange={handleOpenChange}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Create variant</Dialog.Title>
          <Dialog.Description>Create a new variant branching from the current one.</Dialog.Description>
        </Dialog.Header>
        <Field.Root data-invalid={!!error}>
          <Input
            autoFocus
            placeholder="Variant name"
            value={name}
            onValueChange={(value) => {
              setName(value)
              if (error) setError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
            }}
          />
          <Field.Error>{error}</Field.Error>
        </Field.Root>
        <Dialog.Footer>
          <Dialog.Close render={<Button variant="outline" />}>Cancel</Dialog.Close>
          <Button onClick={handleCreate} disabled={!name.trim() || createMutation.isPending}>
            {createMutation.isPending && <Spinner />}
            Create
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  )
}

CreateVariantDialog.createHandle = Dialog.createHandle

export { CreateVariantDialog }
