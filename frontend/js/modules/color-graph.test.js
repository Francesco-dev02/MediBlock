import { GridBoard } from "./grid-board.js"
import {
    collectRemovalGroup,
    findAnchoredEmpties,
    findOrphanedEmpties,
    groupOrphans,
    enforceRemovability,
} from "./color-graph.js"

const log = (typeof print !== "undefined") ? print : console.log
const ROWS = 96, COLS = 96, H = 10

let pass = 0, fail = 0
function check(name, cond, extra){
    if (cond) { pass++; log("  ok   " + name) }
    else { fail++; log("  FAIL " + name + (extra ? "  -> " + extra : "")) }
}

let idc = 0
// rows: top-first array of arrays of {w, c, width}
function makeBoard(rows){
    const board = new GridBoard(ROWS, COLS)
    const bottom = ROWS - H
    rows.forEach((row, i) => {
        const r = bottom - (rows.length - 1 - i) * H
        let col = 0
        for (const spec of row) {
            const b = { id: "b" + (idc++), word: spec.w ?? null, color: spec.c,
                        row: r, col, width: spec.width ?? 8, height: H }
            board.add(b)
            col += b.width
        }
    })
    return board
}
const byWord = (board, w) => board.getBlocks().find(b => b.word === w)
const ids = arr => arr.map(b => b.id).sort().join(",")

// ---- 1. word blocks are walls, not stepping stones
{
    log("1. word blocks are walls")
    const board = makeBoard([[{w:"A",c:"red"}, {w:null,c:"red"}, {w:"B",c:"red"}, {w:null,c:"red"}]])
    const [A, e, B, e2] = board.getBlocks()
    const g = collectRemovalGroup(board, A)
    check("group is {A, e}", ids(g) === ids([A, e]), ids(g))
    check("excludes the far empty", !g.includes(e2))
    check("excludes the second word", !g.includes(B))
}

// ---- 2. the bug being fixed: same-color empties with no same-color word
{
    log("2. cluster of empties with no word of their color")
    const board = makeBoard([[{w:"A",c:"blue"}, {w:null,c:"red"}, {w:null,c:"red"}]])
    const orphans = findOrphanedEmpties(board)
    check("both red empties are orphaned", orphans.length === 2, "got " + orphans.length)
    // the old local rule ("has a same-color neighbour") would have passed both
    const oldRule = board.getBlocks().filter(b =>
        !b.word && !board.getNeighbors(b).some(n => n.color === b.color))
    check("old local rule missed them", oldRule.length === 0)
}

// ---- 3. recolor rather than repair
{
    log("3. recolor toward a bordering word block")
    const board = makeBoard([[{w:"A",c:"blue"}, {w:null,c:"red"}, {w:null,c:"red"}]])
    let repairs = 0
    const res = enforceRemovability(board, { repairBlock: () => { repairs++ } })
    const empties = board.getBlocks().filter(b => !b.word)
    check("no repair happened", repairs === 0)
    check("both empties are now blue", empties.every(b => b.color === "blue"),
          empties.map(b => b.color).join("/"))
    check("no orphans left", findOrphanedEmpties(board).length === 0)
    check("recolor was logged", res.recolored.length === 2)
}

// ---- 4. the whole component moves, not just the touching block
{
    log("4. whole-component recolor")
    const board = makeBoard([[{w:"A",c:"blue"}, {w:null,c:"red"}, {w:null,c:"red"}, {w:null,c:"red"}]])
    enforceRemovability(board, { repairBlock: () => { throw new Error("unexpected repair") } })
    const empties = board.getBlocks().filter(b => !b.word)
    check("all three empties recolored", empties.length === 3 && empties.every(b => b.color === "blue"),
          empties.map(b => b.color).join("/"))
}

// ---- 5. transitive tier: borrow from an anchored empty
{
    log("5. anchor through an already-anchored empty")
    //  A(green) | g(green anchored) | r(red orphan) ... no word block touches r
    const board = makeBoard([[{w:"A",c:"green"}, {w:null,c:"green"}, {w:null,c:"red"}]])
    let repairs = 0
    enforceRemovability(board, { repairBlock: () => { repairs++ } })
    const r = board.getBlocks()[2]
    check("no repair", repairs === 0)
    check("orphan took green", r.color === "green", r.color)
    check("no orphans left", findOrphanedEmpties(board).length === 0)
}

// ---- 6. repair fallback: one repair per stuck cluster, not one per block
{
    log("6. repair fallback on a board with no word blocks")
    const board = makeBoard([[{w:null,c:"red"}, {w:null,c:"red"}, {w:null,c:"red"}]])
    let repairs = 0
    enforceRemovability(board, { repairBlock: (b) => { repairs++; b.word = "W" + repairs; b.color = "gold" } })
    check("exactly one repair", repairs === 1, "got " + repairs)
    check("no orphans left", findOrphanedEmpties(board).length === 0)
    const empties = board.getBlocks().filter(b => !b.word)
    check("the other two stayed empty", empties.length === 2, "got " + empties.length)
    check("they recolored to the repaired block", empties.every(b => b.color === "gold"),
          empties.map(b => b.color).join("/"))
}

