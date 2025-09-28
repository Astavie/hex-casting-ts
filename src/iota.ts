import { HexPattern } from './grid'

export interface Iota {
  isTruthy: () => boolean
  equals: (that: Iota) => boolean

  color: () => number
  display?: () => (string | HexPattern | Iota)[]
  toString: () => string
}

export class Boolean implements Iota {
  constructor(public readonly value: boolean) { }

  isTruthy(): boolean {
    return this.value
  }

  equals(that: Iota): boolean {
    const BooleanIota = Boolean
    return that instanceof BooleanIota && this.value === that.value
  }

  color(): number {
    return this.value ? 0x00AA00 : 0xAA0000
  }

  toString(): string {
    return this.value ? 'True' : 'False'
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

  equals(that: Iota): boolean {
    return that instanceof Double && Math.abs(this.value - that.value) < Double.TOLERANCE
  }

  color(): number {
    return 0x55FF55
  }

  toString(): string {
    return displayNumber(this.value)
  }
}

export class String implements Iota {
  constructor(public readonly value: string) { }

  isTruthy(): boolean {
    return this.value.length !== 0
  }

  equals(that: Iota): boolean {
    const StringIota = String
    return that instanceof StringIota && this.value === that.value
  }

  color(): number {
    return 0xFF55FF
  }

  toString(): string {
    return `"${this.value}"`
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

  equals(that: Iota): boolean {
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

  toString(): string {
    return `(${displayNumber(this.x)}, ${displayNumber(this.y)}, ${displayNumber(this.z)})`
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

  equals(that: Iota): boolean {
    return this === that
  }

  color(): number {
    return 0x555FF
  }

  toString(): string {
    return `${this.name} Type`
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

  equals(that: Iota): boolean {
    return this === that
  }

  color(): number {
    return 0x55FFFF
  }

  toString(): string {
    return this.name
  }
}

export class Pattern implements Iota {
  public readonly pattern: HexPattern

  public constructor(
    pattern: HexPattern | string,
    public readonly name: string,
    // public readonly action: Action,
    public readonly mustEscape: boolean = false,
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

  equals(that: Iota): boolean {
    return that instanceof Pattern && this.pattern.equals(that.pattern)
  }

  color(): number {
    return 0xFFAA00
  }

  display(): (string | HexPattern | Iota)[] {
    return [this.pattern]
  }

  toString(): string {
    return this.pattern.toString()
  }
}

export class List implements Iota {
  constructor(public readonly values: readonly Iota[]) { }

  isTruthy(): boolean {
    return this.values.length !== 0
  }

  equals(that: Iota): boolean {
    return that instanceof List
      && this.values.length === that.values.length
      && this.values.every((a, i) => a.equals(that.values[i]))
  }

  color(): number {
    return 0xAA00AA
  }

  display(): (string | HexPattern | Iota)[] {
    const withCommas = this.values.flatMap((left, i) => {
      if (!(left instanceof Pattern) && i + 1 < this.values.length && !(this.values[i + 1] instanceof Pattern)) {
        return [left, ', ']
      }
      return left
    })
    return ['[', ...withCommas, ']']
  }

  toString(): string {
    return this.display().join('')
  }
}

export const Garbage: Iota = {
  isTruthy(): boolean {
    return false
  },
  equals(that: Iota): boolean {
    return that === Garbage
  },
  color(): number {
    return 0x505050
  },
  toString(): string {
    return 'GARBAGE'
  },
}

export const Null: Iota = {
  isTruthy(): boolean {
    return false
  },
  equals(that: Iota): boolean {
    return that === Null
  },
  color(): number {
    return 0xAAAAAA
  },
  toString(): string {
    return 'NULL'
  },
}

export const Player = new EntityType('Player', { height: 1.8 })
