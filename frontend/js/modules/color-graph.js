// Keeps every empty block on the board removable.
//
// An empty block is removable only if the player can reach it by typing some
// word: there must be a path from it to a WORD block of the same color where
// every step in between is an EMPTY block of that same color. That's exactly
// the chain removeMatchingGroup() walks, so both are built on the same
// traversal below and can never drift apart.
//
// Gravity is the only thing that breaks the invariant. Removing blocks can't:
// it deletes a whole same-color component at once and never creates a new
// adjacency. Moving blocks does, so enforceRemovability() runs after gravity.
//
// Contract with the caller: this module only ever reads board.getBlocks() and
// board.getNeighbors(block), and only ever writes block.color (plus
// block.word, through the injected repairBlock). Geometry - row, col, width,
// height - is never touched, so nothing needs re-settling afterwards.
//
// Nothing here is cached. The occupancy grid inside GridBoard already is the
// adjacency structure, and a board holds a couple dozen blocks, so recomputing
// from scratch costs less than keeping a copy in sync with gravity would.


// The single traversal rule: which neighbor a chain is allowed to step onto.
// Word blocks are where a chain ends, never a step along the way.
export function canChain(from, neighbor){
    return !neighbor.word && neighbor.color === from.color;
}

// Every block that typing `start.word` would clear, `start` included.
export function collectRemovalGroup(board, start){
    const group = new Map([[start.id, start]]);
    const stack = [start];

    while (stack.length > 0) {
        const current = stack.pop();
        for (const neighbor of board.getNeighbors(current)) {
            if (group.has(neighbor.id)) continue;
            if (!canChain(current, neighbor)) continue;
            group.set(neighbor.id, neighbor);
            stack.push(neighbor);
        }
    }

    return [...group.values()];
}

// Ids of the empty blocks some word block can currently reach.
//
// Each word block is a separate source and never a stepping stone, so two
// adjacent word blocks of the same color start two independent chains rather
// than one merged chain - same as removeMatchingGroup(), which stops at the
// first word block it meets.
export function findAnchoredEmpties(board){
    const anchored = new Set();

    for (const block of board.getBlocks()) {
        if (!block.word) continue;
        for (const reached of collectRemovalGroup(board, block)) {
            if (!reached.word) anchored.add(reached.id);
        }
    }

    return anchored;
}

// Empty blocks no word can reach. Word blocks are never orphaned: typing their
// own word always clears at least themselves.
export function findOrphanedEmpties(board){
    const anchored = findAnchoredEmpties(board);
    return board.getBlocks().filter((block) => !block.word && !anchored.has(block.id));
}

// Splits orphans into connected same-color clusters. A cluster is recolored as
// one unit - recoloring only part of it would just split off a new orphan.
export function groupOrphans(board, orphans){
    const remaining = new Map(orphans.map((block) => [block.id, block]));
    const components = [];

    for (const block of orphans) {
        if (!remaining.has(block.id)) continue;

        const component = [];
        const stack = [block];
        remaining.delete(block.id);

        while (stack.length > 0) {
            const current = stack.pop();
            component.push(current);
            for (const neighbor of board.getNeighbors(current)) {
                if (!remaining.has(neighbor.id)) continue;
                if (!canChain(current, neighbor)) continue;
                remaining.delete(neighbor.id);
                stack.push(neighbor);
            }
        }

        components.push(component);
    }

    return components;
}

// Blocks touching the cluster from outside it.
function borderOf(board, component){
    const inside = new Set(component.map((block) => block.id));
    const border = new Map();

    for (const block of component) {
        for (const neighbor of board.getNeighbors(block)) {
            if (inside.has(neighbor.id)) continue;
            border.set(neighbor.id, neighbor);
        }
    }

    return [...border.values()];
}

