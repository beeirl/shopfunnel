import { z } from 'zod'
import { Context } from './utils/context'
import { VisibleError, VisibleErrorCodes } from './utils/error'

export const UserRole = ['admin', 'member'] as const

export namespace Actor {
  export const Account = z.object({
    type: z.literal('account'),
    properties: z.object({
      accountID: z.string(),
      email: z.string(),
    }),
  })
  export type Account = z.infer<typeof Account>

  export const Public = z.object({
    type: z.literal('public'),
    properties: z.object({}),
  })
  export type Public = z.infer<typeof Public>

  export const User = z.object({
    type: z.literal('user'),
    properties: z.object({
      userID: z.string(),
      workspaceID: z.string(),
      accountID: z.string(),
      role: z.enum(UserRole),
    }),
  })
  export type User = z.infer<typeof User>

  export const System = z.object({
    type: z.literal('system'),
    properties: z.object({
      workspaceID: z.string(),
    }),
  })
  export type System = z.infer<typeof System>

  export const Info = z.discriminatedUnion('type', [Account, Public, User, System])
  export type Info = z.infer<typeof Info>

  const ActorContext = Context.create<Info>()

  export const use = ActorContext.use

  export function provide<R, T extends Info['type']>(
    type: T,
    properties: Extract<Info, { type: T }>['properties'],
    cb: () => R,
  ) {
    return ActorContext.provide(
      {
        type,
        properties,
      } as Info,
      cb,
    )
  }

  export function assert<T extends Info['type']>(type: T) {
    const actor = use()
    if (actor.type !== type) {
      throw new VisibleError(
        'authentication',
        VisibleErrorCodes.Authentication.UNAUTHORIZED,
        `Expected actor type ${type}, got ${actor.type}`,
      )
    }
    return actor as Extract<Info, { type: T }>
  }

  export function assertAdmin() {
    if (userRole() === 'admin') return
    throw new VisibleError(
      'forbidden',
      VisibleErrorCodes.Permission.INSUFFICIENT_PERMISSIONS,
      'Action not allowed. Ask your workspace admin to perform this action.',
    )
  }

  export function workspaceID() {
    const actor = use()
    if ('workspaceID' in actor.properties) {
      return actor.properties.workspaceID
    }
    throw new VisibleError(
      'authentication',
      VisibleErrorCodes.Authentication.UNAUTHORIZED,
      `actor of type "${actor.type}" is not associated with a workspace`,
    )
  }

  export function workspace() {
    return workspaceID()
  }

  export function accountID() {
    const actor = use()
    if ('accountID' in actor.properties) {
      return actor.properties.accountID
    }
    throw new VisibleError(
      'authentication',
      VisibleErrorCodes.Authentication.UNAUTHORIZED,
      `actor of type "${actor.type}" is not associated with an account`,
    )
  }

  export function userID() {
    return assert('user').properties.userID
  }

  export function userRole() {
    return assert('user').properties.role
  }
}
