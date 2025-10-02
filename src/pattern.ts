import { Double, List, Pattern } from './iota'
import _numbers from './numbers_2000.json'
import { CastResult, EscapeConsider, EscapeEnd, EscapeIntro, EscapePush, EscapeRetro, EscapeStart, EvalSound, ResolvedPatternType, StackListSingleton, StackPush } from './vm'

const numbers = _numbers as { [key: number]: string[] }

export const INTROSPECTION: Pattern = new Pattern('w qqq', 'Introspection', (_, vm) => {
  if (vm.parenCount === 0) {
    return new CastResult([EscapeStart, EscapeIntro], [], ResolvedPatternType.EVALUATED)
  }
  return new CastResult([new EscapePush(INTROSPECTION), EscapeIntro], [], ResolvedPatternType.ESCAPED)
}, true)
export const RETROSPECTION: Pattern = new Pattern('e eee', 'Retrospection', (_, vm) => {
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

export const MINDS_REFL = new Pattern('ne qaq', 'Mind\'s Reflection', env => new StackPush(env.caster()))

export function NUMERICAL_REFL(value: number): Pattern {
  if (!Number.isInteger(value) || value < -2000 || value > 2000) {
    throw new Error(`unknown Numerical Reflection pattern for ${value}`)
  }
  return new Pattern(numbers[value].join(), 'Numerical Reflection', () => new StackPush(new Double(value)))
}
