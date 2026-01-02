import { Resizable } from '@/components/ui/resizable'
import { withActor } from '@/context/auth.withActor'
import { Identifier } from '@shopfunnel/core/identifier'
import { Quiz } from '@shopfunnel/core/quiz/index'
import type { Block, Info, Step, Theme } from '@shopfunnel/core/quiz/types'
import { useDebouncer } from '@tanstack/react-pacer'
import { mutationOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { z } from 'zod'
import { getQuizQueryOptions } from '../../-common'
import { BlockPane } from './-components/block-pane'
import { BlocksPane } from './-components/blocks-pane'
import { Panel } from './-components/panel'
import { Preview } from './-components/preview'
import { StepPane } from './-components/step-pane'
import { StepsPane } from './-components/steps-pane'

const updateQuiz = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      workspaceId: Identifier.schema('workspace'),
      quizId: Identifier.schema('quiz'),
      steps: z.custom<Step[]>().optional(),
      theme: z.custom<Theme>().optional(),
    }),
  )
  .handler(({ data }) => {
    return withActor(
      () =>
        Quiz.update({
          id: data.quizId,
          steps: data.steps,
          theme: data.theme,
        }),
      data.workspaceId,
    )
  })

const updateQuizMutationOptions = (workspaceId: string, quizId: string) =>
  mutationOptions({
    mutationFn: (data: { steps?: Step[]; theme?: Theme }) => updateQuiz({ data: { workspaceId, quizId, ...data } }),
  })

const uploadQuizFile = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => {
    if (!(input instanceof FormData)) {
      throw new Error('Expected FormData')
    }
    const file = input.get('file') as File
    const workspaceId = input.get('workspaceId') as string
    const quizId = input.get('quizId') as string

    if (!file || !workspaceId || !quizId) {
      throw new Error('Missing required fields')
    }

    return { file, workspaceId, quizId }
  })
  .handler(async ({ data }) => {
    const arrayBuffer = await data.file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    return withActor(async () => {
      const result = await Quiz.createFile({
        quizId: data.quizId,
        contentType: data.file.type,
        data: buffer,
        name: data.file.name,
        size: data.file.size,
      })
      return result.url
    }, data.workspaceId)
  })

export const Route = createFileRoute('/workspace/$workspaceId/quizzes/$id/_layout/edit/')({
  component: RouteComponent,
  ssr: false,
})

