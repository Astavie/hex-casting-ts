import { Boolean, Continuation, Double, IotaType, List, Null, Pattern, Vector3 } from './iota'
import _numbers from './numbers_2000.json'
import { CastResult, EscapeConsider, EscapeEnd, EscapeIntro, EscapePush, EscapeRetro, EscapeStart, EvalSound, FramePush, HermesFrame, ResolvedPatternType, StackListSingleton, StackPop, StackPush, ThothFrame } from './vm'

const numbers = _numbers as { [key: number]: string[] }

export const INTROSPECTION: Pattern = new Pattern('w qqq', 'Introspection', (vm) => {
  if (vm.parenCount === 0) {
    return new CastResult([EscapeStart, EscapeIntro], [], ResolvedPatternType.EVALUATED)
  }
  return new CastResult([new EscapePush(INTROSPECTION), EscapeIntro], [], ResolvedPatternType.ESCAPED)
}, true)
export const RETROSPECTION: Pattern = new Pattern('e eee', 'Retrospection', (vm) => {
  if (vm.parenCount === 0) {
    // TODO: MishapTooManyCloseParens ?
    return new CastResult([], [], ResolvedPatternType.ERRORED, EvalSound.MISHASP)
  }
  if (vm.parenCount === 1) {
    return new CastResult([EscapeRetro, EscapeEnd], [], ResolvedPatternType.EVALUATED)
  }
  return new CastResult([EscapeRetro, new EscapePush(RETROSPECTION)], [], ResolvedPatternType.ESCAPED)
}, true)
export const CONSIDERATION = new Pattern('w qqqaw', 'Consideration', () => EscapeConsider, true)

// abbreviations: refl, purif, distil, exal, decomp, disint, gambit
// (okay that last one wasn't an abbreviation but you get the idea)

export const VACANT_REFL = new Pattern('ne qqaeaae', 'Vacant Reflection', () => new StackPush(List.EMPTY))
export const SINGLES_PURIF = new Pattern('e adeeed', 'Single\'s Purification', () => StackListSingleton)

export const MINDS_REFL = new Pattern('ne qaq', 'Mind\'s Reflection', (_, env) => new StackPush(env.caster()))

export const THOTHS_GAMBIT = new Pattern('ne dadad', 'Thoth\'s Gambit', (vm) => {
  const [instrs, datums] = vm.get(IotaType.LIST, IotaType.LIST)
  const frame = new ThothFrame(datums.values, instrs.values, null, [])
  const image2 = [new StackPop(1), new FramePush(frame, frame.data, true)]
  return new CastResult(image2, [], ResolvedPatternType.EVALUATED, EvalSound.THOTH)
})

export const HERMES_GAMBIT = new Pattern('se deaqq', 'Hermes\' Gambit', (vm) => {
  const [iota] = vm.get(null)
  const instrs = iota instanceof List ? iota.values : [iota]

  if (instrs.length) {
    const frame = new HermesFrame(instrs, true, iota instanceof List)
    const image2 = [new FramePush(frame, instrs, true)]
    return new CastResult(image2, [], ResolvedPatternType.EVALUATED, EvalSound.HERMES)
  }
  else {
    // if the list of instructions is empty, we don't have to add a continuation frame
    const image2 = [new StackPop(1)]
    return new CastResult(image2, [], ResolvedPatternType.EVALUATED, EvalSound.HERMES)
  }
})

export const IRIS_GAMBIT = new Pattern('nw qwaqde', 'Iris\' Gambit', (vm, env) => {
  const continuation = new Continuation(vm.frames)
  const result = HERMES_GAMBIT.execute(vm, env) as CastResult
  return new CastResult([...result.diff, new StackPush(continuation)], result.sideEffects, result.resolutionType, result.sound)
})

// Constants

export function NUMERICAL_REFL(value: number): Pattern {
  if (!Number.isInteger(value) || value < -2000 || value > 2000) {
    throw new Error(`unknown Numerical Reflection pattern for ${value}`)
  }
  return new Pattern(numbers[value].join(), 'Numerical Reflection', () => new StackPush(new Double(value)))
}

export const TRUE_REFL = new Pattern('se aqae', 'True Reflection', () => new StackPush(new Boolean(true)))
export const FALSE_REFL = new Pattern('ne dedq', 'False Reflection', () => new StackPush(new Boolean(false)))
export const NULLARY_REFL = new Pattern('e d', 'Nullary Reflection', () => new StackPush(Null))

export const VECTOR_REFL_ZERO = new Pattern('nw qqqqq', 'Vector Reflection Zero', () => new StackPush(Vector3.ZERO))
export const VECTOR_REFL_X = new Pattern('nw qqqqqea', 'Vector Reflection +X', () => new StackPush(Vector3.X))
export const VECTOR_REFL_Y = new Pattern('nw qqqqqew', 'Vector Reflection +Y', () => new StackPush(Vector3.Y))
export const VECTOR_REFL_Z = new Pattern('nw qqqqqed', 'Vector Reflection +Z', () => new StackPush(Vector3.Z))
export const VECTOR_REFL_NEG_X = new Pattern('nw eeeeeqa', 'Vector Reflection -X', () => new StackPush(Vector3.NEG_X))
export const VECTOR_REFL_NEG_Y = new Pattern('nw eeeeeqw', 'Vector Reflection -Y', () => new StackPush(Vector3.NEG_Y))
export const VECTOR_REFL_NEG_Z = new Pattern('nw eeeeeqd', 'Vector Reflection -Z', () => new StackPush(Vector3.NEG_Z))

export const CIRCLES_REFL = new Pattern('nw eawae', 'Circle\'s Reflection', () => new StackPush(new Double(Math.PI * 2)))
export const ARCS_REFL = new Pattern('ne qdwdq', 'Arc\'s Reflection', () => new StackPush(new Double(Math.PI)))
export const EULERS_REFL = new Pattern('e aaq', 'Euler\'s Reflection', () => new StackPush(new Double(Math.E)))

// Mathematics

export const VECTOR_EXAL = new Pattern('e eqqqqq', 'Vector Exaltation', (vm) => {
  const [x, y, z] = vm.get(IotaType.DOUBLE, IotaType.DOUBLE, IotaType.DOUBLE)
  const result = new Vector3(x.value, y.value, z.value)
  return [new StackPop(3), new StackPush(result)]
})
