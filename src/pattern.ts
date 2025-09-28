/**
 * Taken from:
 * https://github.com/FallingColors/HexMod/blob/e1ad4b316dd1e8f1f1300ee95bdbf796e8ebcad1/Common/src/main/java/at/petrak/hexcasting/api/casting/eval/ResolvedPatternType.kt#L5
 */
export class ResolvedPatternType {
  private constructor(
    public readonly name: string,
    public readonly color: number,
    public readonly fadeColor: number,
    public readonly success: boolean,
  ) { }

  public static readonly UNRESOLVED = new ResolvedPatternType('UNRESOLVED', 0x7F7F7F, 0xCCCCCC, false)
  public static readonly EVALUATED = new ResolvedPatternType('EVALUATED', 0x7385DE, 0xFECBE6, true)
  public static readonly ESCAPED = new ResolvedPatternType('ESCAPED', 0xDDCC73, 0xFFFAE5, true)
  public static readonly UNDONE = new ResolvedPatternType('UNDONE', 0xB26B6B, 0xCCA88E, true)
  public static readonly ERRORED = new ResolvedPatternType('ERRORED', 0xDE6262, 0xFFC7A0, false)
  public static readonly INVALID = new ResolvedPatternType('INVALID', 0xB26B6B, 0xCCA88E, false)
}

export enum HexDir {
  NORTH_EAST, EAST, SOUTH_EAST, SOUTH_WEST, WEST, NORTH_WEST,
}
const dirDelta: { [key in HexDir]: [number, number] } = [
  [1, -1],
  [1, 0],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [0, -1],
]

export enum HexAngle {
  FORWARD, RIGHT, RIGHT_BACK, BACK, LEFT_BACK, LEFT,
}

const SQRT_3 = Math.sqrt(3)

export type PossibleHexCoord = { q: number, r: number } | [number, number]
export type PossibleHexDir = HexDir | PossibleHexCoord
export type PossibleHexPattern = string | HexPattern

export interface Vector { x: number, y: number }
export type PossibleVector = Vector | [number, number]

function unpackCoord(dir: PossibleHexDir): [number, number] {
  if (typeof dir === 'number') {
    return dirDelta[dir]
  }
  else if (Array.isArray(dir)) {
    return dir
  }
  else {
    return [dir.q, dir.r]
  }
}

function unpackVector(vec: PossibleVector): [number, number] {
  if (Array.isArray(vec)) {
    return vec
  }
  else {
    return [vec.x, vec.y]
  }
}

type Constructor<Args extends any[], Out> = { new(...args: Args): Out } | ((...args: Args) => Out)
export type VectorConstructor<T> = Constructor<[number, number], T>

function isClass<Args extends any[], Out>(v: Constructor<Args, Out>): v is { new(...args: Args): Out } {
  return v.prototype
    && v.prototype.constructor
    && typeof v.prototype.constructor === 'function'
    && v.prototype.constructor.toString().startsWith('class')
}

export class HexCoord {
  public static ORIGIN: HexCoord = new HexCoord()

  public readonly q: number
  public readonly r: number

  public constructor()
  public constructor(from: PossibleHexCoord)
  public constructor(q: number, r: number)

  public constructor(one?: PossibleHexCoord | number, two?: number) {
    if (one === undefined) {
      this.q = 0
      this.r = 0
    }
    else if (typeof one === 'number') {
      this.q = one
      this.r = two!
    }
    else if (Array.isArray(one)) {
      this.q = one[0]
      this.r = one[1]
    }
    else {
      this.q = one.q
      this.r = one.r
    }
  }

  public static snap(vec: PossibleVector): HexCoord {
    const [x, y] = unpackVector(vec)

    let qf = SQRT_3 / 3 * x - 1 / 3 * y
    let rf = 2 / 3 * y

    const q = Math.round(qf)
    const r = Math.round(rf)
    qf -= q
    rf -= r

    if (Math.abs(q) >= Math.abs(r)) {
      return new HexCoord(q + Math.round(qf + 0.5 * rf), r)
    }
    else {
      return new HexCoord(q, r + Math.round(rf + 0.5 * qf))
    }
  }

  public add(dir: PossibleHexDir): HexCoord {
    const [dq, dr] = unpackCoord(dir)
    return new HexCoord(this.q + dq, this.r + dr)
  }

  public point(): Vector
  public point<T>(constructor: VectorConstructor<T>): T

  public point<T>(constructor?: VectorConstructor<T>): T | Vector {
    const x = SQRT_3 * this.q + SQRT_3 / 2 * this.r
    const y = 1.5 * this.r

    if (constructor === undefined) {
      return { x, y }
    }
    else if (isClass(constructor)) {
      return new constructor(x, y)
    }
    else {
      return constructor(x, y)
    }
  }

  public clone(): HexCoord {
    return new HexCoord(this)
  }

  public equals(other: HexCoord): boolean {
    return this.q === other.q && this.r === other.r
  }

