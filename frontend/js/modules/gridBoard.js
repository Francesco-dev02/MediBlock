

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




}
