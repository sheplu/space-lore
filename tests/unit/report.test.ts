import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { STYLE_GUIDE } from '../../src/style/guide.ts'
import { renderReport } from '../../src/validate/report.ts'

describe('STYLE_GUIDE', () => {
  it('is English and prescriptive', () => {
    assert.equal(STYLE_GUIDE.language, 'en')
    assert.ok(STYLE_GUIDE.tone.length >= 2)
    assert.ok(STYLE_GUIDE.donts.length >= 3)
    assert.ok(STYLE_GUIDE.descriptionRecipe.length >= 2)
  })

  it('declares length bounds consistent with schemas', () => {
    const [min, max] = STYLE_GUIDE.lengths.nameChars
    assert.equal(min, 3)
    assert.equal(max, 60)
  })
})

describe('renderReport', () => {
  it('summarizes valid and invalid files with issue lines', () => {
    const text = renderReport({
      ok: false,
      files: [
        { file: 'a.json', kind: 'galaxy', ok: true, issues: [] },
        { file: 'b.json', kind: null, ok: false, issues: [{ file: 'b.json', message: 'boom' }] },
      ],
    })
    assert.match(text, /ok   a\.json \[galaxy\]/)
    assert.match(text, /FAIL b\.json/)
    assert.match(text, /- boom/)
    assert.match(text, /1\/2 files valid/)
  })

  it('reports a fully valid run', () => {
    const text = renderReport({ ok: true, files: [{ file: 'a.json', kind: 'galaxy', ok: true, issues: [] }] })
    assert.match(text, /1\/1 files valid/)
    assert.doesNotMatch(text, /FAIL/)
  })
})
