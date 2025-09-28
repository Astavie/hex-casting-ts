import { describe, expect, it } from 'vitest'
import { HexCoord } from '../src'

describe('vector constructor', () => {
  class VectorTest {
    constructor(public x: number, public y: number) { }
  }

  it('none', () => {
    expect(HexCoord.ORIGIN.point())
      .toEqual({ x: 0, y: 0 })
  })
  it('class', () => {
    expect(HexCoord.ORIGIN.point(VectorTest))
      .toEqual(new VectorTest(0, 0))
  })
  it('arrow function', () => {
    expect(HexCoord.ORIGIN.point((x, y) => x + y))
      .toEqual(0)
  })
  it('async arrow function', () => {
    expect(HexCoord.ORIGIN.point(async (x, y) => x + y))
      .toEqual(Promise.resolve(0))
  })
  it('function', () => {
    expect(HexCoord.ORIGIN.point((x, y) => { return x + y }))
      .toEqual(0)
  })
  it('async function', () => {
    expect(HexCoord.ORIGIN.point(async (x, y) => { return x + y }))
      .toEqual(Promise.resolve(0))
  })
  it('generator function', () => {
    expect(HexCoord.ORIGIN.point(function* (x, y) { return x + y }).next())
      .toEqual({ done: true, value: 0 })
  })
  it('async generator function', () => {
    expect(HexCoord.ORIGIN.point(async function* (x, y) { return x + y }).next())
      .toEqual(Promise.resolve({ done: true, value: 0 }))
  })
})
