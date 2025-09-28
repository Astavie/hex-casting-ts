import { describe, expect, it } from 'vitest'
import { CONSIDER, EntityType, INTRO, Iota, MINDS_REFL, Player, RETRO, SINGLES_PURIF, VACANT_REFL, Vector3 } from '../src'

describe('flatten pattern list', () => {
  it('empty', () => {
    expect(Iota.patterns([])).toEqual([VACANT_REFL])
  })
  it('nested empty', () => {
    expect(Iota.patterns([[]])).toEqual([VACANT_REFL, SINGLES_PURIF])
  })
  it('list', () => {
    expect(Iota.patterns([MINDS_REFL])).toEqual([INTRO, MINDS_REFL, RETRO])
    expect(Iota.patterns([MINDS_REFL, MINDS_REFL])).toEqual([INTRO, MINDS_REFL, MINDS_REFL, RETRO])
  })
  it('nested list', () => {
    expect(Iota.patterns([[MINDS_REFL]])).toEqual([INTRO, MINDS_REFL, RETRO, SINGLES_PURIF])
    expect(Iota.patterns([[MINDS_REFL, MINDS_REFL]])).toEqual([INTRO, MINDS_REFL, MINDS_REFL, RETRO, SINGLES_PURIF])
  })
  it('escaping', () => {
    for (const pattern of [INTRO, RETRO, CONSIDER]) {
      expect(Iota.patterns(pattern)).toEqual([pattern])
      expect(Iota.patterns([pattern])).toEqual([CONSIDER, pattern, SINGLES_PURIF])
      expect(Iota.patterns([pattern, MINDS_REFL])).toEqual([INTRO, CONSIDER, pattern, MINDS_REFL, RETRO])
      expect(Iota.patterns([[pattern]])).toEqual([CONSIDER, pattern, SINGLES_PURIF, SINGLES_PURIF])
      expect(Iota.patterns([[pattern, MINDS_REFL]])).toEqual([INTRO, CONSIDER, pattern, MINDS_REFL, RETRO, SINGLES_PURIF])
      expect(Iota.patterns([[pattern], MINDS_REFL])).toEqual([INTRO, CONSIDER, CONSIDER, CONSIDER, pattern, SINGLES_PURIF, MINDS_REFL, RETRO])
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
})
