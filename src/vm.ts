import type { Change } from './change'
import type { Continuation, Entity, Iota, IotaType } from './iota'
import { List, Pattern } from './iota'

export type ActionResult = CastResult | Change
export type Action = ((vm: VM, env: Environment) => ActionResult) | ActionResult

export class CastResult {
  constructor(
    public readonly cast: Iota,
    public readonly diff: Change,
    public readonly sideEffects: readonly SideEffect[] = [],
    public readonly resolutionType: ResolvedPatternType = ResolvedPatternType.EVALUATED,
    public readonly sound: EvalSound = EvalSound.NORMAL_EXECUTE,
  ) { }
}

export interface ContinuationFrame {
  evaluate: (vm: VM, env: Environment) => CastResult
  capturesBreak: () => boolean
  restoreStack: (stack: readonly Iota[]) => Change
  display: () => readonly Iota[]
}

export class HermesFrame implements ContinuationFrame {
  constructor(
    public readonly patterns: readonly Iota[],
    public readonly capturesBrk: boolean,
  ) { }

  evaluate(vm: VM, env: Environment): CastResult {
    const [head, ...rest] = this.patterns
    const pattern = head

    const newCont: Change = { framePop: 1 }
    const frame = new HermesFrame(rest, this.capturesBrk)
    if (rest.length > 0) {
      newCont.framePush = [frame]
    }

    const result = vm.apply(newCont).execute(pattern, env)
    if (rest.length > 0) {
      const existingFrames = result.diff.framePush ?? []
      result.diff.framePush = [frame, ...existingFrames]
    }
    result.diff.framePop = (result.diff.framePop ?? 0) + 1
    return result
  }

  capturesBreak(): boolean {
    return this.capturesBrk
  }

  restoreStack(): Change {
    return {}
  }

  display(): readonly Iota[] {
    return this.patterns
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
      this.acc.push(...vm.stack)
      stack = this.baseStack
    }

    // If we still have data to process...
    const image2: Change = {
      framePop: 1,
      stackSet: this.baseStack !== null ? stack : undefined,
    }
    if (this.data.length) {
      // push the next datum to the top of the stack,
      const [head, ...rest] = this.data
      image2.stackPush = [head]
      image2.framePush = [
        // put the next Thoth object back on the stack for the next Thoth cycle,
        new ThothFrame(rest, this.code, stack, this.acc),
        // and prep the Thoth'd code block for evaluation.
        new HermesFrame(this.code, false),
      ]
    }
    else {
      // else, dump our final list onto the stack.
      image2.stackPush = [new List([...this.acc])]
    }

    return new CastResult(new List(this.code), image2, [], ResolvedPatternType.EVALUATED, EvalSound.THOTH)
  }

  capturesBreak(): boolean {
    return true
  }

  restoreStack(stack: readonly Iota[]): Change {
    this.acc.push(...stack)
    return {
      stackSet: this.baseStack ?? [],
      stackPush: [new List([...this.acc])],
    }
  }

  display(): readonly Iota[] {
    return this.data
  }
}

export interface Environment {
  caster: () => Entity
}

export interface SideEffect {
  apply: (env: Environment) => void
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
      const ty = tys[i]
      const iota = this.stack[this.stack.length - tys.length + i]
      if (ty !== null && !iota.type().equals(ty)) {
        throw new Error('TODO: MISHAP')
      }
      result.push(iota)
    }
    return result as any
  }

  apply(...diff: readonly Change[]): VM {
    let parenCount = this.parenCount
    let parenthesized = this.parenthesized
    let escapeNext = this.escapeNext
    let stack = this.stack
    let frames = this.frames

    for (const change of diff) {
      parenCount = parenCount + (change.escapeIntro ? 1 : 0) - (change.escapeRetro ? 1 : 0)

      if (parenCount === 0) {
        parenthesized = []
      }
      if (change.escapePush) {
        parenthesized = [...parenthesized, { iota: change.escapePush, escaped: escapeNext }]
      }

      escapeNext = change.escapeConsider ?? (escapeNext && change.escapePush === undefined)

      if (change.stackSet) {
        stack = change.stackSet
      }
      if (change.stackPop) {
        stack = stack.toSpliced(stack.length - change.stackPop, change.stackPop)
      }
      if (change.stackMove) {
        const iota = stack[change.stackMove.from]
        stack = stack.toSpliced(change.stackMove.from, 1).toSpliced(change.stackMove.to, 0, iota)
      }
      if (change.stackPush) {
        stack = [...stack, ...change.stackPush]
      }

      if (change.frameSet) {
        frames = change.frameSet
      }
      if (change.framePop) {
        frames = frames.toSpliced(frames.length - 1, 1)
      }
      if (change.framePush) {
        frames = [...frames, ...change.framePush]
      }
    }

    return new VM(stack, frames, parenCount, parenthesized, escapeNext)
  }

  step(env: Environment): CastResult | null {
    return this.frames[this.frames.length - 1]?.evaluate(this, env) ?? null
  }

  run(env: Environment, ...iotas: Iota[]): VM {
    let vm: VM = this

    for (const iota of iotas) {
      let result = vm.step(env)
      while (result !== null) {
        vm = vm.apply(result.diff)
        result = vm.step(env)
      }
      result = vm.execute(iota, env)
      vm = vm.apply(result.diff)
    }

    let result = vm.step(env)
    while (result !== null) {
      vm = vm.apply(result.diff)
      result = vm.step(env)
    }

    return vm
  }

  executeJump(iota: Continuation): CastResult {
    return new CastResult(iota, { frameSet: iota.cont }, [], ResolvedPatternType.EVALUATED, EvalSound.HERMES)
  }

  execute(iota: Iota, env: Environment): CastResult {
    if (iota.execute && !this.escapeNext && (!this.parenCount || (iota instanceof Pattern && iota.mustEscape))) {
      const result = typeof iota.execute === 'function' ? iota.execute(this, env) : iota.execute
      if (result instanceof CastResult) {
        return result
      }
      return new CastResult(iota, result)
    }

    if (this.escapeNext || this.parenCount) {
      const change: Change = this.parenCount ? { escapePush: iota } : { stackPush: [iota] }
      return new CastResult(iota, change, [], ResolvedPatternType.ESCAPED, EvalSound.NORMAL_EXECUTE)
    }

    // TODO: MishapUnescapedValue ?
    return new CastResult(iota, {}, [], ResolvedPatternType.INVALID, EvalSound.MISHASP)
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
