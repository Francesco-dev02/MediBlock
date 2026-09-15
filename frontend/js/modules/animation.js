export function easeInQuad(t){
    return t * t;
}

// Slow -> fast -> slow. A calm default for a fade or a color crossfade.
export function easeInOutQuad(t){
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function tween(duration, easing, onProgress){
    return new Promise((resolve) => {
        const start = performance.now();

        function frame(now){
            const t = Math.min(1, (now - start) / duration);
            onProgress(easing(t));
            if (t < 1) requestAnimationFrame(frame);
            else resolve();
        }

        requestAnimationFrame(frame);
    });
}

function hexToRgb(hex){
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Linear interpolation between two "#rrggbb" colors, t in [0, 1].
export function lerpColor(from, to, t){
    const [r1, g1, b1] = hexToRgb(from);
    const [r2, g2, b2] = hexToRgb(to);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `rgb(${r}, ${g}, ${b})`;
}