function RouteComponent() {
  const params = Route.useParams()
  const queryClient = useQueryClient()

  const quizQuery = useSuspenseQuery(getQuizQueryOptions(params.workspaceId, params.id))
  const updateQuizMutation = useMutation(updateQuizMutationOptions(params.workspaceId, params.id))

  const saveDebouncer = useDebouncer(
    async (data: { steps: Step[]; theme?: Theme }) => {
      await updateQuizMutation.mutateAsync(data)
      queryClient.setQueryData(getQuizQueryOptions(params.workspaceId, params.id).queryKey, (quiz: Info | undefined) =>
        quiz ? { ...quiz, published: false } : quiz,
      )
    },
    { wait: 1000 },
  )

  const [quiz, setQuiz] = React.useState<Info>(quizQuery.data)

  // Sync local state when query data changes (e.g., after publish)
  React.useEffect(() => {
    setQuiz(quizQuery.data)
  }, [quizQuery.data])

  const [selectedStepId, setSelectedStepId] = React.useState<string | null>(quiz.steps[0]?.id ?? null)
  const selectedStep = quiz.steps.find((step) => step.id === selectedStepId) ?? null

  const [selectedBlockId, setSelectedBlockId] = React.useState<string | null>(null)
  const selectedBlock = selectedStep?.blocks.find((b) => b.id === selectedBlockId) ?? null

  const handleStepSelect = (stepId: string) => {
    setSelectedStepId(stepId)
    const step = quiz.steps.find((s) => s.id === stepId)
    setSelectedBlockId(step?.blocks[0]?.id ?? null)
  }

  const handleStepsReorder = (reorderedSteps: Step[]) => {
    const updated = { ...quiz, steps: reorderedSteps, published: false }
    setQuiz(updated)
    saveDebouncer.maybeExecute({ steps: updated.steps })
  }

  const handleStepAdd = (step: Step) => {
    const updated = { ...quiz, steps: [...quiz.steps, step], published: false }
    setQuiz(updated)
    setSelectedStepId(step.id)
    setSelectedBlockId(step.blocks[0]?.id ?? null)
    saveDebouncer.maybeExecute({ steps: updated.steps })
  }

  const handleStepDelete = (stepId: string) => {
    setQuiz((prev) => {
      const stepIndex = prev.steps.findIndex((step) => step.id === stepId)
      const updatedSteps = prev.steps.filter((step) => step.id !== stepId)
      const newIndex = Math.max(0, stepIndex - 1)
      const newSelectedStep = updatedSteps[newIndex] ?? null
      setSelectedStepId(newSelectedStep?.id ?? null)
      setSelectedBlockId(newSelectedStep?.blocks[0]?.id ?? null)
      const updated = { ...prev, steps: updatedSteps, published: false }
      saveDebouncer.maybeExecute({ steps: updated.steps })
      return updated
    })
  }

  const handleBlockSelect = (blockId: string | null) => {
    setSelectedBlockId(blockId)
  }

  const handleStepUpdate = (id: string, updatedStep: Partial<Step>) => {
    const updatedSteps = quiz.steps.map((step) => (step.id === id ? ({ ...step, ...updatedStep } as Step) : step))
    const updatedQuiz = { ...quiz, steps: updatedSteps, published: false }
    setQuiz(updatedQuiz)
    saveDebouncer.maybeExecute({ steps: updatedQuiz.steps })
  }

  const handleBlocksReorder = (reorderedBlocks: Block[]) => {
    if (!selectedStepId) return
    const updatedSteps = quiz.steps.map((step) =>
      step.id === selectedStepId ? { ...step, blocks: reorderedBlocks } : step,
    )
    const updatedQuiz = { ...quiz, steps: updatedSteps, published: false }
    setQuiz(updatedQuiz)
    saveDebouncer.maybeExecute({ steps: updatedQuiz.steps })
  }

  const handleBlockAdd = (addedBlock: Block) => {
    if (!selectedStepId) return
    const updatedSteps = quiz.steps.map((step) =>
      step.id === selectedStepId ? { ...step, blocks: [...step.blocks, addedBlock] } : step,
    )
    const updatedQuiz = { ...quiz, steps: updatedSteps, published: false }
    setQuiz(updatedQuiz)
    setSelectedBlockId(addedBlock.id)
    saveDebouncer.maybeExecute({ steps: updatedQuiz.steps })
  }

  const handleBlockUpdate = (id: string, updatedBlock: Partial<Block>) => {
    const updatedSteps = quiz.steps.map((step) => ({
      ...step,
      blocks: step.blocks.map((block) => (block.id === id ? ({ ...block, ...updatedBlock } as Block) : block)),
    }))
    const updatedQuiz = { ...quiz, steps: updatedSteps, published: false }
    setQuiz(updatedQuiz)
    saveDebouncer.maybeExecute({ steps: updatedQuiz.steps })
  }

  const handleBlockDelete = (blockId: string) => {
    if (!selectedStepId) return
    setQuiz((prev) => {
      const updatedSteps = prev.steps.map((step) => {
        if (step.id !== selectedStepId) return step
        const blockIndex = step.blocks.findIndex((block) => block.id === blockId)
        const updatedBlocks = step.blocks.filter((block) => block.id !== blockId)
        const newIndex = Math.max(0, blockIndex - 1)
        const newSelectedBlock = updatedBlocks[newIndex] ?? null
        setSelectedBlockId(newSelectedBlock?.id ?? null)
        return { ...step, blocks: updatedBlocks }
      })
      const updated = { ...prev, steps: updatedSteps, published: false }
      saveDebouncer.maybeExecute({ steps: updated.steps })
      return updated
    })
  }

  const handleThemeUpdate = (updatedTheme: Partial<Theme>) => {
    const updatedQuiz = {
      ...quiz,
      theme: { ...quiz.theme, ...updatedTheme },
      published: false,
    }
    setQuiz(updatedQuiz)
    saveDebouncer.maybeExecute({
      steps: updatedQuiz.steps,
      theme: updatedQuiz.theme,
    })
  }

  const handleImageUpload = async (file: globalThis.File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('workspaceId', params.workspaceId)
    formData.append('quizId', params.id)

    return uploadQuizFile({ data: formData })
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <Panel className="w-[250px]">
        <Resizable.PanelGroup direction="vertical">
          <Resizable.Panel defaultSize={selectedStepId ? 40 : 100} minSize={20}>
            <StepsPane
              steps={quiz.steps}
              selectedStepId={selectedStepId}
              onStepSelect={handleStepSelect}
              onStepsReorder={handleStepsReorder}
              onStepAdd={handleStepAdd}
              onStepDelete={handleStepDelete}
            />
          </Resizable.Panel>
          {selectedStepId && (
            <React.Fragment>
              <Resizable.Handle />
              <Resizable.Panel defaultSize={60} minSize={20}>
                <BlocksPane
                  blocks={selectedStep?.blocks ?? []}
                  selectedBlockId={selectedBlockId}
                  onBlockSelect={handleBlockSelect}
                  onBlocksReorder={handleBlocksReorder}
                  onBlockAdd={handleBlockAdd}
                  onBlockDelete={handleBlockDelete}
                />
              </Resizable.Panel>
            </React.Fragment>
          )}
        </Resizable.PanelGroup>
      </Panel>
      <Preview
        step={selectedStep}
        theme={quiz.theme}
        selectedBlockId={selectedBlockId}
        onBlockSelect={handleBlockSelect}
        onThemeUpdate={handleThemeUpdate}
        onImageUpload={handleImageUpload}
      />
      {selectedBlock ? (
        <Panel className="w-[350px]">
          <BlockPane
            data={selectedBlock}
            onDataUpdate={(data) => handleBlockUpdate(selectedBlock.id, data)}
            onImageUpload={handleImageUpload}
          />
        </Panel>
      ) : selectedStep ? (
        <Panel className="w-[350px]">
          <StepPane
            step={selectedStep}
            index={quiz.steps.findIndex((s) => s.id === selectedStepId)}
            onStepUpdate={(step) => handleStepUpdate(selectedStep.id, step)}
          />
        </Panel>
      ) : null}
    </div>
  )
}
