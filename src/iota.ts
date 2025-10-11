import type { Action, CastResult, ContinuationFrame, VM } from './vm'
import { HexPattern } from './grid'

export interface Iota {
  isTruthy: () => boolean
  equals: (that: Iota) => boolean

  color: () => number
  display?: () => (string | HexPattern | Iota)[]
  toString: () => string

  execute?: Action
  type: () => IotaType<Iota>
}

export type IotaTypeType = IotaType<IotaTypeType>

export class IotaType<T extends Iota> implements Iota {
  constructor(public readonly name: string, _?: T) { }

  isTruthy(): boolean {
    return true
  }

  equals(that: Iota): boolean {
    return this === that
  }

  color(): number {
    return 0x553355
  }

  toString(): string {
    return this.name
  }

  type(): IotaTypeType {
    return IotaType.IOTA_TYPE
  }

  public static readonly NULL: IotaType<Iota> = new IotaType('Null')
  public static readonly DOUBLE: IotaType<Double> = new IotaType('Double')
  public static readonly BOOLEAN: IotaType<Boolean> = new IotaType('Boolean')
  public static readonly ENTITY: IotaType<Entity> = new IotaType('Entity')
  public static readonly LIST: IotaType<List> = new IotaType('List')
  public static readonly PATTERN: IotaType<Pattern> = new IotaType('Pattern')
  public static readonly GARBAGE: IotaType<Iota> = new IotaType('Garbage')
  public static readonly VECTOR: IotaType<Vector3> = new IotaType('Vector')
  public static readonly JUMP: IotaType<Continuation> = new IotaType('Jump')
  public static readonly STRING: IotaType<String> = new IotaType('String')
  public static readonly IOTA_TYPE: IotaTypeType = new IotaType('Iota Type')
  public static readonly ENTITY_TYPE: IotaType<EntityType> = new IotaType('Entity Type')
}

export class Continuation implements Iota {
  constructor(public readonly cont: readonly ContinuationFrame[]) { }

  isTruthy(): boolean {
    return true
  }

  equals(that: Iota): boolean {
    // TODO: check for equality within ContinuationFrame
    return that instanceof Continuation
      && this.cont.length === that.cont.length
      && this.cont.every((a, i) => a === that.cont[i])
  }

  color(): number {
    return 0xCC0000
  }

  display(): string[] {
    return ['[', 'Jump', ']']
  }

  toString(): string {
    return '[Jump]'
  }

  execute(vm: VM): CastResult {
    return vm.executeJump(this.cont)
  }

  type(): IotaType<Continuation> {
    return IotaType.JUMP
  }
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

  type(): IotaType<Boolean> {
    return IotaType.BOOLEAN
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

  type(): IotaType<Double> {
    return IotaType.DOUBLE
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

  type(): IotaType<String> {
    return IotaType.STRING
  }
}

export type PossibleVector3
  = | { readonly x: number, readonly y: number, readonly z: number }
    | [number, number, number]

export class Vector3 implements Iota {
  public static ZERO: Vector3 = new Vector3(0, 0, 0)
  public static X: Vector3 = new Vector3(1, 0, 0)
  public static Y: Vector3 = new Vector3(0, 1, 0)
  public static Z: Vector3 = new Vector3(0, 0, 1)
  public static NEG_X: Vector3 = new Vector3(-1, 0, 0)
  public static NEG_Y: Vector3 = new Vector3(0, -1, 0)
  public static NEG_Z: Vector3 = new Vector3(0, 0, -1)

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

  type(): IotaType<Vector3> {
    return IotaType.VECTOR
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

  type(): IotaType<EntityType> {
    return IotaType.ENTITY_TYPE
  }
}

export class Entity implements Iota {
  constructor(
    public readonly entity_type: EntityType,
    public name: string = entity_type.name,
    public properties: EntityProps = {},
  ) {
    this.properties = { ...entity_type.properties, ...this.properties }
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

  type(): IotaType<Entity> {
    return IotaType.ENTITY
  }
}

export class Pattern implements Iota {
  public readonly pattern: HexPattern

  public constructor(
    pattern: HexPattern | string,
    public readonly name: string,
    public readonly execute: Action,
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

  type(): IotaType<Pattern> {
    return IotaType.PATTERN
  }
}

export class List implements Iota {
  public static EMPTY: List = new List([])

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

  type(): IotaType<List> {
    return IotaType.LIST
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
  type(): IotaType<Iota> {
    return IotaType.GARBAGE
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
  type(): IotaType<Iota> {
    return IotaType.NULL
  },
}

export const Player = new EntityType('Player', { height: 1.8 })
