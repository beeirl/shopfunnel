import type { FormBlock } from '../types'

export interface StatCardsBlockProps {
  block: Extract<FormBlock, { type: 'stat_cards' }>
}

export function StatCardsBlock({ block }: StatCardsBlockProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {block.properties.items.map((item) => (
        <div key={item.id} className="flex items-center gap-2 rounded-lg bg-gray-100 px-2 py-2">
          <div className="flex h-10 w-10 items-center justify-center">
            <span className="text-2xl">{item.emoji}</span>
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-xs text-gray-500">{item.title}</span>
            <span className="font-bold text-gray-900">{item.value}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
