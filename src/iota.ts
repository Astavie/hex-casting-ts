import type { HexPattern } from './grid'

export interface Iota {
  isTruthy: () => boolean
  tolerates: (that: Iota) => boolean

  color: () => number
  display: () => (string | HexPattern | Iota)[]
}

// eslint-disable-next-line ts/no-redeclare
export const Iota = {
  tolerates: (a: Iota, b: Iota) => a.tolerates(b) || b.tolerates(a),
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

export type PossibleVector3
  = | { readonly x: number, readonly y: number, readonly z: number }
    | [number, number, number]

export class Vector3 implements Iota {
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

export interface EntityProps {
  eyePosition: Vector3
  standingPosition: Vector3
  lookDirection: Vector3
  height: number
  speed: Vector3
}

export class EntityType implements Iota {
  constructor(
    public readonly name: string,
    private readonly properties: Partial<EntityProps> = {},
  ) { }

  get<K extends string>(prop: K): (K extends keyof EntityProps ? EntityProps[K] : unknown) | undefined
  get<K extends string, V extends (K extends keyof EntityProps ? EntityProps[K] : unknown)>(prop: K, defaultValue: V): V

  get(prop: string, defaultValue?: unknown): any {
    return (this.properties as any)[prop] ?? defaultValue
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
    private properties: Partial<EntityProps> = {},
  ) { }

  get<K extends string>(prop: K): (K extends keyof EntityProps ? EntityProps[K] : unknown) | undefined
  get<K extends string, V extends (K extends keyof EntityProps ? EntityProps[K] : unknown)>(prop: K, defaultValue: V): V

  get(prop: string, defaultValue?: unknown): unknown {
    return (this.properties as any)[prop] ?? this.type.get(prop, defaultValue)
  }

  set<K extends string, V extends (K extends keyof EntityProps ? EntityProps[K] : unknown)>(prop: K, value: V): void {
    (this.properties as any)[prop] = value
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
  constructor(
    public readonly pattern: HexPattern,
    // public readonly action: Action,
  ) { }

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
  constructor(public readonly values: Iota[]) { }

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