// How large a single-color blob of empties the cluster would end up part of if
// it took this color: itself, plus every same-color empty region it would fuse
// with. Used to keep the board from drifting toward one big monochrome mass.
function mergedRegionSize(board, component, color){
    const seen = new Set(component.map((block) => block.id));
    const stack = [...component];
    let size = component.length;

    while (stack.length > 0) {
        const current = stack.pop();
        for (const neighbor of board.getNeighbors(current)) {
            if (seen.has(neighbor.id)) continue;
            if (neighbor.word || neighbor.color !== color) continue;
            seen.add(neighbor.id);
            size += 1;
            stack.push(neighbor);
        }
    }

    return size;
}

// The colors this cluster could take that would actually anchor it, best
// first.
//
// A bordering word block anchors it in one hop and the player can see the word
// sitting against the blob, so those rank above colors borrowed from an
// already-anchored empty. Borrowing from another orphan is pointless: two
// unanchored clusters merged are still unanchored, so those colors aren't
// candidates at all.
//
// This ranks, it never rejects. Anchoring is the hard requirement and looks
// are the soft one, so there's no size cap that could talk us out of the only
// color available and into a needless repair.
function rankCandidates(board, component, anchoredIds){
    const tiers = new Map(); // color -> 0 for a word block, 1 for an anchored empty

    for (const neighbor of borderOf(board, component)) {
        const tier = neighbor.word ? 0 : (anchoredIds.has(neighbor.id) ? 1 : null);
        if (tier === null) continue;
        const known = tiers.get(neighbor.color);
        if (known === undefined || tier < known) tiers.set(neighbor.color, tier);
    }

    return [...tiers.entries()]
        .map(([color, tier]) => ({
            color,
            tier,
            regionSize: mergedRegionSize(board, component, color),
            jitter: Math.random(), // so repeated runs don't all break ties the same way
        }))
        .sort((a, b) => a.tier - b.tier || a.regionSize - b.regionSize || a.jitter - b.jitter);
}

// Restores the invariant across the whole board. Returns what it changed.
//
// The anchored set is recomputed on every iteration rather than patched. That
// keeps the loop honest when a recolor quietly absorbs a neighboring orphan
// cluster of the color just adopted, and it's what keeps the repairBlock
// fallback cheap: the repaired block turns into a word block, so on the next
// pass the rest of its cluster sees it as a bordering word and recolors to
// match in one step. One repair per stuck cluster, not one per block.
//
// Each iteration strictly shrinks the orphan set - a recolor anchors a whole
// cluster, a repair turns an empty into a word block - and anchoring only ever
// grows, since an orphan cluster by definition sits on nobody's chain. So the
// block count is a real bound, not a guess.
export function enforceRemovability(board, { repairBlock }){
    const result = { recolored: [], repaired: [], iterations: 0 };
    const limit = board.getBlocks().length + 1;

    while (result.iterations < limit) {
        const anchored = findAnchoredEmpties(board);
        const orphans = board.getBlocks().filter((block) => !block.word && !anchored.has(block.id));
        if (orphans.length === 0) return result;

        result.iterations += 1;

        const components = groupOrphans(board, orphans);

        // Across every cluster, take the single best move available and then
        // re-derive everything, instead of committing to a plan built on a
        // board state that the first recolor already invalidated.
        let best = null;
        for (const component of components) {
            const [candidate] = rankCandidates(board, component, anchored);
            if (!candidate) continue;
            if (best === null
                || candidate.tier < best.candidate.tier
                || (candidate.tier === best.candidate.tier
                    && candidate.regionSize < best.candidate.regionSize)) {
                best = { component, candidate };
            }
        }

        if (best) {
            for (const block of best.component) {
                result.recolored.push({ id: block.id, from: block.color, to: best.candidate.color });
                block.color = best.candidate.color;
            }
            continue;
        }

        // Nothing on the board can anchor any of these clusters - no bordering
        // word block, no bordering anchored empty. Late-game territory. Give
        // one block a word so its cluster has something to attach to.
        const stuck = components[0][0];
        repairBlock(stuck);
        result.repaired.push({ id: stuck.id });
    }

    console.warn("enforceRemovability: hit the iteration bound, board may still hold orphans");
    return result;
}
