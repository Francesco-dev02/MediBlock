import { shuffleArray } from "./shuffle-array.js"

const PALETTE = [
    "#4fd8ff", // ciano
    "#34e89e", // verde
    "#ff5d8f", // rosa
    "#ff8f4f", // arancione
    "#a685fa", // viola
    "#4f7cff", // blu
    "#2fd9c4", // acquamarina
    "#e0b84f", // ambra
    "#8bc93d", // lime
    "#da36e2", // magenta
]

let COLORS_QUEUE = shuffleArray([...PALETTE]);

export function getRandomColor(){
    if (COLORS_QUEUE.length === 0){
        COLORS_QUEUE = shuffleArray([...PALETTE]);
    }
    return COLORS_QUEUE.shift();
}
