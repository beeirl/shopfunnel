import type { Form } from '@shopfunnel/core/form/index'
import type { FormSchema } from '@shopfunnel/core/form/schema'

export type FormInfo = Form.Info

export type FormBlock = FormSchema.Block

export type FormVariables = Record<string, string | number>

export type FormValues = Record<string, unknown>

export type FormErrors = Record<string, string>

export { FormSchema }
