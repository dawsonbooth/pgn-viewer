import { describe, expect, it } from 'vitest'
import { plainText } from '../test-utils'
import { parseRichText, type Block } from './richtext'

const text = (s: string) => plainText(parseRichText(s))
const kinds = (blocks: Block[]) => blocks.map(b => b.kind)

describe('paragraphs and lines', () => {
  it('splits on blank lines and joins hard-wrapped lines', () => {
    const blocks = parseRichText('Black sacrificed a piece. How can you win\nit back?\n\nSecond.')
    expect(kinds(blocks)).toEqual(['paragraph', 'paragraph'])
    expect(text('one\ntwo\n\n\nthree')).toBe('one two\n\nthree')
  })

  it('keeps the line breaks of a list, but not of a wrapped move', () => {
    const list = parseRichText('This is the case when:\n1. the position is open\n2. it is not')
    expect(list[0]!.spans.filter(s => s.kind === 'break')).toHaveLength(2)
    expect(text('after\n1. e4 e5 the game')).toBe('after 1. e4 e5 the game')
    expect(text('Plans:\n• attack\n● defend\n✅ win')).toBe('Plans:\n• attack\n● defend\n✅ win')
  })

  it('puts parentheticals an export lifted onto their own lines back in the sentence', () => {
    expect(text('find the bishop move\n\n(s)\n\n. This chapter')).toBe(
      'find the bishop move (s). This chapter',
    )
    expect(text('remember the LPDO\n\n(Loose pieces drop off)\n\ncoined by Nunn')).toBe(
      'remember the LPDO (Loose pieces drop off) coined by Nunn',
    )
    expect(text('Dortmund\n\n(Germany)\n\n(1)\n\n, 1993')).toBe('Dortmund (Germany) (1), 1993')
    // a sentence that ended keeps its parenthetical apart, and "..." opens a Black move
    expect(text('It is over.\n\n(Analysis by X)')).toBe('It is over.\n\n(Analysis by X)')
    expect(text('White wins.\n\n...Nf6 is no better')).toBe('White wins.\n\n...Nf6 is no better')
  })
})

describe('Chessable and chess.com markers', () => {
  it('reads headers, quotes, links and diagrams', () => {
    const blocks = parseRichText(
      '@@HeaderStart@@Bishop Moves@@HeaderEnd@@\n\nFind the move.' +
        ' @@StartBlockQuote@@The King is a fighting piece.@@EndBlockQuote@@' +
        ' See @@LinkStart@@https://example.com/a@b@@LinkEnd@@ or' +
        ' @@StartFEN@@8/8/8/8/8/8/5PPb/5K2 w - - 0 1@@EndFEN@@ next',
    )
    expect(kinds(blocks)).toEqual(['heading', 'paragraph', 'quote', 'paragraph'])
    expect(plainText([blocks[0]!])).toBe('Bishop Moves')
    const spans = blocks[3]!.spans
    expect(spans).toContainEqual({
      kind: 'link',
      href: 'https://example.com/a@b',
      text: 'https://example.com/a@b',
    })
    expect(spans).toContainEqual({ kind: 'diagram', fen: '8/8/8/8/8/8/5PPb/5K2 w - - 0 1' })
  })

  it('drops markers it has no use for', () => {
    expect(text('a @@SomethingNew@@ b')).toBe('a b')
  })
})

describe('HTML', () => {
  it('bolds strong, breaks on br, and keeps the text of links', () => {
    const [p] = parseRichText(
      'play <strong>dxc4</strong> and then<br/>see <a class="commentMoveSmall" href="/variation/x">this</a>',
    )
    expect(p!.spans).toEqual([
      { kind: 'text', text: 'play ' },
      { kind: 'text', text: 'dxc4', bold: true },
      { kind: 'text', text: ' and then' },
      { kind: 'break' },
      { kind: 'text', text: 'see this' },
    ])
    expect(kinds(parseRichText('one <br/><br/> two'))).toEqual(['paragraph', 'paragraph'])
  })

  it('leaves angle brackets that are not markup alone', () => {
    expect(text('<Crowd cheering> <NO SIGNAL>')).toBe('<Crowd cheering> <NO SIGNAL>')
  })
})

describe('Markdown', () => {
  it('reads headings, emphasis, links, bullets and rules', () => {
    const blocks = parseRichText(
      '### What is covered\n\n* **Accepted** (4...cxb2)\n* ***Declined***\n\n---\n\n' +
        'The **_1.e4_** player, [guide](https://go.example/e4) by calcu_later.',
    )
    expect(kinds(blocks)).toEqual(['heading', 'paragraph', 'paragraph'])
    expect(blocks[1]!.spans).toEqual([
      { kind: 'text', text: '• ' },
      { kind: 'text', text: 'Accepted', bold: true },
      { kind: 'text', text: ' (4...cxb2)' },
      { kind: 'break' },
      { kind: 'text', text: '• ' },
      { kind: 'text', text: 'Declined', bold: true, italic: true },
    ])
    expect(blocks[2]!.spans).toEqual([
      { kind: 'text', text: 'The ' },
      { kind: 'text', text: '1.e4', bold: true, italic: true },
      { kind: 'text', text: ' player, ' },
      { kind: 'link', text: 'guide', href: 'https://go.example/e4' },
      { kind: 'text', text: ' by calcu_later.' },
    ])
  })

  it('only ever links to the web', () => {
    for (const src of [
      '[x](javascript:alert(1))',
      '@@LinkStart@@javascript:alert(1)@@LinkEnd@@',
      '@@LinkStart@@data:text/html,hi@@LinkEnd@@',
    ])
      expect(
        parseRichText(src)
          .flatMap(b => b.spans)
          .some(s => s.kind === 'link'),
      ).toBe(false)
    expect(parseRichText('see https://lichess.org/study/x.').flatMap(b => b.spans)).toContainEqual({
      kind: 'link',
      href: 'https://lichess.org/study/x',
      text: 'https://lichess.org/study/x',
    })
  })
})
