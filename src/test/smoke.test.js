import { describe, it, expect } from 'vitest'

describe('vitest-asennus', () => {
  it('matematiikka toimii', () => {
    expect(1 + 1).toBe(2)
  })

  it('jest-dom matcherit ovat ladattuna', () => {
    const div = document.createElement('div')
    div.textContent = 'hei'
    expect(div).toHaveTextContent('hei')
  })
})
