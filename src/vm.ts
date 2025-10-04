import type { Entity, Iota, IotaType } from './iota'
import { List, Pattern } from './iota'

export type Action = (vm: VM, env: Environment) => CastResult | VMChange[] | VMChange

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
  evaluate: (vm: VM, env: Environment) => CastResult
  capturesBreak: () => boolean
  restoreStack: (stack: readonly Iota[]) => VMChange[]
}

export const EscapeStart: VMChange = {
  apply: (vm: VM): VM => vm,
}

export const EscapeIntro: VMChange = {
  apply: (vm: VM): VM => vm.copy({ parenCount: vm.parenCount + 1 }),
}

export const EscapeRetro: VMChange = {
  apply: (vm: VM): VM => vm.copy({ parenCount: vm.parenCount - 1 }),
}

export const EscapeConsider: VMChange = {
  apply: (vm: VM): VM => vm.copy({ escapeNext: true }),
}

export const EscapeEnd: VMChange = {
  apply: (vm: VM): VM => vm.copy({
    stack: [new List(vm.parenthesized.map(p => p.iota)), ...vm.stack],
    parenthesized: [],
  }),
}

export class EscapePush implements VMChange {
  constructor(public readonly iota: Iota, public readonly escaped: boolean = false) { }
  apply(vm: VM): VM {
    return vm.copy({
      parenthesized: [...vm.parenthesized, { iota: this.iota, escaped: this.escaped }],
      escapeNext: false,
    })
  }
}

export class StackPush implements VMChange {
  constructor(public readonly iota: Iota, public readonly fromThoth: boolean = false) { }
  apply(vm: VM): VM {
    return vm.copy({
      stack: [this.iota, ...vm.stack],
      escapeNext: false,
    })
  }
}

export class StackPop implements VMChange {
  constructor(public readonly count: number = 1) { }
  apply(vm: VM): VM { return vm.copy({ stack: vm.stack.toSpliced(0, this.count) }) }
}

export class StackSet implements VMChange {
  constructor(public readonly iotas: readonly Iota[]) { }
  apply(vm: VM): VM {
    return vm.copy({
      stack: this.iotas,
      escapeNext: false,
    })
  }
}

export const StackListSingleton: VMChange = {
  apply: (vm: VM): VM => {
    const [head, ...rest] = vm.stack
    return vm.copy({ stack: [new List([head]), ...rest] })
  },
}

export class StackListInsert implements VMChange {
  constructor(public readonly index: number) { }
  apply(vm: VM): VM {
    const [element, list, ...rest] = vm.stack as [Iota, List, ...Iota[]]
    const newList = new List(list.values.toSpliced(this.index, 0, element))
    return vm.copy({ stack: [newList, ...rest] })
  }
}

export class StackListRemove implements VMChange {
  constructor(public readonly index: number) { }
  apply(vm: VM): VM {
    const [list, ...rest] = vm.stack as [List, ...Iota[]]
    const element = list.values[this.index]
    const newList = new List(list.values.toSpliced(this.index, 1))
    return vm.copy({ stack: [element, newList, ...rest] })
  }
}

export const FramePop: VMChange = {
  apply: (vm: VM): VM => vm.copy({ frames: vm.frames.toSpliced(0, 1) }),
}

export class FrameNext implements VMChange {
  constructor(public readonly frame: ContinuationFrame) { }
  apply(vm: VM): VM { return vm.copy({ frames: vm.frames.with(0, this.frame) }) }
}

export class FramePush implements VMChange {
  constructor(public readonly frame: ContinuationFrame, public readonly iotas: readonly Iota[], public readonly fromStack: boolean = false) { }
  apply(vm: VM): VM {
    return vm.copy({
      frames: [this.frame, ...vm.frames],
      stack: this.fromStack ? vm.stack.toSpliced(0, 1) : vm.stack,
    })
  }
}

export class FrameSet implements VMChange {
  constructor(public readonly cont: readonly ContinuationFrame[]) { }
  apply(vm: VM): VM { return vm.copy({ frames: this.cont }) }
}

export class HermesFrame implements ContinuationFrame {
  constructor(
    public readonly patterns: readonly Iota[],
    public readonly isMetacasting: boolean,
    public readonly capturesBrk: boolean,
  ) { }

  evaluate(vm: VM, env: Environment): CastResult {
    const [head, ...rest] = this.patterns
    const pattern = head

    let newCont: VMChange
    if (rest.length > 0) {
      newCont = new FrameNext(new HermesFrame(rest, this.isMetacasting, this.capturesBrk))
    }
    else {
      newCont = FramePop
    }

    const result = newCont.apply(vm).execute(pattern, env).with(newCont)
    if (this.isMetacasting && result.sound !== EvalSound.MISHASP) {
      return new CastResult(result.diff, result.sideEffects, result.resolutionType, EvalSound.HERMES)
    }
    return result
  }

