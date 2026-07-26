/* 
 * PROJECT: AQUA MATCH PUZZLE
 * DEVELOPER: Emad Ibrahim
 * STUDIO: NexApp Development Studio
 * COPYRIGHT: © 2026 NexApp. All Rights Reserved.
 */

/**
 * Board.js
 * Handles the pure logic and state of the Match-3 grid.
 * Separates core game mechanics from the THREE.js visualization.
 */

export class Board {
    constructor(gridSize, layout) {
        this.gridSize = gridSize;
        this.layout = layout; // 2D array: 1 = playable, 0 = hole
        this.grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
    }

    /**
     * Finds all contiguous match groups of 3 or more.
     * Consolidates overlapping horizontal and vertical matches (L, T, + shapes).
     */
    findMatches() {
        const matches = [];
        const visited = new Set();

        // 1. Find all horizontal and vertical segments
        const horizontalSegments = [];
        const verticalSegments = [];

        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const piece = this.grid[r][c];
                if (!piece || piece === 'HOLE' || piece === 'OCCUPIED_BY_GUARDIAN') continue;
                if (piece.fishConfig.id === 'GOLDEN_PEARL' || piece.isGuardian || piece.isStone) continue;

                // Horizontal
                let hCount = 1;
                while (c + hCount < this.gridSize) {
                    const next = this.grid[r][c + hCount];
                    if (next && next !== 'HOLE' && next.fishConfig && next.fishConfig.id === piece.fishConfig.id && !next.isStone && !next.isGuardian) {
                        hCount++;
                    } else break;
                }
                if (hCount >= 3) {
                    const segment = [];
                    for (let i = 0; i < hCount; i++) segment.push(this.grid[r][c + i]);
                    horizontalSegments.push(segment);
                    c += hCount - 1;
                }
            }
        }

        for (let c = 0; c < this.gridSize; c++) {
            for (let r = 0; r < this.gridSize; r++) {
                const piece = this.grid[r][c];
                if (!piece || piece === 'HOLE' || piece === 'OCCUPIED_BY_GUARDIAN') continue;
                if (piece.fishConfig.id === 'GOLDEN_PEARL' || piece.isGuardian || piece.isStone) continue;

                // Vertical
                let vCount = 1;
                while (r + vCount < this.gridSize) {
                    const next = this.grid[r + vCount][c];
                    if (next && next !== 'HOLE' && next.fishConfig && next.fishConfig.id === piece.fishConfig.id && !next.isStone && !next.isGuardian) {
                        vCount++;
                    } else break;
                }
                if (vCount >= 3) {
                    const segment = [];
                    for (let i = 0; i < vCount; i++) segment.push(this.grid[r + i][c]);
                    verticalSegments.push(segment);
                    r += vCount - 1;
                }
            }
        }

        // 2. Consolidate segments that share pieces
        const allSegments = [...horizontalSegments, ...verticalSegments];
        const consolidated = [];

        allSegments.forEach(segment => {
            let found = false;
            for (let group of consolidated) {
                if (segment.some(p => group.includes(p))) {
                    segment.forEach(p => { if (!group.includes(p)) group.push(p); });
                    found = true;
                    break;
                }
            }
            if (!found) consolidated.push([...segment]);
        });

        return consolidated;
    }

    /**
     * Returns true if at least one valid move exists on the board.
     */
    isMoveAvailable() {
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const piece = this.grid[r][c];
                if (!piece || piece === 'HOLE' || piece.isGuardian || piece.isStone) continue;

                // Try swapping with right and down
                const neighbors = [[r, c + 1], [r + 1, c]];
                for (const [nr, nc] of neighbors) {
                    if (nr < this.gridSize && nc < this.gridSize) {
                        const neighbor = this.grid[nr][nc];
                        if (neighbor && typeof neighbor === 'object' && !neighbor.isGuardian && !neighbor.isStone) {
                            // Virtual swap
                            this.grid[r][c] = neighbor;
                            this.grid[nr][nc] = piece;

                            const matches = this.findMatches();
                            
                            // Swap back
                            this.grid[r][c] = piece;
                            this.grid[nr][nc] = neighbor;

                            if (matches.length > 0) return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    /**
     * Returns a list of all valid swap moves.
     */
    findPossibleMoves() {
        const possibleMoves = [];
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const piece = this.grid[r][c];
                if (!piece || piece === 'HOLE' || piece.isGuardian || piece.isStone) continue;

                // Try swapping with right and down
                const neighbors = [[r, c + 1], [r + 1, c]];
                for (const [nr, nc] of neighbors) {
                    if (nr < this.gridSize && nc < this.gridSize) {
                        const neighbor = this.grid[nr][nc];
                        if (neighbor && typeof neighbor === 'object' && !neighbor.isGuardian && !neighbor.isStone) {
                            // Virtual swap
                            this.grid[r][c] = neighbor;
                            this.grid[nr][nc] = piece;

                            const matches = this.findMatches();
                            
                            // Swap back
                            this.grid[r][c] = piece;
                            this.grid[nr][nc] = neighbor;

                            if (matches.length > 0) {
                                possibleMoves.push({ r1: r, c1: c, r2: nr, c2: nc });
                            }
                        }
                    }
                }
            }
        }
        return possibleMoves;
    }

    /**
     * Logic for damaging Stone Blocks and Weights adjacent to a cleared piece.
     * @param {BubblePiece} piece The piece being cleared.
     * @returns {Array} List of obstacles that were fully destroyed.
     */
    checkAdjacentObstacles(piece) {
        if (!piece || !piece.gridPos) return [];
        
        const { r, c } = piece.gridPos;
        const destroyedObstacles = [];
        const adj = [
            { r: r - 1, c: c }, { r: r + 1, c: c }, 
            { r: r, c: c - 1 }, { r: r, c: c + 1 }
        ];

        adj.forEach(pos => {
            if (pos.r >= 0 && pos.r < this.gridSize && pos.c >= 0 && pos.c < this.gridSize) {
                const neighbor = this.grid[pos.r][pos.c];
                if (neighbor && (neighbor.isStone || neighbor.isWeight) && !neighbor.isMatching) {
                    const isDestroyed = neighbor.damageObstacle();
                    if (isDestroyed) {
                        neighbor.onMatch();
                        this.grid[pos.r][pos.c] = null;
                        destroyedObstacles.push(neighbor);
                    }
                }
            }
        });

        return destroyedObstacles;
    }
}
