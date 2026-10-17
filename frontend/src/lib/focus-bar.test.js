import { describe, expect, it } from 'vitest'
import { focusTarget } from './focus-bar.js'

const row = (done = false, extra = {}) => ({ w: 60, r: 5, done, ...extra })
const warm = (done = false) => row(done, { phase: 'warmup' })

describe('the set the Done bar ticks', () => {
  it('the first unticked set, numbered among the work sets', () => {
    const entries = [{ id: 'a', sets: [warm(true), row(true), row(), row()] }]
    expect(focusTarget(entries, [0])).toEqual({ idx: 0, i: 2, warmup: false, n: 2, of: 3, tickable: true })
  })

  it('a warm-up is numbered among the warm-ups', () => {
    const entries = [{ id: 'a', sets: [warm(), warm(), row()] }]
    expect(focusTarget(entries, [0])).toMatchObject({ i: 0, warmup: true, n: 1, of: 2 })
  })

  it('in a superset, round by round', () => {
    const entries = [{ id: 'a', sets: [row(true), row()] }, { id: 'b', sets: [row(), row()] }]
    expect(focusTarget(entries, [0, 1])).toMatchObject({ idx: 1, i: 0 })
    entries[1].sets[0].done = true
    expect(focusTarget(entries, [0, 1])).toMatchObject({ idx: 0, i: 1 })
  })

  it('a member with fewer sets drops out of the later rounds', () => {
    const entries = [{ id: 'a', sets: [row(true)] }, { id: 'b', sets: [row(true), row()] }]
    expect(focusTarget(entries, [0, 1])).toMatchObject({ idx: 1, i: 1 })
  })

  it('nothing left: null', () => {
    expect(focusTarget([{ id: 'a', sets: [row(true)] }], [0])).toBe(null)
    expect(focusTarget([], [])).toBe(null)
  })

  it('a per-side set, a hold or cardio is not one tap', () => {
    const side = { sides: { L: { w: 10, r: 8 }, R: { w: 10, r: 8 } } }
    expect(focusTarget([{ id: 'a', sets: [row(false, side)] }], [0]).tickable).toBe(false)
    expect(focusTarget([{ id: 'a', sets: [row()] }], [0], () => 'time').tickable).toBe(false)
  })
})
