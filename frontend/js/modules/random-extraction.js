// Random sampling without repetition 
export function randomExtraction(array, sampleSize) {
    let arrayCopy = [...array];
    let extracted = [];
    
    const count = Math.min(sampleSize, arrayCopy.length);

    for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * arrayCopy.length);
        const elem = arrayCopy.splice(randomIndex, 1)[0];
        extracted.push(elem);
    }
    console.log("Extracted:" + " - " + extracted)
    return extracted;
}
