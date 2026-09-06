import { getRandomColor } from "./random-color.js"  
import { WORDS } from "./mock-blocks.js"
import { randomExtraction } from "./random-extraction.js"
import { shuffleArray } from "./shuffle-array.js"
import { GridBoard } from "./gridBoard.js"

export function startGame(){
    const canvas = document.querySelector('.gameboard')
    if(!canvas) return
    const ctx = canvas.getContext("2d")
    const form = document.querySelector(".words-form")

    const scoreElement = document.querySelector(".score-section h1")
    const gameSection = canvas.closest('.game-section')


    if(!gameSection || !form || !scoreElement) return

    let width = 0, height = 0;
    let cellWidth = 0, cellHeight = 0, offsetX = 0, offsetY = 0;

    const PADDING = 14
    const COLS = 96, ROWS = 96;

    const BLOCK_HEIGHT = 10 // measured as rows occupation
    const MAX_WORD_GAP = 6 // random empty columns left before a word block

    // This avoid the risky case on which a block can stay perfectly align above a gap. 
    // In that case the block seems suspended on air 
    const MIN_BLOCK_WIDTH = MAX_WORD_GAP + 2

    const WORDS_NUMBER = 14 // number of words randomically extracted 
    const NULL_NUMBER = 12 // number of null blocks 

    // graphical block word settings
    const TEXT_PADDING = 6;
    const BLOCK_GAP = 2; // px of visual gap between adjacent blocks
    const BLOCK_RADIUS = 8; // px corner radius

    const MIN_BLOCK_FONT_SIZE = 10;
    const MAX_BLOCK_FONT_SIZE = 22;
    const BLOCK_FONT_RATIO = 0.55; // font size as a fraction of the block's pixel height

    const WORD_SCORE = 50 // score for every block eliminated

    const extractedWords = randomExtraction(WORDS, WORDS_NUMBER)
    let wordsQueue = shuffleArray(extractedWords.concat(Array(NULL_NUMBER).fill(null)))

    // Tracks every word already placed on the board (initial layout plus
    // any checkConsistency() repair), so repairs never hand out a
    // duplicate that's still in play. WORDS has only 15 entries and
    // WORDS_NUMBER already uses 14, so pickRepairWord() below has to plan
    // for running out and reusing one.
    let usedWords = new Set(extractedWords)

    function pickRepairWord(){
        const available = WORDS.filter(word => !usedWords.has(word));
        const pool = available.length > 0 ? available : WORDS; // exhausted: allow a repeat rather than getting stuck
        const word = pool[Math.floor(Math.random() * pool.length)];
        usedWords.add(word);
        return word;
    }


    // The very first block placed must contain a word: after shuffling,
    // swap the first non-null word into position 0.
    const firstWordIndex = wordsQueue.findIndex(word => word !== null);
    if (firstWordIndex > 0) {
        [wordsQueue[0], wordsQueue[firstWordIndex]] = [wordsQueue[firstWordIndex], wordsQueue[0]];
    }

    let grid = new GridBoard(ROWS, COLS);
    let score = 0

    function resize(){
        const dpr = devicePixelRatio || 1; // dpr isn't one in retina screen 
        const r = canvas.getBoundingClientRect();

        if (!r.width || !r.height) return;

        // Adjust the size
        const boxWidth = Math.round(r.width * dpr), boxHeight = Math.round(r.height * dpr);
        if (canvas.width !== boxWidth || canvas.height !== boxHeight) {
            canvas.width = boxWidth;
            canvas.height = boxHeight;
            canvas.style.width  = r.width  + 'px';   
            canvas.style.height = r.height + 'px'; 
            width = r.width
            height = r.height
        }

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Is not necessary to use the dpr because every painting function will be scaled (setTransform)
        const availableWidth = r.width - PADDING * 2;
        const availableHeight = r.height - PADDING * 2;

        
        cellWidth = availableWidth / COLS;
        cellHeight = availableHeight / ROWS;

        offsetX = PADDING;
        offsetY = PADDING;

        draw();
    }

    function draw(){
        ctx.clearRect(0, 0, width, height);
        drawGrid();
        blockFontSize = computeFontSize(); // one size for the whole board, recomputed for the current cell size
        grid.getBlocks().forEach((block) => {
            drawBlock(block)
        });
        scoreElement.innerText = score + " pt."
    }

    function drawGrid(){
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        
        // horizontal rows
        for (let r = 0; r <= ROWS; r++){
            const y = offsetY + r * cellHeight + 0.5;
            ctx.beginPath();
            ctx.moveTo(offsetX, y);
            ctx.lineTo(offsetX + cellWidth * COLS, y);
            ctx.stroke();
        }

        // vertical rows
        for (let c = 0; c <= COLS; c++){
            const x = offsetX + c * cellWidth + 0.5;
            ctx.beginPath();
            ctx.moveTo(x, offsetY);
            ctx.lineTo(x, offsetY + cellHeight * ROWS);
            ctx.stroke();
        }

        ctx.restore();
    }



    // One shared font size for every word block, so the board reads as
    // consistent instead of each block picking its own size.
    let blockFontSize = MAX_BLOCK_FONT_SIZE;

    // Ideal font size based on the height of the block 
    function idealFontSize(){
        const size = BLOCK_HEIGHT * cellHeight * BLOCK_FONT_RATIO;
        return Math.max(MIN_BLOCK_FONT_SIZE, Math.min(MAX_BLOCK_FONT_SIZE, Math.floor(size)));
    }

    // Starts from idealFontSize() and shrinks it just enough for every
    // word currently on the board to fit inside its own block's width
    function computeFontSize(){
        let size = idealFontSize();

        for (const block of grid.getBlocks()) {
            if (!block.word) continue;

            const maxWidth = block.width * cellWidth - TEXT_PADDING * 2; // available space
            ctx.font = `${size}px sans-serif`; 
            const textWidth = ctx.measureText(block.word).width; // required space depends on idealFontSize

            // Text width scales ~linearly with font size, so this ratio
            // is close enough without a binary search. Shrinking here
            // never breaks a block already checked, so one pass suffices.
            if (textWidth > maxWidth) {
                size = Math.max(MIN_BLOCK_FONT_SIZE, Math.floor(size * maxWidth / textWidth));
            }
        }

        return size;
    }

    // Traces a rounded-rect path (manual arc path used only if the
    // browser doesn't support ctx.roundRect).
    function tracePath(x, y, w, h, radius) {
        const r = Math.max(0, Math.min(radius, w / 2, h / 2));
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x, y, w, h, r);
        } else {
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
        }
    }

    function drawBlock(block) {
        const y = offsetY + block.row * cellHeight;
        const blockHeight = block.height * cellHeight;

        
        const blockWidth = block.width * cellWidth;

        const x = offsetX + block.col * cellWidth;

        // Inset the fill by BLOCK_GAP so adjacent blocks show a thin gap
        // between them even though they're logically touching in the grid.
        ctx.fillStyle = block.color;
        
        tracePath(x + BLOCK_GAP / 2, y + BLOCK_GAP / 2, blockWidth - BLOCK_GAP, blockHeight - BLOCK_GAP, BLOCK_RADIUS);
        ctx.fill();

        if (!block.word) return;

        // Same size for every block on the board
        ctx.font = `${blockFontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText(block.word, x + blockWidth / 2, y + blockHeight / 2, blockWidth - TEXT_PADDING * 2);
    }

    function getBlockWidth(word){
        // No fixed block yet, set an ideal fontSize 
        ctx.font = `${idealFontSize()}px sans-serif`;
        const textWidth = ctx.measureText(word).width + TEXT_PADDING * 2;

        // Width must always be a multiple of the minimum cell,
        // wide to fit the word at the current font size.
        // For security reason set COLS so a single word can never require more space than the grid has.
        return Math.min(COLS, Math.max(MIN_BLOCK_WIDTH, Math.ceil(textWidth / cellWidth)));
    }

    function getRandomEmptyBlockWidth(){
        return Math.floor(Math.random() * 6) + MIN_BLOCK_WIDTH
    }

    // How many empty blocks in a row are allowed to literally repeat the
    // exact same inherited color
    const MAX_COLOR_STREAK = 2;

    function makeBlock(word){
        // This function create a block with random color and width block calculated depends on word length
        return {
            id: crypto.randomUUID(),
            word: word,
            color: word ? getRandomColor() : null,
            colorStreak: 1, // a freshly-random color always starts a new streak of 1
            height: BLOCK_HEIGHT, // height is fixed, expressed in cells
            width: word ? getBlockWidth(word): getRandomEmptyBlockWidth(), // in the case of an empty block the width is between 1 and 3 cells
            row: null,
            col: null,
        }
    }

    // An empty block inherits the color of a random adjacent block: the
    // one right below it, or the one right to its left.
    function inheritedColor(row, col){
        const below = grid.getBlockAt(col, row + BLOCK_HEIGHT);
        const left = grid.getBlockAt(col - 1, row);
        const neighbors = [below, left].filter(Boolean);

        // Shouldn't happen: the very first block placed always has a word,
        // and gridInitialization() never lets a gap push col 0 of any row
        // empty
        if (neighbors.length === 0) return { color: getRandomColor(), colorStreak: 1 };

        // Prefer a neighbor that hasn't hit the streak cap yet, so a long
        // run breaks toward a fresher. If fresh is empty fall back into neighbors even if 
        // the colorStreak is greater than MAX COLOR STREAK
        const fresh = neighbors.filter(n => n.colorStreak < MAX_COLOR_STREAK);
        const pool = fresh.length > 0 ? fresh : neighbors;
        const chosen = pool[Math.floor(Math.random() * pool.length)];

        return { color: chosen.color, colorStreak: chosen.colorStreak + 1 };
    }

    // After this many empty blocks placed back to back, the next one is
    // forced to be a word block - otherwise a long run of empties (very
    // likely by pure chance, since they're only ~46% of wordsQueue) can
    // fill an entire row and, since inheritedColor() just copies a
    // neighbor along, make the whole row read as one solid color.
    const MAX_CONSECUTIVE_EMPTY = 3;

    function gridInitialization(){
        // Fill a row left-to-right then move up one row
        let row = ROWS - BLOCK_HEIGHT;
        let col = 0;
        let consecutiveEmpty = 0;

        while (wordsQueue.length > 0) {
            // Force a word block: pull the next available one to the front
            // of the queue instead of taking whatever comes next. Same
            // swap-to-front used to guarantee the very first block's word.
            if (consecutiveEmpty >= MAX_CONSECUTIVE_EMPTY) {
                const nextWordIndex = wordsQueue.findIndex(word => word !== null);
                if (nextWordIndex > 0) {
                    [wordsQueue[0], wordsQueue[nextWordIndex]] = [wordsQueue[nextWordIndex], wordsQueue[0]];
                }
            }

            const block = makeBlock(wordsQueue.shift());
            consecutiveEmpty = block.word ? 0 : consecutiveEmpty + 1;

            // Random gap before a word block, so word blocks don't appear
            // perfectly contiguous.
            if (block.word && col > 0) {
                const maxGap = Math.min(MAX_WORD_GAP, COLS - col - block.width);
                if (maxGap > 0) col += Math.floor(Math.random() * (maxGap + 1));
            }

            if (col + block.width > COLS) {
                col = 0;
                row -= BLOCK_HEIGHT;
            }
            if (row < 0) break; // out of space

            block.row = row;
            block.col = col;

            if (!block.word) {
                const inherited = inheritedColor(row, col);
                block.color = inherited.color;
                block.colorStreak = inherited.colorStreak;
            }

            grid.add(block);

            col += block.width;
        }
    }
    
    resize()              // computes cellWidth/cellHeight before any block is sized
    gridInitialization()  // needs cellWidth to turn word lengths into cell counts
    draw()                // render again now that the grid actually has blocks

    new ResizeObserver(resize).observe(canvas)

    // Removes `block`, then remove every connected empty block that shares the same color
    // The removing chain follows only empty block. 
    function removeMatchingGroup(block){
        const targetColor = block.color;
        const toRemove = new Map([[block.id, block]]); // create a map id: block
        const stack = [block];

        // build the chain of element to remove
        while (stack.length > 0) {
            const current = stack.pop();
            for (const neighbor of grid.getNeighbors(current)) {
                if (toRemove.has(neighbor.id)) continue;
                if (neighbor.word) continue; // only empty blocks chain onward
                if (neighbor.color !== targetColor) continue;
                toRemove.set(neighbor.id, neighbor);
                stack.push(neighbor);
            }
        }

        
        toRemove.forEach((b) => grid.removeBlock(b));
        score += toRemove.size * WORD_SCORE
    }

    // Turns an orphaned empty block into its own word block: fresh random
    // color plus a word, so it no longer needs a same-color neighbor to
    // stay valid. Width/row/col are left untouched (repositioning would
    // cascade into everything gravity just settled) - computeFontSize()
    // already shrinks the shared font to fit whatever width it has.
    function repairBlock(block){
        block.word = pickRepairWord();
        block.color = getRandomColor();
        block.colorStreak = 1;
    }

    // check consistency must be applied to all blocks (pervy case on which an empty block doesn't move
    // while its word neighbor move, losing consistency)
    function checkConsistency(movedBlocks){
        let toCheck = movedBlocks;

        while (toCheck.length > 0) {
            const orphaned = toCheck.filter((block) =>
                !block.word && !grid.getNeighbors(block).some((n) => n.color === block.color)
            );

            orphaned.forEach(repairBlock);

            toCheck = orphaned.flatMap((block) => grid.getNeighbors(block).filter((n) => !n.word));
        }
    }



    form.addEventListener("submit", (event) => {
        event.preventDefault()

        const wordInput = form.elements["word-input"].value.trim().toUpperCase()
        form.elements["word-input"].value = ""

        const matchedBlock = grid.getBlocks().find((block) => block.word === wordInput); 
        if (!matchedBlock) return;
        removeMatchingGroup(matchedBlock);
        let moved = grid.applyGravity(); // every blocks above the eliminated blocks must fall down
        checkConsistency(moved)
        draw();
     })

}