  capturesBreak(): boolean {
    return this.capturesBrk
  }

  restoreStack(): VMChange[] {
    return []
  }
}

export class ThothFrame implements ContinuationFrame {
  constructor(
    public readonly data: readonly Iota[],
    public readonly code: readonly Iota[],
    public readonly baseStack: readonly Iota[] | null,
    public readonly acc: Iota[], // mutable list!
  ) { }

  evaluate(vm: VM): CastResult {
    // If this isn't the very first Thoth step (i.e. no Thoth computations run yet)...
    let stack: readonly Iota[]
    if (this.baseStack === null) {
      // init stack to the VM stack...
      stack = vm.stack
    }
    else {
      // else save the stack to the accumulator and reuse the saved base stack.
      this.acc.push(...vm.stack.toReversed())
      stack = this.baseStack
    }

    // If we still have data to process...
    let stackTop: Iota
    let newCont: VMChange[]
    if (this.data.length) {
      // push the next datum to the top of the stack,
      const [head, ...rest] = this.data
      stackTop = head
      newCont = [
        // put the next Thoth object back on the stack for the next Thoth cycle,
        new FrameNext(new ThothFrame(rest, this.code, stack, this.acc)),
        // and prep the Thoth'd code block for evaluation.
        new FramePush(new HermesFrame(this.code, true, false), this.code),
      ]
    }
    else {
      // Else, dump our final list onto the stack.
      stackTop = new List([...this.acc])
      newCont = [FramePop]
    }

    const diff = [new StackSet(stack), new StackPush(stackTop, true), ...newCont]
    return new CastResult(diff, [], ResolvedPatternType.EVALUATED, EvalSound.THOTH)
  }

  capturesBreak(): boolean {
    return true
  }

  restoreStack(stack: readonly Iota[]): VMChange[] {
    this.acc.push(...stack.toReversed())
    return [
      new StackSet(this.baseStack ?? []),
      new StackPush(new List([...this.acc])),
    ]
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
    public readonly frames: readonly ContinuationFrame[],
    public readonly parenCount: number,
    public readonly parenthesized: readonly ParenthesizedIota[],
    public readonly escapeNext: boolean,
  ) { }

  get<const Types extends (IotaType<Iota> | null)[]>(...tys: Types): { [K in keyof Types]: Types[K] extends IotaType<infer I> ? I : Iota } {
    if (this.stack.length < tys.length) {
      throw new Error('TODO: MISHAP')
    }

    const result: any[] = []
    for (let i = 0; i < tys.length; i++) {
      const ty = tys[tys.length - 1 - i]
      const iota = this.stack[i]
      if (ty !== null && !iota.type().equals(ty)) {
        throw new Error('TODO: MISHAP')
      }
      result.push(iota)
    }
    return result as any
  }

  apply(...diff: readonly VMChange[]): VM {
    let vm: VM = this
    for (const change of diff) {
      vm = change.apply(vm)
    }
    return vm
  }

  copy(params: {
    readonly stack?: readonly Iota[]
    readonly frames?: readonly ContinuationFrame[]
    readonly parenCount?: number
    readonly parenthesized?: readonly ParenthesizedIota[]
    readonly escapeNext?: boolean
  }): VM {
    return new VM(
      params.stack ?? this.stack,
      params.frames ?? this.frames,
      params.parenCount ?? this.parenCount,
      params.parenthesized ?? this.parenthesized,
      params.escapeNext ?? this.escapeNext,
    )
  }

  step(env: Environment): CastResult | null {
    return this.frames[0]?.evaluate(this, env) ?? null
  }

  run(env: Environment, ...iotas: Iota[]): VM {
    let vm: VM = this
    let result = vm.step(env)
    while (result !== null) {
      vm = vm.apply(...result.diff)
      result = vm.step(env)
    }
    if (iotas.length) {
      const [head, ...rest] = iotas
      result = vm.execute(head, env)
      return vm.apply(...result.diff).run(env, ...rest)
    }
    return vm
  }

  executeJump(cont: readonly ContinuationFrame[]): CastResult {
    return new CastResult([new FrameSet(cont)], [], ResolvedPatternType.EVALUATED, EvalSound.HERMES)
  }

  execute(iota: Iota, env: Environment): CastResult {
    if (iota.execute && !this.escapeNext && (!this.parenCount || (iota instanceof Pattern && iota.mustEscape))) {
      const result = iota.execute(this, env)
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
