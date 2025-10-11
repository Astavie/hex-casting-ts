import type { HexPattern } from './grid'
import type { Iota as IotaT, Pattern } from './iota'
import { Boolean, Double, Garbage, List, Null, String, Vector3 } from './iota'
import { ARCS_REFL, CIRCLES_REFL, CONSIDERATION, EULERS_REFL, FALSE_REFL, INTROSPECTION, NULLARY_REFL, NUMERICAL_REFL, RETROSPECTION, TRUE_REFL, VECTOR_EXAL, VECTOR_REFL_NEG_X, VECTOR_REFL_NEG_Y, VECTOR_REFL_NEG_Z, VECTOR_REFL_X, VECTOR_REFL_Y, VECTOR_REFL_Z, VECTOR_REFL_ZERO } from './pattern'

export * from './change'
export * from './grid'
export * from './iota'
export * from './pattern'
export * from './vm'

// ---- Methods for your convenience ----

export type PossibleIota = IotaT | PossibleIota[] | boolean | number | string | null | undefined
export type PossiblePatterns = (Pattern | PossiblePatterns | Vector3 | boolean | number | null)[]

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
        if (elem === null) {
          return NULLARY_REFL
        }
        if (typeof elem === 'boolean') {
          return elem ? TRUE_REFL : FALSE_REFL
        }
        if (typeof elem === 'number') {
          if (elem === Math.PI * 2) {
            return CIRCLES_REFL
          }
          if (elem === Math.PI) {
            return ARCS_REFL
          }
          if (elem === Math.E) {
            return EULERS_REFL
          }
          return NUMERICAL_REFL(elem)
        }
        if (elem instanceof Vector3) {
          if (elem.equals(Vector3.ZERO)) {
            return VECTOR_REFL_ZERO
          }
          if (elem.equals(Vector3.X)) {
            return VECTOR_REFL_X
          }
          if (elem.equals(Vector3.Y)) {
            return VECTOR_REFL_Y
          }
          if (elem.equals(Vector3.Z)) {
            return VECTOR_REFL_Z
          }
          if (elem.equals(Vector3.NEG_X)) {
            return VECTOR_REFL_NEG_X
          }
          if (elem.equals(Vector3.NEG_Y)) {
            return VECTOR_REFL_NEG_Y
          }
          if (elem.equals(Vector3.NEG_Z)) {
            return VECTOR_REFL_NEG_Z
          }
          return patterns([elem.x, elem.y, elem.z, VECTOR_EXAL], considerations)
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