// ---- 7. a lone empty with no neighbours at all
{
    log("7. isolated empty block")
    const board = makeBoard([[{w:null,c:"red"}]])
    let repairs = 0
    enforceRemovability(board, { repairBlock: (b) => { repairs++; b.word = "X" } })
    check("exactly one repair", repairs === 1, "got " + repairs)
    check("no orphans left", findOrphanedEmpties(board).length === 0)
}

// ---- 8. idempotence
{
    log("8. no churn on an already-consistent board")
    const board = makeBoard([[{w:"A",c:"red"}, {w:null,c:"red"}, {w:"B",c:"blue"}, {w:null,c:"blue"}]])
    const r1 = enforceRemovability(board, { repairBlock: () => { throw new Error("unexpected repair") } })
    check("first run is a no-op", r1.recolored.length === 0 && r1.repaired.length === 0)
    check("and reports zero iterations", r1.iterations === 0, "got " + r1.iterations)
    const r2 = enforceRemovability(board, { repairBlock: () => { throw new Error("unexpected repair") } })
    check("second run is a no-op too", r2.recolored.length === 0 && r2.repaired.length === 0)
}

// ---- 9 / 10 / 11. randomised boards
{
    log("9-11. randomised boards (geometry, removal, termination)")
    let seed = 12345
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff
    const pick = a => a[Math.floor(rnd() * a.length)]

    let geomBad = 0, termBad = 0, orphanBad = 0, postRemovalBad = 0, gravityBad = 0, loopBad = 0, boards = 0

    for (let t = 0; t < 400; t++) {
        // deliberately include pathological shapes: no words at all, single colour
        const palette = t % 7 === 0 ? ["red"] : ["red", "blue", "green", "gold"]
        const wordChance = t % 5 === 0 ? 0 : 0.4
        const nRows = 1 + Math.floor(rnd() * 4)
        const rows = []
        let wc = 0
        for (let r = 0; r < nRows; r++) {
            const row = []
            let used = 0
            const n = 1 + Math.floor(rnd() * 5)
            for (let i = 0; i < n; i++) {
                const width = 8 + Math.floor(rnd() * 6)
                if (used + width > COLS) break
                used += width
                const isWord = rnd() < wordChance
                row.push({ w: isWord ? "W" + (wc++) : null, c: pick(palette), width })
            }
            if (row.length) rows.push(row)
        }
        if (!rows.length) continue
        boards++

        const board = makeBoard(rows)
        // rows are generated at independent widths, so settle first - the real
        // engine only ever runs the pass on a board gravity has finished with
        while (board.applyGravity().length !== 0) {}

        let n = 0
        const repairBlock = (b) => { b.word = "R" + (n++); b.color = pick(palette) }

        const before = new Map(board.getBlocks().map(b =>
            [b.id, b.row + ":" + b.col + ":" + b.width + ":" + b.height]))
        const res = enforceRemovability(board, { repairBlock })

        if (res.iterations > board.getBlocks().length) termBad++
        if (findOrphanedEmpties(board).length !== 0) orphanBad++
        for (const b of board.getBlocks()) {
            if (before.get(b.id) !== b.row + ":" + b.col + ":" + b.width + ":" + b.height) geomBad++
        }
        if (board.applyGravity().length !== 0) gravityBad++

        // removal on its own must preserve the invariant - gravity is the only
        // thing that should ever be able to break it
        const words = board.getBlocks().filter(b => b.word)
        if (words.length) {
            collectRemovalGroup(board, pick(words)).forEach(b => board.removeBlock(b))
            if (findOrphanedEmpties(board).length !== 0) postRemovalBad++

            // and the real game loop - remove, fall, repair - must come out clean
            while (board.applyGravity().length !== 0) {}
            enforceRemovability(board, { repairBlock })
            if (findOrphanedEmpties(board).length !== 0) loopBad++
        }
    }

    check("boards exercised", boards > 350, "got " + boards)
    check("always terminates within bound", termBad === 0, termBad + " over bound")
    check("always ends with zero orphans", orphanBad === 0, orphanBad + " boards left orphans")
    check("geometry never touched", geomBad === 0, geomBad + " blocks moved")
    check("board still settled after the pass", gravityBad === 0, gravityBad + " needed gravity")
    check("removal alone preserves the invariant", postRemovalBad === 0, postRemovalBad + " broke it")
    check("remove + gravity + pass ends clean", loopBad === 0, loopBad + " left orphans")
}

log("")
log(fail === 0 ? ("ALL PASS (" + pass + ")") : ("FAILURES: " + fail + " / " + (pass + fail)))
