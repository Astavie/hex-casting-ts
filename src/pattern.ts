import { Pattern } from './iota'
import _numbers from './numbers_2000.json'

const numbers = _numbers as { [key: number]: string[] }

export const INTROSPECTION = new Pattern('w qqq', 'Introspection', true)
export const RETROSPECTION = new Pattern('e eee', 'Retrospection', true)
export const CONSIDERATION = new Pattern('w qqqaw', 'Consideration', true)

// abbreviations: refl, purif, distil, exal, decomp, disint, gambit
// (okay that last one wasn't an abbreviation but you get the idea)

export const VACANT_REFL = new Pattern('ne qqaeaae', 'Vacant Reflection')
export const SINGLES_PURIF = new Pattern('e adeeed', 'Single\'s Purification')

export const MINDS_REFL = new Pattern('ne qaq', 'Mind\'s Reflection')

export function NUMERICAL_REFL(value: number): Pattern {
  if (!Number.isInteger(value) || value < -2000 || value > 2000) {
    throw new Error(`unknown Numerical Reflection pattern for ${value}`)
  }
  return new Pattern(numbers[value].join(), 'Numerical Reflection')
}
