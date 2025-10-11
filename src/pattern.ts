import type { Change } from './change'
import { Boolean, Continuation, Double, IotaType, List, Null, Pattern, Vector3 } from './iota'
import _numbers from './numbers_2000.json'
import { CastResult, EvalSound, HermesFrame, ResolvedPatternType, ThothFrame } from './vm'

const numbers = _numbers as { [key: number]: string[] }

export const INTROSPECTION: Pattern = new Pattern('w qqq', 'Introspection', (vm) => {
  if (vm.parenCount === 0) {
    return new CastResult(INTROSPECTION, { escapeIntro: true }, [], ResolvedPatternType.EVALUATED)
  }
  return new CastResult(INTROSPECTION, { escapePush: INTROSPECTION, escapeIntro: true }, [], ResolvedPatternType.ESCAPED)
}, true)
export const RETROSPECTION: Pattern = new Pattern('e eee', 'Retrospection', (vm) => {
  if (vm.parenCount === 0) {
    // TODO: MishapTooManyCloseParens ?
    return new CastResult(RETROSPECTION, {}, [], ResolvedPatternType.ERRORED, EvalSound.MISHASP)
  }
  if (vm.parenCount === 1) {
    return new CastResult(RETROSPECTION, { escapeRetro: true, stackPush: [new List(vm.parenthesized.map(p => p.iota))] }, [], ResolvedPatternType.EVALUATED)
  }
  return new CastResult(RETROSPECTION, { escapeRetro: true, escapePush: RETROSPECTION }, [], ResolvedPatternType.ESCAPED)
}, true)
export const CONSIDERATION = new Pattern('w qqqaw', 'Consideration', { escapeConsider: true }, true)

// abbreviations: refl, purif, distil, exal, decomp, disint, gambit
// (okay that last one wasn't an abbreviation but you get the idea)

export const VACANT_REFL = new Pattern('ne qqaeaae', 'Vacant Reflection', { stackPush: [List.EMPTY] })
export const SINGLES_PURIF = new Pattern('e adeeed', 'Single\'s Purification', vm => ({ stackPop: 1, stackPush: [new List(vm.get(null))] }))

export const MINDS_REFL = new Pattern('ne qaq', 'Mind\'s Reflection', (_, env) => ({ stackPush: [env.caster()] }))

export const THOTHS_GAMBIT: Pattern = new Pattern('ne dadad', 'Thoth\'s Gambit', (vm) => {
  const [instrs, datums] = vm.get(IotaType.LIST, IotaType.LIST)
  const frame = new ThothFrame(datums.values, instrs.values, null, [])
  const image2: Change = { stackPop: 2, framePush: [frame] }
  return new CastResult(THOTHS_GAMBIT, image2, [], ResolvedPatternType.EVALUATED, EvalSound.THOTH)
})

export const HERMES_GAMBIT: Pattern = new Pattern('se deaqq', 'Hermes\' Gambit', (vm) => {
  const [iota] = vm.get(null)
  const instrs = iota instanceof List ? iota.values : [iota]

  const image2: Change = { stackPop: 1 }
  if (instrs.length) {
    image2.framePush = [new HermesFrame(instrs, iota instanceof List)]
  }

  return new CastResult(HERMES_GAMBIT, image2, [], ResolvedPatternType.EVALUATED, EvalSound.HERMES)
})

export const IRIS_GAMBIT: Pattern = new Pattern('nw qwaqde', 'Iris\' Gambit', (vm) => {
  const [iota] = vm.get(null)
  const instrs = iota instanceof List ? iota.values : [iota]

  const continuation = new Continuation(vm.frames)
  const image2: Change = { stackPop: 1, stackPush: [continuation] }
  if (instrs.length) {
    image2.framePush = [new HermesFrame(instrs, iota instanceof List)]
  }

  return new CastResult(IRIS_GAMBIT, image2, [], ResolvedPatternType.EVALUATED, EvalSound.HERMES)
})

// Constants

export function NUMERICAL_REFL(value: number): Pattern {
  if (!Number.isInteger(value) || value < -2000 || value > 2000) {
    throw new Error(`unknown Numerical Reflection pattern for ${value}`)
  }
  return new Pattern(numbers[value].join(), 'Numerical Reflection', { stackPush: [new Double(value)] })
}

export const TRUE_REFL = new Pattern('se aqae', 'True Reflection', { stackPush: [new Boolean(true)] })
export const FALSE_REFL = new Pattern('ne dedq', 'False Reflection', { stackPush: [new Boolean(false)] })
export const NULLARY_REFL = new Pattern('e d', 'Nullary Reflection', { stackPush: [Null] })

export const VECTOR_REFL_ZERO = new Pattern('nw qqqqq', 'Vector Reflection Zero', { stackPush: [Vector3.ZERO] })
export const VECTOR_REFL_X = new Pattern('nw qqqqqea', 'Vector Reflection +X', { stackPush: [Vector3.X] })
export const VECTOR_REFL_Y = new Pattern('nw qqqqqew', 'Vector Reflection +Y', { stackPush: [Vector3.Y] })
export const VECTOR_REFL_Z = new Pattern('nw qqqqqed', 'Vector Reflection +Z', { stackPush: [Vector3.Z] })
export const VECTOR_REFL_NEG_X = new Pattern('nw eeeeeqa', 'Vector Reflection -X', { stackPush: [Vector3.NEG_X] })
export const VECTOR_REFL_NEG_Y = new Pattern('nw eeeeeqw', 'Vector Reflection -Y', { stackPush: [Vector3.NEG_Y] })
export const VECTOR_REFL_NEG_Z = new Pattern('nw eeeeeqd', 'Vector Reflection -Z', { stackPush: [Vector3.NEG_Z] })

export const CIRCLES_REFL = new Pattern('nw eawae', 'Circle\'s Reflection', { stackPush: [new Double(Math.PI * 2)] })
export const ARCS_REFL = new Pattern('ne qdwdq', 'Arc\'s Reflection', { stackPush: [new Double(Math.PI)] })
export const EULERS_REFL = new Pattern('e aaq', 'Euler\'s Reflection', { stackPush: [new Double(Math.E)] })

// Mathematics

export const VECTOR_EXAL = new Pattern('e eqqqqq', 'Vector Exaltation', (vm) => {
  const [x, y, z] = vm.get(IotaType.DOUBLE, IotaType.DOUBLE, IotaType.DOUBLE)
  const result = new Vector3(x.value, y.value, z.value)
  return { stackPop: 3, stackPush: [result] }
})
