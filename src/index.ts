import type { HexPattern } from './grid'
import type { Iota as IotaT, Pattern } from './iota'
import { Boolean, Double, Garbage, List, Null, String } from './iota'
import { CONSIDERATION, INTROSPECTION, NUMERICAL_REFL, RETROSPECTION } from './pattern'

export * from './grid'
export * from './iota'
export * from './pattern'
export * from './vm'

// ---- Methods for your convenience ----

export type PossibleIota = IotaT | PossibleIota[] | boolean | number | string | null | undefined
export type PossiblePatterns = (Pattern | PossiblePatterns | number)[]

export const Iota = {
  display: (a: IotaT): (string | HexPattern | IotaT)[] => a.display?.() ?? [a.toString()],
  from: (iota: PossibleIota): IotaT => {
    if (iota === null) {
      return Null
    }
    if (iota === undefined) {
      return Garbage
    }
    if (typeof iota === 'boolean') {
      return new Boolean(iota)
    }
    if (typeof iota === 'number') {
      return new Double(iota)
    }
    if (typeof iota === 'string') {
      return new String(iota)
    }
    if (Array.isArray(iota)) {
      return new List(iota.map(Iota.from))
    }
    return iota
  },
  patterns: (...list: PossiblePatterns): Pattern[] => {
    function patterns(list: PossiblePatterns, considerations = 1): Pattern[] {
      return list.flatMap((elem) => {
        if (typeof elem === 'number') {
          return NUMERICAL_REFL(elem)
        }
        if (Array.isArray(elem)) {
          return [INTROSPECTION, ...patterns(elem, considerations * 2), RETROSPECTION]
        }
        if (elem.mustEscape && considerations > 1) {
          const escaped = Array.from({ length: considerations - 1 }).fill(CONSIDERATION) as Pattern[]
          escaped.push(elem)
          return escaped
        }
        return elem
      })
    }
    return patterns(list)
  },
}
