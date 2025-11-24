import { Actor } from '@quizfunnel/core/actor'
import { getActor } from './auth'

export async function withActor<T>(fn: () => T, workspace?: string) {
  const actor = await getActor(workspace)
  return Actor.provide(actor.type, actor.properties, fn)
}
