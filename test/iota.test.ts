import { describe, expect, it } from 'vitest'
import { ARCS_REFL, CIRCLES_REFL, CONSIDERATION as CONSIDER, EntityType, EULERS_REFL, INTROSPECTION as INTRO, Iota, MINDS_REFL, NUMERICAL_REFL, Player, RETROSPECTION as RETRO, VACANT_REFL, Vector3, VECTOR_EXAL } from '../src'

describe('pattern shorthand', () => {
  it('vector', () => {
    expect(Iota.patterns(new Vector3(Math.PI * 2, Math.PI, Math.E)))
      .toEqual([CIRCLES_REFL, ARCS_REFL, EULERS_REFL, VECTOR_EXAL])
  })
})

describe('flatten pattern list', () => {
  it('empty', () => {
    expect(Iota.patterns([])).toEqual([INTRO, RETRO])
  })
  it('nested empty', () => {
    expect(Iota.patterns([[]])).toEqual([INTRO, INTRO, RETRO, RETRO])
  })
  it('list', () => {
    expect(Iota.patterns([MINDS_REFL])).toEqual([INTRO, MINDS_REFL, RETRO])
    expect(Iota.patterns([MINDS_REFL, MINDS_REFL])).toEqual([INTRO, MINDS_REFL, MINDS_REFL, RETRO])
  })
  it('nested list', () => {
    expect(Iota.patterns([[MINDS_REFL]])).toEqual([INTRO, INTRO, MINDS_REFL, RETRO, RETRO])
    expect(Iota.patterns([[MINDS_REFL, MINDS_REFL]])).toEqual([INTRO, INTRO, MINDS_REFL, MINDS_REFL, RETRO, RETRO])
  })
  it('escaping', () => {
    for (const pattern of [INTRO, RETRO, CONSIDER]) {
      expect(Iota.patterns(pattern)).toEqual([pattern])
      expect(Iota.patterns([pattern])).toEqual([INTRO, CONSIDER, pattern, RETRO])
      expect(Iota.patterns([[pattern]])).toEqual([INTRO, INTRO, CONSIDER, CONSIDER, CONSIDER, pattern, RETRO, RETRO])
    }
  })
})

describe('iota to string', () => {
  it('primitives', () => {
    expect(Iota.from(true).toString()).toEqual('True')
    expect(Iota.from(false).toString()).toEqual('False')
    expect(Iota.from(0).toString()).toEqual('0.00')
    expect(Iota.from(0.5).toString()).toEqual('0.50')
    expect(Iota.from(1).toString()).toEqual('1.00')
    expect(Iota.from(0.999).toString()).toEqual('1.00')
    expect(Iota.from(1.001).toString()).toEqual('1.00')
    expect(Iota.from('').toString()).toEqual('""')
    expect(Iota.from('abc').toString()).toEqual('"abc"')
    expect(Iota.from(null).toString()).toEqual('NULL')
    expect(Iota.from(undefined).toString()).toEqual('GARBAGE')
  })
  it('vec3', () => {
    expect(Vector3.ZERO.toString()).toEqual('(0.00, 0.00, 0.00)')
    expect(new Vector3(1, 2, 3).toString()).toEqual('(1.00, 2.00, 3.00)')
    expect(new Vector3(0.999, 1, 1.001).toString()).toEqual('(1.00, 1.00, 1.00)')
  })
  it('entity type', () => {
    expect(Player.toString()).toEqual('Player Type')
    expect(new EntityType('abc').toString()).toEqual('abc Type')
  })
  it('entity', () => {
    expect(Player.new().toString()).toEqual('Player')
    expect(Player.new('Astavie').toString()).toEqual('Astavie')
  })
  it('pattern', () => {
    expect(INTRO.toString()).toEqual('<w,qqq>')
    expect(VACANT_REFL.toString()).toEqual('<ne,qqaeaae>')
  })
  it('list', () => {
    expect(Iota.from([]).toString()).toEqual('[]')
    expect(Iota.from([0, 0]).toString()).toEqual('[0.00, 0.00]')
    expect(Iota.from([0, INTRO]).toString()).toEqual('[0.00<w,qqq>]')
    expect(Iota.from([INTRO, 0]).toString()).toEqual('[<w,qqq>0.00]')
    expect(Iota.from([INTRO, RETRO]).toString()).toEqual('[<w,qqq><e,eee>]')
  })
  it('simple numbers', () => {
    expect(NUMERICAL_REFL(0).toString()).toEqual('<se,aqaa>')
    expect(NUMERICAL_REFL(69).toString()).toEqual('<se,aqaaedweaaq>')
    expect(NUMERICAL_REFL(-420).toString()).toEqual('<ne,deddeaqwaawaa>')
  })
})
