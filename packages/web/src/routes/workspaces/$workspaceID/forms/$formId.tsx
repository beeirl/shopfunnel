import { FormPage } from '@/components/form/page'
import type { FormInfo } from '@/components/form/types'
import { IconButton } from '@beeirl/ui/icon-button'
import { PlusIcon } from '@beeirl/ui/line-icons'
import { cn } from '@beeirl/ui/styles'
import { createFileRoute } from '@tanstack/react-router'
import { Reorder } from 'motion/react'
import * as React from 'react'
import { useState } from 'react'
import { FormBuilder } from './-components/form-builder'

export const Route = createFileRoute('/workspaces/$workspaceID/forms/$formId')({
  component: RouteComponent,
})

// Example form schema for testing
const exampleForm: FormInfo = {
  id: 'builder-example-form',
  shortID: 'bef',
  title: 'Customer Feedback Survey',
  schema: {
    pages: [
      {
        id: 'welcome',
        blocks: [
          {
            id: 'welcome-heading',
            type: 'heading',
            properties: {
              text: 'Welcome to Our Survey',
            },
          },
          {
            id: 'welcome-paragraph',
            type: 'paragraph',
            properties: {
              text: 'Thank you for taking the time to share your feedback. This survey will take approximately 5 minutes.',
            },
          },
        ],
      },
      {
        id: 'basic-info',
        blocks: [
          {
            id: 'name-input',
            type: 'text_input',
            properties: {
              label: 'What is your name?',
              description: 'Enter your full name',
            },
            validations: {
              required: true,
            },
          },
          {
            id: 'email-input',
            type: 'text_input',
            properties: {
              label: 'Email Address',
              description: "We'll use this to follow up if needed",
            },
            validations: {
              required: true,
              email: true,
            },
          },
        ],
      },
      {
        id: 'experience',
        blocks: [
          {
            id: 'satisfaction-choice',
            type: 'multiple_choice',
            properties: {
              label: 'How satisfied are you with our service?',
              description: 'Select one option',
              multiple: false,
              choices: [
                { id: 'very-satisfied', label: 'Very Satisfied' },
                { id: 'satisfied', label: 'Satisfied' },
                { id: 'neutral', label: 'Neutral' },
                { id: 'dissatisfied', label: 'Dissatisfied' },
                { id: 'very-dissatisfied', label: 'Very Dissatisfied' },
              ],
            },
            validations: {
              required: true,
            },
          },
          {
            id: 'features-dropdown',
            type: 'dropdown',
            properties: {
              label: 'Which feature do you use most?',
              description: 'Select your most used feature',
              options: [
                { id: 'dashboard', label: 'Dashboard' },
                { id: 'analytics', label: 'Analytics' },
                { id: 'forms', label: 'Form Builder' },
                { id: 'integrations', label: 'Integrations' },
                { id: 'api', label: 'API Access' },
              ],
            },
            validations: {
              required: true,
            },
          },
          {
            id: 'rating-slider',
            type: 'slider',
            properties: {
              label: 'Rating',
              minValue: 0,
              maxValue: 10,
              step: 1,
              defaultValue: 5,
            },
          },
        ],
      },
      {
        id: 'feedback',
        blocks: [
          {
            id: 'improvement-heading',
            type: 'heading',
            properties: {
              text: 'Additional Feedback',
            },
          },
          {
            id: 'feedback-text',
            type: 'text_input',
            properties: {
              label: 'What can we improve?',
              description: 'Share any suggestions or feedback',
            },
            validations: {},
          },
          {
            id: 'recommend-choice',
            type: 'multiple_choice',
            properties: {
              label: 'Would you recommend us to a friend?',
              multiple: false,
              choices: [
                { id: 'yes', label: 'Yes, definitely!' },
                { id: 'maybe', label: 'Maybe' },
                { id: 'no', label: 'No' },
              ],
            },
            validations: {
              required: true,
            },
          },
        ],
      },
    ],
    rules: [],
    variables: {},
  },
}

function RouteComponent() {
  const [selectedPageId, setSelectedPageId] = useState<string | undefined>(exampleForm.schema.pages[0]?.id)

  const [pages, setPages] = React.useState(exampleForm.schema.pages)

  return (
    <div className="flex h-screen w-full">
      <div className="flex w-[220px] flex-col border-r border-gray-200 bg-white">
        <div className="flex h-10 items-center justify-between border-b border-gray-200 px-3">
          <span className="text-xs font-medium">Pages</span>
          <IconButton className="-mr-1" color="gray" size="sm" variant="ghost">
            <PlusIcon />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <Reorder.Group
            className="flex flex-col gap-3"
            axis="y"
            values={pages}
            onReorder={setPages}
            style={{ touchAction: 'none' }}
          >
            {pages.map((page, index) => {
              const selected = selectedPageId === page.id
              return (
                <Reorder.Item key={page.id} value={page} onClick={() => setSelectedPageId(page.id)}>
                  <div
                    className={cn(
                      'relative flex aspect-video cursor-grab items-center justify-center overflow-hidden rounded-xl bg-white shadow-xs ring ring-gray-200 transition-all hover:ring-gray-200',
                      'active:scale-105 active:cursor-grabbing active:ring-accent-500',
                      selected && 'ring-3 ring-accent-200 hover:ring-accent-200',
                    )}
                  >
                    <div
                      className={cn(
                        'absolute top-1.5 left-1.5 flex size-5 items-center justify-center rounded-full bg-gray-100 text-gray-500',
                        selected && 'bg-accent-100 text-accent-500',
                      )}
                    >
                      <span className="text-xs font-semibold">{index + 1}</span>
                    </div>
                    <div className="pointer-events-none absolute top-2 w-lg origin-top scale-20">
                      <FormPage blocks={page.blocks} showNextButton={false} />
                    </div>
                  </div>
                </Reorder.Item>
              )
            })}
          </Reorder.Group>
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="h-10 w-full" />
        <div className="w-full flex-1 p-3">
          <div className="mx-auto w-full max-w-3xl">
            <FormBuilder />
          </div>
        </div>
      </div>
    </div>
  )
}
