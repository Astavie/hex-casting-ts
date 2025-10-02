import type { Entity, Iota } from './iota'
import { List, Pattern } from './iota'

export type Action = (env: Environment, vm: VM) => CastResult | VMChange[] | VMChange

export class CastResult {
  constructor(
    public readonly diff: readonly VMChange[],
    public readonly sideEffects: readonly SideEffect[] = [],
    public readonly resolutionType: ResolvedPatternType = ResolvedPatternType.EVALUATED,
    public readonly sound: EvalSound = EvalSound.NORMAL_EXECUTE,
  ) { }

  with(change: VMChange): CastResult {
    return new CastResult(
      [change, ...this.diff],
      this.sideEffects,
      this.resolutionType,
      this.sound,
    )
  }
}

export interface ContinuationFrame {
  evaluate: (env: Environment, vm: VM) => CastResult
  iotas: () => readonly Iota[]

  capturesBreak: () => boolean
  restoreStack: (stack: readonly Iota[]) => VMChange[]
}

export const EscapeStart: VMChange = {
  apply: (vm: VM): VM => vm,
}

export const EscapeIntro: VMChange = {
  apply: (vm: VM): VM => vm.withParenthesized(vm.parenthesized, vm.parenCount + 1),
}

export const EscapeRetro: VMChange = {
  apply: (vm: VM): VM => vm.withParenthesized(vm.parenthesized, vm.parenCount - 1),
}

export const EscapeConsider: VMChange = {
  apply: (vm: VM): VM => vm.withEscapeNext(),
}

export const EscapeEnd: VMChange = {
  apply: (vm: VM): VM =>
    vm
      .withStack([new List(vm.parenthesized.map(p => p.iota)), ...vm.stack])
      .withParenthesized([], 0),
}

export class EscapePush implements VMChange {
  constructor(public readonly iota: Iota, public readonly escaped: boolean = false) { }
  apply(vm: VM): VM { return vm.withParenthesized([{ iota: this.iota, escaped: this.escaped }, ...vm.parenthesized]) }
}

export class StackPush implements VMChange {
  constructor(public readonly iota: Iota) { }
  apply(vm: VM): VM { return vm.withStack([this.iota, ...vm.stack]) }
}

export const StackListSingleton: VMChange = {
  apply: (vm: VM): VM => {
    const [head, ...rest] = vm.stack
    return vm.withStack([new List([head]), ...rest])
  },
}

export class StackListInsert implements VMChange {
  constructor(public readonly index: number) { }
  apply(vm: VM): VM {
    const [element, list, ...rest] = vm.stack as [Iota, List, ...Iota[]]
    const newList = new List(list.values.toSpliced(this.index, 0, element))
    return vm.withStack([newList, ...rest])
  }
}

export class StackListRemove implements VMChange {
  constructor(public readonly index: number) { }
  apply(vm: VM): VM {
    const [list, ...rest] = vm.stack as [List, ...Iota[]]
    const element = list.values[this.index]
    const newList = new List(list.values.toSpliced(this.index, 1))
    return vm.withStack([element, newList, ...rest])
  }
}

export const FramePop: VMChange = {
  apply: (vm: VM): VM => vm.popFrame(),
}

export class FrameNext implements VMChange {
  constructor(public readonly frame: ContinuationFrame) { }
  apply(vm: VM): VM { return vm.popFrame().pushFrame(this.frame) }
}

export class FramePush implements VMChange {
  constructor(public readonly frame: ContinuationFrame) { }
  apply(vm: VM): VM { return vm.pushFrame(this.frame) }
}

export class HermesFrame implements ContinuationFrame {
  constructor(
    public readonly patterns: readonly Iota[] | Iota,
  ) { }

  evaluate(env: Environment, vm: VM): CastResult {
    if (Array.isArray(this.patterns)) {
      const [head, ...rest] = this.patterns as readonly Iota[]
      const result = vm.execute(head, env)
      if (rest.length > 0) {
        return result.with(new FrameNext(new HermesFrame(rest)))
      }
      return result.with(FramePop)
    }

    const result = vm.execute(this.patterns as Iota, env)
    return result.with(FramePop)
  }

  iotas(): readonly Iota[] {
    return Array.isArray(this.patterns) ? this.patterns : [this.patterns as Iota]
  }

  capturesBreak(): boolean {
    return Array.isArray(this.patterns)
  }

  restoreStack(): VMChange[] {
    return []
  }
}

export interface Environment {
  caster: () => Entity
}

export interface SideEffect {
  apply: (env: Environment) => void
}

export interface VMChange {
  apply: (vm: VM) => VM
}

export interface ParenthesizedIota {
  iota: Iota
  escaped: boolean
}

