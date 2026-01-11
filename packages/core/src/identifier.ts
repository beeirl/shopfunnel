import { ulid } from 'ulid'
import { z } from 'zod'

export namespace Identifier {
  const prefixes = {
    account: 'acc',
    answer: 'asw',
    answer_value: 'asv',
    auth: 'aut',
    billing: 'bil',
    domain: 'dom',
    file: 'fil',
    question: 'qst',
    funnel: 'fun',
    submission: 'sbm',
    usage: 'usg',
    user: 'usr',
    workspace: 'wrk',
  } as const

  export function create(prefix: keyof typeof prefixes, given?: string): string {
    if (given) {
      if (given.startsWith(prefixes[prefix])) return given
      throw new Error(`ID ${given} does not start with ${prefixes[prefix]}`)
    }
    return [prefixes[prefix], ulid()].join('_')
  }

  export function schema(prefix: keyof typeof prefixes) {
    return z.string().startsWith(prefixes[prefix])
  }
}
