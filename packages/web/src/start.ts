import { NamedError } from '@shopfunnel/core/utils/error'
import { createSerializationAdapter } from '@tanstack/react-router'
import { createStart } from '@tanstack/react-start'

export const startInstance = createStart(() => ({
  defaultSsr: false,
  serializationAdapters: [
    createSerializationAdapter({
      key: 'named-error',
      test: (v) => v instanceof NamedError,
      toSerializable: (error) => error.toObject(),
      fromSerializable: (obj) => obj as any,
    }),
  ],
}))
