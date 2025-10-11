import type { Iota } from './iota'
import type { ContinuationFrame } from './vm'

export interface Change {
  escapeConsider?: true
  escapeRetro?: true
  escapePush?: Iota
  escapeIntro?: true

  stackSet?: readonly Iota[]
  stackPop?: number
  stackMove?: { from: number, to: number }
  stackPush?: readonly Iota[]

  frameSet?: readonly ContinuationFrame[]
  framePop?: number
  framePush?: readonly ContinuationFrame[]
}