  /**
   * Taken from:
   * https://github.com/FallingColors/HexMod/blob/e1ad4b316dd1e8f1f1300ee95bdbf796e8ebcad1/Common/src/main/java/at/petrak/hexcasting/api/casting/math/HexCoord.kt#L41
   */
  public range(radius: number): HexCoord[] {
    let q = -radius
    let r = Math.max(-radius, 0)

    const out: HexCoord[] = []
    while (r <= radius + Math.min(0, -q) || q < radius) {
      if (r > radius + Math.min(0, -q)) {
        q++
        r = -radius + Math.max(0, -q)
      }
      out.push(new HexCoord(this.q + q, this.r + r))
      r++
    }
    return out
  }
}

export class HexPattern {
  public readonly startDir: HexDir
  public readonly angles: HexAngle[]

  public constructor(from: PossibleHexPattern)
  public constructor(startDir: HexDir, angles: HexAngle[])

  public constructor(one: HexDir | PossibleHexPattern, two?: HexAngle[]) {
    if (typeof one === 'number') {
      this.startDir = one
      this.angles = two!
    }
    else if (typeof one === 'string') {
      const parsed = HexPattern.parse(one)
      this.startDir = parsed.startDir
      this.angles = parsed.angles
    }
    else {
      this.startDir = one.startDir
      this.angles = [...one.angles]
    }
  }

  public static parse(str: string): HexPattern {
    const [l, r] = str.split(',')

    let startDir: HexDir
    switch (l) {
      case 'northeast': startDir = HexDir.NORTH_EAST; break
      case 'east': startDir = HexDir.EAST; break
      case 'southeast': startDir = HexDir.SOUTH_EAST; break
      case 'northwest': startDir = HexDir.NORTH_WEST; break
      case 'west': startDir = HexDir.WEST; break
      case 'southwest': startDir = HexDir.SOUTH_WEST; break
      default: throw new Error(`Unknown direction ${l}`)
    }

    const angles = Array.from(r).map((c) => {
      switch (c) {
        case 'w': return HexAngle.FORWARD
        case 'e': return HexAngle.RIGHT
        case 'd': return HexAngle.RIGHT_BACK
        case 's': return HexAngle.BACK
        case 'a': return HexAngle.LEFT_BACK
        case 'q': return HexAngle.LEFT
        default: throw new Error(`Unknown angle ${c}`)
      }
    })

    return new HexPattern(startDir, angles)
  }

  public toString(): string {
    let s = ''

    switch (this.startDir) {
      case HexDir.NORTH_EAST: s += 'northeast'; break
      case HexDir.EAST: s += 'east'; break
      case HexDir.SOUTH_EAST: s += 'southeast'; break
      case HexDir.SOUTH_WEST: s += 'southwest'; break
      case HexDir.WEST: s += 'west'; break
      case HexDir.NORTH_WEST: s += 'northwest'; break
    }

    s += ','

    for (const angle of this.angles) {
      switch (angle) {
        case HexAngle.FORWARD: s += 'w'; break
        case HexAngle.RIGHT: s += 'e'; break
        case HexAngle.RIGHT_BACK: s += 'd'; break
        case HexAngle.BACK: s += 's'; break
        case HexAngle.LEFT_BACK: s += 'a'; break
        case HexAngle.LEFT: s += 'q'; break
      }
    }

    return s
  }

  public bounds(): [HexCoord, HexCoord] {
    const coords = this.coords()

    const minQ = Math.min(...coords.map(c => c.q))
    const maxQ = Math.max(...coords.map(c => c.q))
    const minR = Math.min(...coords.map(c => c.r))
    const maxR = Math.max(...coords.map(c => c.r))

    return [
      new HexCoord(minQ, minR),
      new HexCoord(maxQ, maxR),
    ]
  }

  public reversed(): HexPattern {
    const totalAngle = this.angles.reduce((a, b) => a + b)
    const reverseDir = (this.startDir + totalAngle + 3) % 6
    const reverseAngles = this.angles.map(a => (a * 5) % 6).reverse()
    return new HexPattern(reverseDir, reverseAngles)
  }

  public mirrored(): HexPattern {
    const mirrorDir = 5 - this.startDir
    const mirrorAngles = this.angles.map(a => (a * 5) % 6)
    return new HexPattern(mirrorDir, mirrorAngles)
  }

  public rotated(angle: HexAngle): HexPattern {
    const rotatedDir = (this.startDir + angle) % 6
    const rotatedAngles = [...this.angles]
    return new HexPattern(rotatedDir, rotatedAngles)
  }

  public equals(other: HexPattern): boolean {
    // patterns are equal irrespective of orientation
    return this.angles.length === other.angles.length && this.angles.every((a, i) => a === other.angles[i])
  }

  public coords(): HexCoord[] {
    let currentCoord = HexCoord.ORIGIN
    let currentDir = this.startDir

    const coords: HexCoord[] = [currentCoord]
    currentCoord = currentCoord.add(currentDir)
    coords.push(currentCoord)

    for (const angle of this.angles) {
      currentDir = (currentDir + angle) % 6
      currentCoord = currentCoord.add(currentDir)
      coords.push(currentCoord)
    }

    return coords
  }

  public points(): Vector[]
  public points<T>(constructor: VectorConstructor<T>): T[]

  public points<T>(constructor?: VectorConstructor<T>): (T | Vector)[] {
    return this.coords().map(c => c.point(constructor!) as (T | Vector))
  }
}
