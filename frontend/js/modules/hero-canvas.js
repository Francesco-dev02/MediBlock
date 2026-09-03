export function initHeroCanvas(){

    /* get canvas element */
    const canvas = document.getElementById("blocks-canvas")
    if (!canvas) return
    /* return an object with tools for drawing */
    const ctx = canvas.getContext("2d")
    /* extract the hero section which is the parent of the canvas */
    const hero = canvas.closest(".hero")

    /* WORDS and COLORS randomly chosen */
    const WORDS = [
        'TACHICARDIA', 'STETOSCOPIO', 'SIRINGA', 'BISTURI', 'DIAGNOSI',
        'FEBBRE', 'ANTIBIOTICO', 'RADIOGRAFIA', 'VACCINO', 'PLASMA',
        'SUTURA', 'EMOGLOBINA', 'ANESTESIA', 'INFUSIONE', 'CUORE'
    ];
    const COLORS = ['#4fd8ff', '#34e89e', '#ff5d8f'];

    /* ===================================================
        An animation can be implemented as a sequence of frames – usually small changes to HTML/CSS properties.
        Thx javascript.info for the definition 
    ======================================================*/
    let blocks = []
    let width = 0
    let height = 0

    function randomBetween(min, max) {
        return min + Math.random() * (max - min);
    }

    /* Clamp a value into the [0, 1] range, used to build the edge fade below */
    function clamp01(value) {
        return Math.max(0, Math.min(1, value));
    }

    /* This function is necessary because the grid size of canvas element are 300x150
    From: https://www.w3.org/TR/2012/WD-html5-author-20120329/the-canvas-element.html#the-canvas-element
    */

    function resize() {
        width = hero.clientWidth;
        height = hero.clientHeight;
        canvas.width = width;
        canvas.height = height;
        /* ================ Block initialization ==================== */
        /* target count control the block density */
        const targetCount = Math.max(10, Math.round((width * height) / 45000));
        /* block initialization */
        blocks = Array.from({ length: targetCount }, () => makeBlock(true));
    }

    /* function to create the block object */
    function makeBlock(initial){
        return {
            word: WORDS[Math.floor(Math.random() * WORDS.length)] ,
            fontSize: randomBetween(13, 17),
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            x: randomBetween(0, width),
            y: initial ? randomBetween(-height, height) : -randomBetween(40, 200),
            speed: randomBetween(0.25, 0.5),
            /* per-block opacity so not every block pops at full strength (adds depth) */
            alpha: randomBetween(0.55, 1),
        };
    }

    function draw(){
        /* first clear the grid */
        ctx.clearRect(0, 0, width, height);

        for (const block of blocks) {
            block.y += block.speed;
            if (block.y > height + 40) {
                Object.assign(block, makeBlock(false));
            }

            const paddingX = 10;
            ctx.font = `600 ${block.fontSize}px 'Space Grotesk', sans-serif`;
            const textWidth = ctx.measureText(block.word).width;
            const boxWidth = textWidth + paddingX * 2;
            const boxHeight = block.fontSize + 14;

            /* fade the block in near the top edge and out near the bottom edge,
               instead of having it pop in/out abruptly */
            const fadeIn = clamp01((block.y + boxHeight) / 40);
            const fadeOut = clamp01((height + 40 - block.y) / 40);
            const edgeAlpha = Math.min(fadeIn, fadeOut);

            ctx.save();
            ctx.globalAlpha = block.alpha * edgeAlpha;

            /* soft neon glow behind the box, using the block's own color */
            ctx.shadowColor = block.color;
            ctx.shadowBlur = 14;

            ctx.fillStyle = block.color;
            roundRect(ctx, block.x, block.y, boxWidth, boxHeight, 8);
            ctx.fill();

            /* drop the glow before drawing the label so the text stays crisp */
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#070b14';
            ctx.textBaseline = 'middle';
            ctx.fillText(block.word, block.x + paddingX, block.y + boxHeight / 2);

            ctx.restore();
        }

    }
    
    function roundRect(context, x, y, w, h, r){
        /* create a path (i.e. a list of point connected by segmets) */
        context.beginPath();
        /* cursor initialization */
        context.moveTo(x + r, y);
        /* Draws an arc with the given control points and radius, connected to the previous point by a straight line. */
        context.arcTo(x + w, y, x + w, y + h, r);
        context.arcTo(x + w, y + h, x, y + h, r);
        context.arcTo(x, y + h, x, y, r);
        context.arcTo(x, y, x + w, y, r);
        context.closePath();
    }
    
    let reqId = null

    /* callback function passed to requestAnimationFrame */
    function loop(){
        /* Paint blocks */
        draw();
        /* Recursively call requestAnimationFrame */
        reqId = requestAnimationFrame(loop);
    }

    function startLoop(){
        if(!reqId){
            reqId = requestAnimationFrame(loop)
        }
    }

    /* =============================================
    requestAnimationFrame is a better way than setInterval. 
    The function is one shot to create a smooth animation it must be called recursively
    ================================================ */
    resize()
    startLoop()
    /* resize event listener to avoid blur effect on blocks */ 
    window.addEventListener("resize", resize);

}