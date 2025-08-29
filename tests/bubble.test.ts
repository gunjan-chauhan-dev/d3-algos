import { describe, it, expect } from 'vitest'
import { generateStepsBubble } from '../src/algorithms/sorting/bubble'

describe('bubble steps', () => {
  it('produces steps for a small array', () => {
    const steps = generateStepsBubble([3,2,1])
    expect(steps.length).toBeGreaterThan(0)
  })
})