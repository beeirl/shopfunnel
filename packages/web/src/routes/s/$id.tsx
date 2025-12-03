import { Form } from '@/components/form'
import type { FormInfo } from '@/components/form/types'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/s/$id')({
  component: RouteComponent,
})

const form: FormInfo = {
  id: 'example-form',
  shortID: 'ex',
  title: 'Simple Example Form',
  schema: {
    pages: [
      {
        id: 'main-page',
        blocks: [
          {
            id: 'choice',
            type: 'multiple_choice',
            properties: {
              label: 'Do you want to provide additional information?',
              description: 'Select an option',
              multiple: false,
              choices: [
                { id: 'yes', label: 'Yes' },
                { id: 'no', label: 'No' },
              ],
            },
            validations: {
              required: true,
            },
          },
          {
            id: 'additional-info',
            type: 'text_input',
            properties: {
              label: 'Additional Information',
              description: 'Please provide any additional details',
            },
            validations: {},
          },
        ],
      },
    ],
    rules: [
      {
        pageId: 'main-page',
        actions: [
          {
            type: 'hide',
            condition: {
              op: 'eq',
              vars: [
                { type: 'block', value: 'choice' },
                { type: 'constant', value: 'no' },
              ],
            },
            details: {
              target: {
                type: 'block',
                value: 'additional-info',
              },
            },
          },
        ],
      },
    ],
    variables: {},
  },
}

function RouteComponent() {
  return (
    <div className="min-h-screen w-full p-6">
      <div className="mx-auto max-w-md">
        <Form form={form} />
      </div>
    </div>
  )
}
