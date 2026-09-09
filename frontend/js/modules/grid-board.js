

export class GridBoard {

    #rows;
    #cols;
    #grid;
    #blocks;

    constructor(rows, cols) {
        if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1) {
            throw new RangeError('rows e cols devono essere interi positivi');
        }
        this.#rows = rows;
        this.#cols = cols;
        this.#grid = Array.from({ length: rows }, () => new Array(cols).fill(null));
        this.#blocks = {};
    }


    add(block) {
        const { col, row, width, height } = block;
        if (!this.isFree(col, row, width, height)) {
            throw new Error(`spazio occupato o fuori griglia: ${width}x${height} @ (${col},${row})`);
        }

        this.#blocks[block.id] = block;
        this.#occupy(block);
    }

    isFree(col, row, width, height) {
        if (col < 0 || row < 0 || col + width > this.#cols || row + height > this.#rows) return false;
        for (let y = row; y < row + height; y++) {
            for (let x = col; x < col + width; x++) {
                const id = this.#grid[y][x];
                if (id !== null) return false;
            }
        }
        return true;
    }


    #occupy(block) {
        for (let y = block.row; y < block.row + block.height; y++) {
            for (let x = block.col; x < block.col + block.width; x++) this.#grid[y][x] = block.id;
        }
    }

    // Nulls out block's current footprint without touching #blocks -
    // shared by removeBlock() and applyGravity(), which needs to clear a
    // block from its old spot before re-occupying it at a new one.
    #clear(block) {
        for (let y = block.row; y < block.row + block.height; y++) {
            for (let x = block.col; x < block.col + block.width; x++) this.#grid[y][x] = null;
        }
    }

    getBlocks(){
        return Object.values(this.#blocks);
    }

    // Returns the block occupying (col, row), or null if the cell is
    // empty or outside the grid.
    getBlockAt(col, row){
        if (col < 0 || row < 0 || col >= this.#cols || row >= this.#rows) return null;
        const id = this.#grid[row][col];
        return id !== null ? this.#blocks[id] : null;
    }


    
    removeBlock(block){
        this.#clear(block);
        delete this.#blocks[block.id];
    }

    
    applyGravity(){
        const moved = [];

        // First position the element below 
        const blocks = this.getBlocks().sort((a, b) => b.row - a.row);

        for (const block of blocks) {
            let landingRow = block.row;

            for (let y = block.row + 1; y + block.height <= this.#rows; y++) {
                const newBottomRow = y + block.height - 1;
                let rowIsFree = true;
                for (let x = block.col; x < block.col + block.width; x++) {
                    if (this.#grid[newBottomRow][x] !== null) { rowIsFree = false; break; }
                }
                if (!rowIsFree) break;
                landingRow = y;
            }

            if (landingRow === block.row) continue;

            this.#clear(block);
            block.row = landingRow;
            this.#occupy(block);
            moved.push(block);
        }
        return moved;
    }

   
    getNeighbors(block){
        const neighbors = new Map();

        const consider = (col, row) => {
            const neighbor = this.getBlockAt(col, row);
            if (neighbor && neighbor.id !== block.id) neighbors.set(neighbor.id, neighbor);
        };

        for (let x = block.col; x < block.col + block.width; x++) {
            consider(x, block.row - 1);            // above
            consider(x, block.row + block.height); // below
        }
        for (let y = block.row; y < block.row + block.height; y++) {
            consider(block.col - 1, y);             // left
            consider(block.col + block.width, y);   // right
        }

        return [...neighbors.values()];
    }

}