export class VM {
  public static START: VM = new VM([], [], 0, [], false)

  constructor(
    public readonly stack: readonly Iota[],
    public readonly continuation: readonly ContinuationFrame[],
    public readonly parenCount: number,
    public readonly parenthesized: readonly ParenthesizedIota[],
    public readonly escapeNext: boolean,
  ) { }

  withParenthesized(parenthesized: readonly ParenthesizedIota[], parenCount: number = this.parenCount): VM {
    return new VM(
      this.stack,
      this.continuation,
      parenCount,
      parenthesized,
      false,
    )
  }

  withStack(stack: readonly Iota[]): VM {
    return new VM(
      stack,
      this.continuation,
      this.parenCount,
      this.parenthesized,
      false,
    )
  }

  withEscapeNext(): VM {
    return new VM(
      this.stack,
      this.continuation,
      this.parenCount,
      this.parenthesized,
      true,
    )
  }

  pushFrame(frame: ContinuationFrame): VM {
    return new VM(
      this.stack,
      [frame, ...this.continuation],
      this.parenCount,
      this.parenthesized,
      this.escapeNext,
    )
  }

  popFrame(): VM {
    const [_, ...rest] = this.continuation
    return new VM(
      this.stack,
      rest,
      this.parenCount,
      this.parenthesized,
      this.escapeNext,
    )
  }

  step(env: Environment): CastResult | null {
    return this.continuation[0]?.evaluate(env, this) ?? null
  }

  execute(iota: Iota, env: Environment): CastResult {
    if (iota instanceof Pattern && !this.escapeNext && (!this.parenCount || iota.mustEscape)) {
      const result = iota.action(env, this)
      if (result instanceof CastResult) {
        return result
      }
      if (Array.isArray(result)) {
        return new CastResult(result)
      }
      return new CastResult([result])
    }

    if (this.escapeNext || this.parenCount) {
      const change = this.parenCount ? new EscapePush(iota, this.escapeNext) : new StackPush(iota)
      return new CastResult([change], [], ResolvedPatternType.ESCAPED, EvalSound.NORMAL_EXECUTE)
    }

    // TODO: MishapUnescapedValue ?
    return new CastResult([], [], ResolvedPatternType.INVALID, EvalSound.MISHASP)
  }
}

/**
 * Taken from:
 * https://github.com/FallingColors/HexMod/blob/e1ad4b316dd1e8f1f1300ee95bdbf796e8ebcad1/Common/src/main/java/at/petrak/hexcasting/api/casting/eval/ResolvedPatternType.kt#L5
 */
export class ResolvedPatternType {
  private constructor(
    public readonly name: string,
    public readonly color: number,
    public readonly fadeColor: number,
    public readonly success: boolean,
  ) { }

  public static readonly UNRESOLVED = new ResolvedPatternType('UNRESOLVED', 0x7F7F7F, 0xCCCCCC, false)
  public static readonly EVALUATED = new ResolvedPatternType('EVALUATED', 0x7385DE, 0xFECBE6, true)
  public static readonly ESCAPED = new ResolvedPatternType('ESCAPED', 0xDDCC73, 0xFFFAE5, true)
  public static readonly UNDONE = new ResolvedPatternType('UNDONE', 0xB26B6B, 0xCCA88E, true)
  public static readonly ERRORED = new ResolvedPatternType('ERRORED', 0xDE6262, 0xFFC7A0, false)
  public static readonly INVALID = new ResolvedPatternType('INVALID', 0xB26B6B, 0xCCA88E, false)
}

export enum CastSound {
  NORMAL,
  SPELL,
  HERMES,
  THOTH,
  FAILRUE,
}

/**
 * Taken from:
 * https://github.com/FallingColors/HexMod/blob/871f9387a3e1ccf0231a3e90c31e5d8472d46fde/Common/src/main/java/at/petrak/hexcasting/common/lib/hex/HexEvalSounds.java#L14
 */
export class EvalSound {
  private constructor(
    public readonly sound: CastSound | null,
    public readonly priority: number,
  ) { }

  public greaterOf(that: EvalSound): EvalSound {
    return (this.priority > that.priority) ? this : that
  }

  public static readonly NOTHING = new EvalSound(null, Number.MIN_SAFE_INTEGER)
  public static readonly NORMAL_EXECUTE = new EvalSound(CastSound.NORMAL, 0)
  public static readonly SPELL = new EvalSound(CastSound.SPELL, 1000)
  public static readonly HERMES = new EvalSound(CastSound.HERMES, 2000)
  public static readonly THOTH = new EvalSound(CastSound.THOTH, 2500)
  public static readonly MUTE = new EvalSound(null, 3000)
  public static readonly MISHASP = new EvalSound(CastSound.FAILRUE, 4000)
}
