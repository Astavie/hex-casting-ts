import type { Entity, Environment } from '../src'
import { expect, it } from 'vitest'
import { HERMES_GAMBIT, Iota, Player, THOTHS_GAMBIT, VM } from '../src'

it('thoths', () => {
  const me = Player.new('Astavie')
  const env: Environment = {
    caster(): Entity {
      return me
    },
  }

  const iotas = Iota.patterns(0, [HERMES_GAMBIT], [1, 2, 3], THOTHS_GAMBIT)
  const end = VM.START.run(env, ...iotas)
  expect(end.stack).toEqual([0, [0, 1, 0, 2, 0, 3]].map(Iota.from))
  expect(end.parenthesized).toEqual([])
})
