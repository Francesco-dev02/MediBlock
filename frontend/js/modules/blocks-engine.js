import { getRandomColor } from "./random-color.js"
import { shuffleArray } from "./shuffle-array.js"
import { GridBoard } from "./grid-board.js"
import { collectRemovalGroup, enforceRemovability } from "./color-graph.js"
import { tween, easeInQuad, easeInOutQuad, lerpColor } from "./animation.js"
import { fetchBestMatch } from "./game-api.js"

export function startGame(){
    const canvas = document.querySelector('.gameboard')
    if(!canvas) return
    const ctx = canvas.getContext("2d")
    const form = document.querySelector(".words-form")

    const scoreElement = document.querySelector(".score-section h1")
    const gameSection = canvas.closest('.game-section')

    const progressBar = document.querySelector('.progress-bar');


    if(!gameSection || !form || !scoreElement) return

    let width = 0, height = 0;
    let cellWidth = 0, cellHeight = 0, offsetX = 0, offsetY = 0;
    let progressBarState = 0;

    const PADDING = 14
    const COLS = 96, ROWS = 96;

    const BLOCK_HEIGHT = 10 // measured as rows occupation
    const MAX_WORD_GAP = 6 // random empty columns left before a word block

    // This avoid the risky case on which a block can stay perfectly align above a gap. 
    // In that case the block seems suspended on air 
    const MIN_BLOCK_WIDTH = MAX_WORD_GAP + 2

    const WORDS_NUMBER = 14 // number of words randomically extracted
    const NULL_NUMBER = 12 // number of null blocks

    const BLOCKS_PER_TURN = 3 // new blocks that fall in after each successful guess
    const NEW_BLOCK_WORD_CHANCE = WORDS_NUMBER / (WORDS_NUMBER + NULL_NUMBER) // same word/empty ratio as the initial board

    // graphical block word settings
    const TEXT_PADDING = 6;
    const BLOCK_GAP = 2; // px of visual gap between adjacent blocks
    const BLOCK_RADIUS = 8; // px corner radius

    const MIN_BLOCK_FONT_SIZE = 10;
    const MAX_BLOCK_FONT_SIZE = 22;
    const BLOCK_FONT_RATIO = 0.55; // font size as a fraction of the block's pixel height

    const WORD_SCORE = 50 // max score for a perfectly-matched word block; scaled by similarity for a guessed match, full value for each chained empty block

    // Durations for the three post-submit animation phases: a matched group
    // shrinks away, the board settles, then whatever changed color or gained
    // a word eases into its new look. Kept short and sequential on purpose -
    // this is a word game, not a physics demo.
    const REMOVE_DURATION = 180 // ms, fading + shrinking a cleared block
    const REMOVE_SHRINK = 0.3   // fraction it shrinks by, fully faded
    const FALL_DURATION = 240   // ms, settling into the gap left below - fixed
                                 // regardless of distance, so a big drop reads
                                 // as one clean settle rather than a slow crawl
    const MATERIALIZE_DURATION = 260 // ms, color crossfade / word fade-in

    const DIM_DURATION = 800 // ms, fade in/out for the non-matched blocks
    const DIM_ALPHA = 0.30   // how faint the non-matched blocks get while the match plays

    // Transient, purely visual state keyed by block id - never the block's
    // own data. draw() consults these while a phase is in flight and they're
    // empty the rest of the time, so a plain draw() outside an animation is
    // unaffected.
    const removingBlocks = new Map();     // id -> { progress }
    const fallingBlocks = new Map();      // id -> { fromRow, progress }
    const materializingBlocks = new Map(); // id -> { from, to, becameWord, progress }

    // Dim bracket around the removal phase: every block NOT in the group
    // that's about to be removed fades down to DIM_ALPHA so the group reads
    // as the visual focus, then fades back once it's gone. dimExemptIds is
    // null outside that bracket, so drawBlock's dim check is a no-op the
    // rest of the time.
    let dimExemptIds = null; // ids kept at full opacity while a dim is active, or null
    let dimProgress = 0;     // 0 = normal, 1 = fully dimmed to DIM_ALPHA

    let isAnimating = false; // guards against a second submit mid-sequence

    // words list from backend
    const extractedWords = sessionStorage.getItem('wordsSession');
    let extractedWordsList = []
    if (extractedWords) {
        try {
            // convert text in a real Array JavaScript of strings
            extractedWordsList = JSON.parse(extractedWords);
            console.log("Lista di gioco caricata:", extractedWordsList);
        } catch (e) {
            console.error("Errore durante il parse di wordsSession:", e);
            // window.location.href = "./index.html";
            return;
        }
    } else {
    // if extractedWords is None, return to index page
        // window.location.href = "./index.html";
        return;
    }

    // The backend hands over more words than the board needs up front
    // (SESSION_WORD_COUNT in session.py) precisely so there's a same-vocabulary,
    // same-difficulty reserve left over: shuffle once, then split into the
    // board's initial words and the reserve pool repairs/new blocks draw from.
    const shuffledSessionWords = shuffleArray([...extractedWordsList]);
    const initialWords = shuffledSessionWords.slice(0, WORDS_NUMBER);
    // A session that came back with too few words to leave a reserve just
    // reuses the board's own words rather than leaving the pool empty.
    const wordPool = shuffledSessionWords.length > WORDS_NUMBER
        ? shuffledSessionWords.slice(WORDS_NUMBER)
        : initialWords;

    let wordsQueue = shuffleArray(initialWords.concat(Array(NULL_NUMBER).fill(null)))

    // Tracks every word already placed on the board (initial layout plus
    // any checkConsistency() repair), so repairs never hand out a
    // duplicate that's still in play.
    let usedWords = new Set(initialWords)

    function pickRepairWord(block){
        const available = wordPool.filter(word => !usedWords.has(word));
        const pool = available.length > 0 ? available : wordPool; // exhausted: allow a repeat rather than getting stuck

        // The block keeps its existing width - it was sized as an empty block,
        // not for whatever word ends up in it - and computeFontSize() shares
        // one font size across every word block on the board. A word too wide
        // for this block would shrink everyone else's text along with it, so
        // prefer a word that actually fits before considering anything wider.
        const fitting = pool.filter(word => getBlockWidth(word) <= block.width);
        const choices = fitting.length > 0
            ? fitting
            : [pool.reduce((shortest, word) => word.length < shortest.length ? word : shortest)];

        const word = choices[Math.floor(Math.random() * choices.length)];
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
        // drawGrid();
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
        const removing = removingBlocks.get(block.id);
        const falling = fallingBlocks.get(block.id);
        const materializing = materializingBlocks.get(block.id);

        // Falling only ever animates row - gravity is vertical only - so col
        // and width stay exactly as GridBoard has them.
        const effectiveRow = falling
            ? falling.fromRow + (block.row - falling.fromRow) * falling.progress
            : block.row;

        const y = offsetY + effectiveRow * cellHeight;
        const blockHeight = block.height * cellHeight;
        const blockWidth = block.width * cellWidth;
        const x = offsetX + block.col * cellWidth;

        const isDimmed = dimExemptIds && !dimExemptIds.has(block.id);
        const dimAlpha = isDimmed ? 1 - dimProgress * (1 - DIM_ALPHA) : 1;

        const alpha = (removing ? 1 - removing.progress : 1) * dimAlpha;
        const scale = removing ? 1 - removing.progress * REMOVE_SHRINK : 1;
        const fillColor = materializing
            ? lerpColor(materializing.from, materializing.to, materializing.progress)
            : block.color;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Shrinking is scaled around the block's own center, not the canvas
        // origin, so it reads as the block collapsing in on itself.
        if (scale !== 1) {
            const cx = x + blockWidth / 2, cy = y + blockHeight / 2;
            ctx.translate(cx, cy);
            ctx.scale(scale, scale);
            ctx.translate(-cx, -cy);
        }

        // Inset the fill by BLOCK_GAP so adjacent blocks show a thin gap
        // between them even though they're logically touching in the grid.
        ctx.fillStyle = fillColor;

        tracePath(x + BLOCK_GAP / 2, y + BLOCK_GAP / 2, blockWidth - BLOCK_GAP, blockHeight - BLOCK_GAP, BLOCK_RADIUS);
        ctx.fill();

        if (block.word) {
            // A block that just gained a word (repaired) fades its text in
            // rather than having it appear instantly; everything else is
            // simply at full opacity.
            const textAlpha = materializing && materializing.becameWord ? materializing.progress : 1;

            // Same size for every block on the board
            ctx.font = `${blockFontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = alpha * textAlpha;
            ctx.fillText(block.word, x + blockWidth / 2, y + blockHeight / 2, blockWidth - TEXT_PADDING * 2);
        }

        ctx.restore();
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
    setInterval(async () => {
        progressBarState += 5;
        if (progressBarState > 100) { 
            if (!isAnimating){
                progressBarState = 0;
                isAnimating = true;
                try {
                    const newBlocks = spawnFallingBlocks(BLOCKS_PER_TURN);
                    if (newBlocks.length > 0) {
                        const spawnFromRows = new Map(newBlocks.map((b) => [b.id, -BLOCK_HEIGHT]));
                        await playFall(newBlocks, spawnFromRows);
                    }
                    await checkGridConsistency();
                } finally {
                    isAnimating = false;
                }
            }
        }
        progressBar.style.setProperty('--progress', progressBarState + '%');
    }, 1000)

    enforceRemovability(grid, { repairBlock }) // inheritedColor()'s no-neighbor branch can mint an unreachable block
    draw()                // render again now that the grid actually has blocks

    new ResizeObserver(resize).observe(canvas)

    // Last resort for an empty block that enforceRemovability() can't rescue by
    // recoloring, because nothing around it leads back to a word. Giving it a
    // word of its own makes it removable, and makes it something the rest of
    // its cluster can then recolor toward. Width/row/col are left untouched
    // (repositioning would cascade into everything gravity just settled) -
    // computeFontSize() already shrinks the shared font to fit whatever width
    // it has.
    function repairBlock(block){
        block.word = pickRepairWord(block);
        block.color = getRandomColor();
        block.colorStreak = 1;
    }

    // Picks a word for a brand-new block, distinct from every word already in
    // play (falls back to a repeat only once the pool is exhausted). Mirrors
    // pickRepairWord()'s fit-filtering so a spawned block can be constrained
    // to a maximum width (e.g. the zone it has to land in) the same way a
    // repaired block is constrained to the width it already has.
    function pickNewWord(maxWidth = COLS){
        const available = wordPool.filter(word => !usedWords.has(word));
        const pool = available.length > 0 ? available : wordPool;

        const fitting = pool.filter(word => getBlockWidth(word) <= maxWidth);
        const choices = fitting.length > 0
            ? fitting
            : [pool.reduce((shortest, word) => word.length < shortest.length ? word : shortest)];

        const word = choices[Math.floor(Math.random() * choices.length)];
        usedWords.add(word);
        return word;
    }

    // Whether a block-sized span is free to occupy. Above the visible grid
    // (row < 0) always counts as free - that's where a new block starts before
    // falling in - so this only differs from GridBoard.isFree() there.
    function isColumnSpanFree(col, row, width, blockHeight){
        if (col < 0 || col + width > COLS || row + blockHeight > ROWS) return false;
        // Only the portion of the span still above row 0 is free by
        // definition - the rest, even when `row` itself is negative, overlaps
        // real grid rows and still has to be checked against them.
        for (let y = Math.max(row, 0); y < row + blockHeight; y++) {
            for (let x = col; x < col + width; x++) {
                if (grid.getBlockAt(x, y)) return false;
            }
        }
        return true;
    }

    // Where a block dropped from above this column would come to rest,
    // simulating a fall from off-grid down onto whatever is already there.
    // A result below 0 means the column is packed all the way to the top.
    function findLandingRow(col, width, blockHeight){
        let row = -blockHeight;
        while (isColumnSpanFree(col, row + 1, width, blockHeight)) row++;
        return row;
    }

    // An empty block landing on top of another block takes that block's
    // color, same as the game's board-wide rule that an empty block is only
    // ever removable by chaining, through matching color, back to a word.
    // Landing on the bare floor (nothing underneath) has no color to inherit,
    // so it starts a fresh one.
    function colorFromBelow(row, col){
        const below = grid.getBlockAt(col, row + BLOCK_HEIGHT);
        return below
            ? { color: below.color, colorStreak: below.colorStreak + 1 }
            : { color: getRandomColor(), colorStreak: 1 };
    }

    // Drops `count` new blocks onto the board after a successful guess. The
    // grid is split into `count` equal-width zones and each block lands at a
    // random column within its own zone, so the arrivals spread across the
    // full width instead of clustering wherever the first one happened to
    // land. Each still falls independently onto whatever is currently
    // tallest in its own column, so two arrivals can end up at different
    // rows - exactly like a block actually falling would. Returns the blocks
    // that found room; a column packed to the ceiling is skipped rather than
    // forced to overlap.
    function spawnFallingBlocks(count){
        const spawned = [];
        const zoneWidth = Math.floor(COLS / count);

        for (let i = 0; i < count; i++) {
            const zoneStart = i * zoneWidth;
            const zoneEnd = (i === count - 1) ? COLS : zoneStart + zoneWidth; // last zone absorbs the remainder
            const availableWidth = zoneEnd - zoneStart;

            const useWord = Math.random() < NEW_BLOCK_WORD_CHANCE;
            const block = makeBlock(useWord ? pickNewWord(availableWidth) : null);
            // Defensive: keeps the block inside its zone even in the unlikely
            // case its natural width doesn't fit, so it can never overlap the
            // next zone's block.
            block.width = Math.min(block.width, availableWidth);

            const maxCol = Math.max(zoneStart, zoneEnd - block.width);
            const col = zoneStart + Math.floor(Math.random() * (maxCol - zoneStart + 1));

            const landingRow = findLandingRow(col, block.width, block.height);
            if (landingRow < 0) continue; // this zone is packed all the way to the top

            block.col = col;
            block.row = landingRow;

            if (!block.word) {
                const inherited = colorFromBelow(block.row, block.col);
                block.color = inherited.color;
                block.colorStreak = inherited.colorStreak;
            }

            grid.add(block);
            spawned.push(block);
        }

        return spawned;
    }

    // Fades every block except `exemptGroup` down to DIM_ALPHA (dim: true)
    // or back up to full opacity (dim: false), so the group about to be
    // removed reads as the visual focus while it plays.
    async function playDim(exemptGroup, dim){
        // Create a set containing the id of the block to remove 
        dimExemptIds = new Set(exemptGroup.map((b) => b.id));
        // dim Progress 
        const from = dimProgress, to = dim ? 1 : 0;
        await tween(DIM_DURATION, easeInOutQuad, (t) => {
            dimProgress = from + (to - from) * t;
            draw();
        });
        if (!dim) dimExemptIds = null;
    }

    // Fades and shrinks `group` in place, then hands back control so the
    // caller can actually remove the blocks. They stay in `grid` throughout -
    // draw() keeps rendering them via removingBlocks - so nothing disappears
    // before the animation says it should.
    async function playRemoval(group){
        group.forEach((b) => removingBlocks.set(b.id, { progress: 0 }));
        await tween(REMOVE_DURATION, easeInOutQuad, (t) => {
            group.forEach((b) => { removingBlocks.get(b.id).progress = t; });
            draw();
        });
        group.forEach((b) => removingBlocks.delete(b.id));
    }

    // Settles `moved` blocks from their pre-gravity row into the row
    // GridBoard already snapped them to. GridBoard mutates block.row
    // immediately - fromRows is a snapshot taken just before that happened,
    // so the animation has something to interpolate away from.
    async function playFall(moved, fromRows){
        moved.forEach((b) => fallingBlocks.set(b.id, { fromRow: fromRows.get(b.id), progress: 0 }));
        await tween(FALL_DURATION, easeInQuad, (t) => {
            moved.forEach((b) => { fallingBlocks.get(b.id).progress = t; });
            draw();
        });
        moved.forEach((b) => fallingBlocks.delete(b.id));
    }

    // Eases every entry in `changes` ({ id, from, to, becameWord }) from its
    // old color to its new one. block.color/word are already updated by the
    // time this runs - it's a purely visual crossfade over the real state.
    async function playMaterialize(changes){
        changes.forEach((c) => materializingBlocks.set(c.id, { ...c, progress: 0 }));
        await tween(MATERIALIZE_DURATION, easeInOutQuad, (t) => {
            changes.forEach((c) => { materializingBlocks.get(c.id).progress = t; });
            draw();
        });
        changes.forEach((c) => materializingBlocks.delete(c.id));
    }

    // Re-checks the "every empty block is removable" invariant from
    // color-graph.js: a solvable board is one where every empty block can be
    // reached, through a same-color chain, from some word block still on the
    // grid. Removing a group, gravity settling it, and new blocks landing can
    // each strand one - so this runs after every one of those changes - and
    // repairs whatever it finds (recolor first, mint a word as a last
    // resort), animating each fix the same way an ordinary recolor plays.
    async function checkGridConsistency(){
        const changes = [];
        const repairWithAnim = (block) => {
            const from = block.color;
            repairBlock(block);
            changes.push({ id: block.id, from, to: block.color, becameWord: true });
        };
        const { recolored } = enforceRemovability(grid, { repairBlock: repairWithAnim });
        changes.push(...recolored.map((c) => ({ ...c, becameWord: false })));
        if (changes.length > 0) await playMaterialize(changes);
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault()
        if (isAnimating) return; // let the current sequence finish first

        const wordInput = form.elements["word-input"].value.trim()
        form.elements["word-input"].value = ""
        if (!wordInput) return;

        const candidates = grid.getBlocks().filter((block) => block.word).map((block) => block.word);
        if (candidates.length === 0) return;

        isAnimating = true;

        // Everything from here on can throw (a failed fetch, a bug in an
        // animation step) - the finally block is what guarantees isAnimating
        // always gets released, so a mid-sequence error can't soft-lock the
        // board against every future guess.
        try {
            // Ask the backend which visible word is the closest semantic match to
            // what was typed - the player never has to spell a block exactly,
            // just guess the right association.
            let best, matchScore;
            try {
                ({ best, score: matchScore } = await fetchBestMatch(wordInput, candidates));
            } catch (err) {
                console.error("[blocks-engine] fetchBestMatch fallita:", err.message);
                return;
            }
            const matchedBlock = grid.getBlocks().find((block) => block.word === best);
            if (!matchedBlock) return;

            // 1. Everything but the matched group dims down, the group fades
            // away, then everything else brightens back up before gravity runs.
            const group = collectRemovalGroup(grid, matchedBlock);
            await playDim(group, true);
            await playRemoval(group);
            group.forEach((b) => grid.removeBlock(b));

            // The guessed word block's points scale with how close the match was;
            // chained empty blocks (a bonus, not part of the guess) score at full value.
            const wordPoints = Math.round(WORD_SCORE * Math.max(0, matchScore));
            const bonusPoints = (group.length - 1) * WORD_SCORE;
            score += wordPoints + bonusPoints;
            await playDim(group, false);

            // 2. Everything above the gap falls into place.
            const rowsBeforeGravity = new Map(grid.getBlocks().map((b) => [b.id, b.row]));
            const moved = grid.applyGravity();
            if (moved.length > 0) await playFall(moved, rowsBeforeGravity);

            // 3. Falling can strand empty blocks that lost their way back to a word.
            await checkGridConsistency();

            // 4. New blocks fall in to replace what was cleared.
            const newBlocks = spawnFallingBlocks(BLOCKS_PER_TURN);
            if (newBlocks.length > 0) {
                const spawnFromRows = new Map(newBlocks.map((b) => [b.id, -BLOCK_HEIGHT]));
                await playFall(newBlocks, spawnFromRows);
            }

            // 5. An arrival can itself strand an empty block - e.g. one landing
            // on the bare floor with nothing underneath to inherit a color from.
            await checkGridConsistency();
            progressBarState = 0;
        } catch (err) {
            console.error("[blocks-engine] errore durante la sequenza di animazione:", err);
        } finally {
            isAnimating = false;
            draw();
        }
     })

}
