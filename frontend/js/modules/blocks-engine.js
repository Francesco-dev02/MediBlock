import { WORDS } from "./mock-blocks.js";
import { randomExtraction } from "./random-extraction.js";
import { getRandomColor } from "./random-color.js";

export function startGame(){

    const canvas = document.querySelector('.gameboard')
    if(!canvas) return
    const ctx = canvas.getContext("2d")

    const gameSection = canvas.closest('.game-section')
    if(!gameSection) return

    // ==================== Grid settings ======================
    const ROWS = 20, COLS = 18;
    const PADDING = 25 // space between text and margin
    const FONT_SIZE = 28
    const WORDS_NUMBER = 10
    const GAP = 4 // small visual gap drawn between neighboring blocks
    const INITIAL_ROW_COUNT = 6 // minimum skyline height built at start, even once every word has been placed

    let width = 0, height = 0, cellWidth = 0, cellHeight = 0;
    let words = randomExtraction(WORDS, WORDS_NUMBER)

    function resize(){
        width = canvas.clientWidth
        height = canvas.clientHeight
        if (width === 0 || height === 0) return;
        // Computing cell size
        cellWidth = width / COLS
        cellHeight = height / ROWS

        canvas.height = height
        canvas.width = width
        console.log("Size changed, canvas height: " + height + " - csanvas width: " + width);
        // Here implement the logic of blocks resizing
        draw()
    }

    // Draws every currently placed block. block.level is how many blocks-high
    // it sits (0 = resting on the floor), derived once at placement time, not
    // recomputed here.
    function draw(){
        ctx.clearRect(0, 0, width, height)

        blocks.forEach(block => {
            const y = height - (block.level + 1) * cellHeight

            ctx.fillStyle = block.color
            ctx.beginPath()
            ctx.roundRect(block.x + GAP / 2, y, block.width - GAP, cellHeight - GAP, 8)
            ctx.fill()

            if (block.word) {
                ctx.fillStyle = '#ffffff'
                ctx.font = `${FONT_SIZE}px sans-serif`
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.fillText(block.word, block.x + block.width / 2, y + cellHeight / 2)
            }
        })
    }

    function createWordBlock(word){
        ctx.font = `${FONT_SIZE}px sans-serif`
        const width = ctx.measureText(word).width + PADDING * 2
        return { id: crypto.randomUUID(), word, color: getRandomColor(), width }
    }

    function createEmptyBlock(){
        const width = cellWidth + Math.random() * 2 * cellWidth
        return { id: crypto.randomUUID(), word: null, color: getRandomColor(), width }
    }

    // ==================== Skyline placement ======================
    // heightMap[slot] = how many blocks are currently stacked in that slot.
    // topBlockAt[slot] = the block currently sitting on top of that slot (or
    // null). Together they replace the old full-width "rows" model: blocks
    // now land wherever the board is currently lowest, so different areas of
    // the board end up at different heights instead of one uniform row.
    let heightMap = Array(COLS).fill(0)
    let topBlockAt = Array(COLS).fill(null)
    let blocks = []

    function slotWidth() {
        return width / COLS
    }

    // Picks where the next block should land: a RANDOM slot, not the lowest
    // one. Starting from a flat board, always targeting the global minimum
    // would just fill the whole width at the same height before ever going
    // up a level - identical to the old uniform-row model, just written
    // differently. The irregular skyline only appears because new blocks
    // land in random columns over time, some getting picked more than others.
    // spanSlots is how many slots this block needs, so the random start
    // still leaves room for the whole block without having to clamp it later.
    function pickRandomSlot(spanSlots) {
        return Math.floor(Math.random() * (COLS - spanSlots + 1))
    }

    // Collects every block already touching the spot a new block is about to
    // land on (the block(s) directly below it + the blocks immediately to its
    // left/right that already sit at the very same height). An empty block
    // picks its color from here, so it's never isolated with nothing to match.
    function findNeighbors(startSlot, endSlot, targetHeight) {
        const neighbors = []

        for (let s = startSlot; s < endSlot; s++) {
            if (heightMap[s] === targetHeight && topBlockAt[s]) neighbors.push(topBlockAt[s])
        }
        if (startSlot > 0 && heightMap[startSlot - 1] === targetHeight + 1) neighbors.push(topBlockAt[startSlot - 1])
        if (endSlot < COLS && heightMap[endSlot] === targetHeight + 1) neighbors.push(topBlockAt[endSlot])

        return neighbors
    }

    // Tracks whether placeNextBlock has ever run, independently of the
    // `blocks` array (which the caller only assigns to *after* the whole
    // initial board is built, so checking blocks.length here would stay
    // true for every single placement, not just the first one).
    let hasPlacedAnyBlock = false

    // Places one new block on the skyline and returns it, or null if there
    // are no more words left to place a very-first block with (see below).
    function placeNextBlock() {
        // Only true once in the whole game: nothing has been placed yet, so
        // there is no neighbor at all to inherit a color from. Force it to be
        // a word block, which never needs a neighbor to be removable.
        const isVeryFirstBlock = !hasPlacedAnyBlock
        const isWord = words.length > 0 && (isVeryFirstBlock || Math.random() < 0.5)
        if (isVeryFirstBlock && words.length === 0) return null // no words at all: nothing to build with
        hasPlacedAnyBlock = true

        const block = isWord ? createWordBlock(words.shift()) : createEmptyBlock()

        // Clamp neededSlots first, so the random start position picked right
        // after always leaves enough room for the whole block - no need to
        // compress it afterwards except for the (rare) block wider than the
        // entire board.
        const neededSlots = Math.max(1, Math.min(COLS, Math.ceil(block.width / slotWidth())))
        const startSlot = pickRandomSlot(neededSlots)
        const endSlot = startSlot + neededSlots

        block.width = (endSlot - startSlot) * slotWidth()
        block.x = startSlot * slotWidth()

        const targetHeight = Math.max(...heightMap.slice(startSlot, endSlot))

        if (!isWord) {
            const neighbors = findNeighbors(startSlot, endSlot, targetHeight)
            if (neighbors.length > 0) {
                block.color = neighbors[Math.floor(Math.random() * neighbors.length)].color
            }
        }

        block.level = targetHeight
        for (let s = startSlot; s < endSlot; s++) {
            heightMap[s] = targetHeight + 1
            topBlockAt[s] = block
        }

        return block
    }

    resize() // necessary before placing anything, otherwise width/slotWidth would be 0

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    // Keeps placing blocks until the skyline has a minimum height everywhere
    // (INITIAL_ROW_COUNT) AND every initial word has been placed somewhere.
    // ROWS stays as the hard safety ceiling either way.
    function buildInitialBoard() {
        const initialBlocks = []
        while ((Math.min(...heightMap) < INITIAL_ROW_COUNT || words.length > 0) && Math.max(...heightMap) < ROWS) {
            const block = placeNextBlock()
            if (!block) break // safety net: nothing left to place, avoid an infinite loop
            initialBlocks.push(block)
        }
        return initialBlocks
    }

    blocks = buildInitialBoard()
    draw()


    // ====================== SENDING DATA TO BACKEND ======================

    const formElement = document.getElementById('words-form');
    if(!formElement) return

    formElement.addEventListener('submit', (event) => {
        event.preventDefault();
        console.log("Sending word to backend...")
    })
}
