import { HexPattern } from './grid'
import { INTROSPECTION, RETROSPECTION, SINGLES, VACANT } from './pattern'

export interface Iota {
  isTruthy: () => boolean
  tolerates: (that: Iota) => boolean

  color: () => number
  display: () => (string | HexPattern | Iota)[]
}

export type PossibleIota = Iota | PossibleIota[] | boolean | number | string
export type PossiblePatterns = (Pattern | PossiblePatterns)[]

// eslint-disable-next-line ts/no-redeclare
export const Iota = {
  tolerates: (a: Iota, b: Iota): boolean => a.tolerates(b) || b.tolerates(a),
  from: (iota: PossibleIota): Iota => {
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
  patterns: (...patterns: PossiblePatterns): Pattern[] => {
    return patterns.flatMap((elem) => {
      if (Array.isArray(elem)) {
        if (elem.length === 0) {
          return [VACANT]
        }
        if (elem.length === 1 && Array.isArray(elem[0])) {
          return [...Iota.patterns(elem[0]), SINGLES]
        }
        return [INTROSPECTION, ...Iota.patterns(...elem), RETROSPECTION]
      }
      return elem
    })
  },
}

export class Boolean implements Iota {
  constructor(public readonly value: boolean) { }

  isTruthy(): boolean {
    return this.value
  }

  tolerates(that: Iota): boolean {
    const BooleanIota = Boolean
    return that instanceof BooleanIota && this.value === that.value
  }

  color(): number {
    return this.value ? 0x00AA00 : 0xAA0000
  }

  display(): (string | HexPattern | Iota)[] {
    return [this.value ? 'True' : 'False']
  }
}

function displayNumber(num: number): string {
  return num.toLocaleString('en-us', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export class Double implements Iota {
  public static readonly TOLERANCE: number = 0.0001

  constructor(public readonly value: number) { }

  isTruthy(): boolean {
    return this.value !== 0
  }

  tolerates(that: Iota): boolean {
    return that instanceof Double && Math.abs(this.value - that.value) < Double.TOLERANCE
  }

  color(): number {
    return 0x55FF55
  }

  display(): (string | HexPattern | Iota)[] {
    return [displayNumber(this.value)]
  }
}

export class String implements Iota {
  constructor(public readonly value: string) { }

  isTruthy(): boolean {
    return this.value.length !== 0
  }

  tolerates(that: Iota): boolean {
    const StringIota = String
    return that instanceof StringIota && this.value === that.value
  }

  color(): number {
    return 0xFF55FF
  }

  display(): (string | HexPattern | Iota)[] {
    return [`"${this.value}"`]
  }
}

export type PossibleVector3
  = | { readonly x: number, readonly y: number, readonly z: number }
    | [number, number, number]

export class Vector3 implements Iota {
  public static ZERO: Vector3 = new Vector3(0, 0, 0)

  constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly z: number,
  ) { };

  public static from(vec: PossibleVector3): Vector3 {
    if (vec instanceof Vector3) {
      return vec
    }
    if (Array.isArray(vec)) {
      return new Vector3(...vec)
    }
    return new Vector3(vec.x, vec.y, vec.y)
  }

  isTruthy(): boolean {
    return this.x !== 0 && this.y !== 0 && this.z !== 0
  }

  tolerates(that: Iota): boolean {
    if (that instanceof Vector3) {
      const dx = that.x - this.x
      const dy = that.y - this.y
      const dz = that.z - this.z
      return Math.sqrt(dx * dx + dy * dy + dz * dz) < Double.TOLERANCE
    }
    else {
      return false
    }
  }

  color(): number {
    return 0xFF3030
  }

  display(): (string | HexPattern | Iota)[] {
    return [`(${displayNumber(this.x)}, ${displayNumber(this.y)}, ${displayNumber(this.z)})`]
  }
}

export interface BaseEntityProps {
  eyePosition: Vector3
  standingPosition: Vector3
  lookDirection: Vector3
  height: number
  speed: Vector3
}

export type EntityProps = Partial<Record<(string & {}), any> & BaseEntityProps>

export class EntityType implements Iota {
  constructor(
    public readonly name: string,
    public readonly properties: Readonly<EntityProps> = {},
  ) { }

  new(name?: string, properties?: EntityProps): Entity {
    return new Entity(this, name, properties)
  }

  isTruthy(): boolean {
    return true
  }

  tolerates(that: Iota): boolean {
    return this === that
  }

  color(): number {
    return 0x555FF
  }

  display(): (string | HexPattern | Iota)[] {
    return [`${this.name} Type`]
  }
}

export class Entity implements Iota {
  constructor(
    public readonly type: EntityType,
    public name: string = type.name,
    public properties: EntityProps = {},
  ) {
    this.properties = { ...type.properties, ...this.properties }
  }

  isTruthy(): boolean {
    return true
  }

  tolerates(that: Iota): boolean {
    return this === that
  }

  color(): number {
    return 0x55FFFF
  }

  display(): (string | HexPattern | Iota)[] {
    return [this.name]
  }
}

export class Pattern implements Iota {
  public readonly pattern: HexPattern

  constructor(
    pattern: HexPattern | string,
    // public readonly action: Action,
  ) {
    if (typeof pattern === 'string') {
      this.pattern = HexPattern.parse(pattern)
    }
    else {
      this.pattern = pattern
    }
  }

  isTruthy(): boolean {
    return true
  }

  tolerates(that: Iota): boolean {
    return that instanceof Pattern && this.pattern.equals(that.pattern)
  }

  color(): number {
    return 0xFFAA00
  }

  display(): (string | HexPattern | Iota)[] {
    return [this.pattern]
  }
}

export class List implements Iota {
  constructor(public readonly values: readonly Iota[]) { }

  isTruthy(): boolean {
    return this.values.length !== 0
  }

  tolerates(that: Iota): boolean {
    return that instanceof List
      && this.values.length === that.values.length
      && this.values.every((a, i) => Iota.tolerates(a, that.values[i]))
  }

  color(): number {
    return 0xAA00AA
  }

  display(): (string | HexPattern | Iota)[] {
    const withCommas = this.values.flatMap((left, i) => {
      if (!(left instanceof Pattern) && i + 1 < this.values.length && !(this.values[i + 1] instanceof Pattern)) {
        return [left, ',']
      }
      else {
        return [left]
      }
    })
    return ['[', ...withCommas, ']']
  }
}

export const Garbage: Iota = {
  isTruthy(): boolean {
    return false
  },
  tolerates(that: Iota): boolean {
    return that === Garbage
  },
  color(): number {
    return 0x505050
  },
  display(): (string | HexPattern | Iota)[] {
    return ['GARBAGE']
  },
}

export const Null: Iota = {
  isTruthy(): boolean {
    return false
  },
  tolerates(that: Iota): boolean {
    return that === Null
  },
  color(): number {
    return 0xAAAAAA
  },
  display(): (string | HexPattern | Iota)[] {
    return ['NULL']
  },
}

export const Player = new EntityType('Player', { height: 1.8 })
