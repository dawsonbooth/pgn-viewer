import type { Block } from './chess/richtext'

export const samplePgn = `[Event "Fork exercise"]
[White "?"]
[Black "?"]
[FEN "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4"]
[SetUp "1"]

{ White to play. } 4. Ng5 d5 5. exd5 Nxd5 (5... Na5 6. Bb5+ c6 7. dxc6 bxc6 8. Be2 { Main line of the Two Knights. }) 6. Nxf7 $1 { [%cal Gg5f7] The fried liver. } Kxf7 7. Qf3+ Ke6 8. Nc3 *

[Event "F/S Return Match"]
[Site "Belgrade, Serbia JUG"]
[Date "1992.11.04"]
[Round "29"]
[White "Fischer, Robert J."]
[Black "Spassky, Boris V."]
[Result "1/2-1/2"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 {This opening is called the Ruy Lopez.} 3... a6
4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7
11. c4 c6 12. cxb5 axb5 13. Nc3 Bb7 14. Bg5 b4 15. Nb1 h6 16. Bh4 c5 17. dxe5
Nxe4 18. Bxe7 Qxe7 19. exd6 Qf6 20. Nbd2 Nxd6 21. Nc4 Nxc4 22. Bxc4 Nb6
23. Ne5 Rae8 24. Bxf7+ Rxf7 25. Nxf7 Rxe1+ 26. Qxe1 Kxf7 27. Qe3 Qg5 28. Qxg5
hxg5 29. b3 Ke6 30. a3 Kd6 31. axb4 cxb4 32. Ra5 Nd5 33. f3 Bc8 34. Kf2 Bf5
35. Ra7 g6 36. Ra6+ Kc5 37. Ke1 Nf4 38. g3 Nxh3 39. Kd2 Kb5 40. Rd6 Kc5 41. Ra6
Nf2 42. g4 Bd3 43. Re6 1/2-1/2

[Event "Broken"]
1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0
`

// The markup course sites write into PGNs: a chess.com lesson (hints, wrong-move replies,
// effects, a wrong answer as a "?" side line), a Chessable chapter (escaped brackets, a
// header, a diagram, a null move) and a lesson position without kings.
export const annotatedPgn = `[Event "Pirc lesson"]
[Site "chess.com"]
[FEN "2krr3/pp3p1p/1n4p1/q4n2/8/2P2N1P/P1P1QPP1/R1B1R1K1 w - - 0 16"]
[SetUp "1"]

{ [%csl Ge1,Ge8][%cal Ye1e8] How can White gain an advantage? } 16. Qxe8
{ [%wrong Black is winning. Try
again.][%hint Trade the queen for two rooks.][%c_effect e8;square;e8;type;Brilliant;persistent;true] }
( 16. Qf1 $2 { [%c_effect f1;square;f1;type;Mistake;persistent;true] } 16... Qxc3
{ Black is OK. Try again. } ) 16... Rxe8 { Good start! } 17. Rxe8+ Kd7 *

[Event "Traps course"]
[Site "chessable.com"]

{ @@HeaderStart@@Opening traps@@HeaderEnd@@ The **first** trap @@StartBracket@@of many@@EndBracket@@:

@@StartFEN@@rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2@@EndFEN@@ }
1. e4 e5 2. Nf3 $1 { , developing. [%evp 0,2,20,25,30] } ( 2. -- { A pass: } 2... Nf6 )
2... d6 $6 $14 *

[Event "Bishop lesson"]
[Variant "illegal"]
[SetUp "1"]
[FEN "8/8/8/8/8/8/5PPb/5K2 w - - 0 1"]

1. g3 -- 2. Kg2 *
`

let counter = 0

// unique header per call so each test gets its own fingerprint (and IndexedDB entry)
export function uniqueSample(pgn = samplePgn): File {
  const id = `${Date.now().toString(36)}-${counter++}-${Math.random().toString(36).slice(2)}`
  return new File([`[Fixture "${id}"]\n${pgn}`], `sample-${id}.pgn`)
}

// The words of comment blocks without their markup: paragraphs apart by a blank line,
// line breaks as newlines, diagrams left out.
export function plainText(blocks: readonly Block[]): string {
  return blocks
    .map(b =>
      b.spans
        .map(s => (s.kind === 'break' ? '\n' : s.kind === 'diagram' ? '' : s.text))
        .join('')
        .trim(),
    )
    .filter(Boolean)
    .join('\n\n')
}
