/* 
 * PROJECT: AQUA MATCH PUZZLE
 * DEVELOPER: Emad Ibrahim
 * STUDIO: NexApp Development Studio
 * COPYRIGHT: © 2026 NexApp. All Rights Reserved.
 */

import { FISH_TYPES, BASE_FISH_COLLECT_TARGET, TARGET_SCALING_RATE } from './config.js';

export class LevelGenerator {
    constructor() {
        this.biomes = [
            { 
                name: 'Bright Coral Reef', 
                color: '#00aaff', 
                fogColor: 0x00aaff, 
                weather: 'bubbles', 
                hazard: null, 
                wildlife: 'minnows',
                bg: 'assets/biome-sunlit-shallows.webp'
            },
            { 
                name: 'Sunken Ship', 
                color: '#008080', 
                fogColor: 0x002222, 
                weather: 'debris', 
                hazard: 'ink', 
                wildlife: 'shrimp',
                bg: 'assets/biome-ancient-shipwreck.webp'
            },
            { 
                name: 'The Abyss', 
                color: '#00008b', 
                fogColor: 0x000511, 
                weather: 'biolume', 
                hazard: 'darkness', 
                wildlife: 'jellyfish',
                bg: 'assets/biome-midnight-zone.webp'
            },
            { 
                name: 'Deep Trench', 
                color: '#4b0082', 
                fogColor: 0x050011, 
                weather: 'ash', 
                hazard: 'magma', 
                wildlife: 'shrimp',
                bg: 'assets/biome-volcanic-vents.webp'
            },
            { 
                name: 'The Hadal Void', 
                color: '#000000', 
                fogColor: 0x020202, 
                weather: 'void_particles', 
                hazard: 'crush', 
                wildlife: 'jellyfish',
                bg: 'assets/biome-hadal-void.webp'
            }
        ];
    }

    generate(levelIndex) {
        const level = levelIndex + 1;
        const biomeIndex = Math.floor(levelIndex / 200); // 5 biomes, 200 levels each
        const biome = this.biomes[Math.min(biomeIndex, this.biomes.length - 1)];

        // --- GRID PATTERN LOGIC ---
        // ... (rest of the patterns)
        // Define standard shapes: 1 = Active, 0 = Hole
        const patterns = {
            square: (size) => Array(size).fill().map(() => Array(size).fill(1)),
            cross: (size) => Array(size).fill().map((_, r) => Array(size).fill().map((_, c) => {
                const mid = Math.floor(size / 2);
                return (r === mid || c === mid || (r >= mid-1 && r <= mid+1 && c >= mid-1 && c <= mid+1)) ? 1 : 0;
            })),
            diamond: (size) => Array(size).fill().map((_, r) => Array(size).fill().map((_, c) => {
                const mid = Math.floor(size / 2);
                return (Math.abs(r - mid) + Math.abs(c - mid) <= mid + 1) ? 1 : 0;
            })),
            donut: (size) => Array(size).fill().map((_, r) => Array(size).fill().map((_, c) => {
                const mid = Math.floor(size / 2);
                const dist = Math.sqrt(Math.pow(r - mid, 2) + Math.pow(c - mid, 2));
                return (dist > 1.2 && dist < size/2 + 0.5) ? 1 : 0;
            })),
            hourglass: (size) => Array(size).fill().map((_, r) => Array(size).fill().map((_, c) => {
                return (Math.abs(c - size/2 + 0.5) <= Math.abs(r - size/2 + 0.5) + 0.5) ? 1 : 0;
            })),
            heart: (size) => Array(size).fill().map((_, r) => Array(size).fill().map((_, c) => {
                // Simplified heart shape for small grids
                const mid = Math.floor(size / 2);
                const nr = (r / size) * 2 - 1;
                const nc = (c / size) * 2 - 1;
                // Heart formula: (x^2 + y^2 - 1)^3 - x^2 * y^3 <= 0
                const x = nc;
                const y = -nr + 0.3; // Offset to center better
                return (Math.pow(x*x + y*y - 1, 3) - x*x * Math.pow(y, 3) <= 0.1) ? 1 : 0;
            }))
        };

        const patternNames = ['square', 'cross', 'diamond', 'donut', 'hourglass', 'heart'];
        
        // New Biome-Specific Mechanics
        const isSunken = biome.name === 'Sunken Ship';
        const isAbyss = biome.name === 'The Abyss';
        const isTrench = biome.name === 'Deep Trench';
        const isHadal = biome.name === 'The Hadal Void';
        const isDark = isAbyss || isTrench || isHadal;

        // Unlock new patterns every 10 levels
        const unlockedPatternsCount = Math.min(patternNames.length, 1 + Math.floor(level / 15));
        const patternType = isAbyss ? patternNames[level % patternNames.length] : patternNames[level % unlockedPatternsCount];
        
        const gridSize = Math.min(8, 6 + Math.floor(level / 50));
        const layout = patterns[patternType](gridSize);

        // Difficulty curves
        // Start at 40 moves, decrease by 1 every 25 levels, floor at 15.
        // FINAL SPRINT BALANCE: Increase move floor slightly for Hadal Void (800+)
        const moveFloor = level > 800 ? 20 : 15;
        const moves = Math.max(moveFloor, 40 - Math.floor(level / 25));
        
        // Target Score: Scale more aggressively in middle, but stabilize for endgame to avoid frustration
        let targetScore = 2000 + (level * 600);
        if (level > 800) {
            targetScore = 2000 + (800 * 600) + ((level - 800) * 400); 
        }
        
        // Probabilities for obstacles
        const seaweedChance = level > 10 ? Math.min(0.25, (level - 10) * 0.003) : 0;
        const iceChance = level > 25 ? Math.min(0.2, (level - 25) * 0.003) : 0;
        
        // Refined Stone Chance (Magma Stones in Deep Trench / Abyss)
        let stoneChance = 0;
        if (level > 50) {
            stoneChance = Math.min(0.15, (level - 50) * 0.002);
            // Cap difficulty spike in levels 600-800
            if (level >= 600 && level <= 800) {
                stoneChance = Math.min(0.18, 0.12 + (level - 600) * 0.0003); 
            } else if (level > 800) {
                // Scaling endgame stones: 0.18 at 801 to ~0.26 at 1000
                stoneChance = Math.min(0.26, 0.18 + (level - 800) * 0.0004);
            }
        }
        
        const frozenChance = (isAbyss || level > 500) ? 0.15 : 0;
        const weightChance = isSunken ? 0.1 : 0;
        const pressureChance = isTrench ? 0.2 : 0;

        const multiHitChance = level > 100 ? Math.min(0.5, (level - 100) * 0.005) : 0;

        const fruitDropCount = Math.min(5, Math.floor(level / 50) + 1);

        // Determine objectives
        const objectives = [{ type: 'score', target: targetScore, current: 0 }];
        
        if (fruitDropCount > 0) {
            objectives.push({ 
                type: 'collect', 
                target: fruitDropCount, 
                current: 0,
                id: 'SEA_FRUIT', 
                icon: 'assets/sea-fruit-objective-webp.webp',
                label: 'Sea Fruit'
            });
        }

        if (level > 30 && level % 7 === 0) {
            objectives.push({
                type: 'collect',
                target: 3 + Math.floor(level / 40),
                current: 0,
                id: 'STONE_BLOCKER',
                icon: 'assets/stone-blocker-webp.webp',
                label: 'Clear Stones'
            });
        }

        // Determine available fish types (slowly increase pool)
        const allFish = Object.values(FISH_TYPES).filter(f => !f.id.includes('POWERUP') && !f.id.includes('ARTIFACT') && f.id !== 'GOLDEN_PEARL' && f.id !== 'STONE_BLOCKER' && f.id !== 'SEA_FRUIT');
        const poolSize = Math.min(allFish.length, 4 + Math.floor(level / 100));
        const availableTypes = allFish.slice(0, poolSize);

        // Add a primary dynamic fish collection objective
        // Randomly select target species for variety every stage
        const targetSpecies = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        objectives.push({
            type: 'collect',
            target: BASE_FISH_COLLECT_TARGET + Math.floor(level / 10) * TARGET_SCALING_RATE,
            current: 0,
            species: targetSpecies.id,
            icon: targetSpecies.sprite,
            label: `Match ${targetSpecies.name}`,
            isPrimary: true // Mark as primary objective
        });

        // Add Biome Artifact to the pool
        const artifactMap = {
            'Bright Coral Reef': 'PRISM_ARTIFACT',
            'Sunken Ship': 'COMPASS_ARTIFACT',
            'The Abyss': 'LANTERN_ARTIFACT',
            'Deep Trench': 'MAGMA_CORE_ARTIFACT',
            'The Hadal Void': 'VOID_ORB_ARTIFACT'
        };
        const artifactId = artifactMap[biome.name];
        if (artifactId && FISH_TYPES[artifactId]) {
            availableTypes.push(FISH_TYPES[artifactId]);
        }

        const starRequirement = levelIndex === 0 ? 0 : Math.floor(levelIndex * 2.5);

        return {
            level: level,
            biome: biome,
            moves: moves,
            objectives: objectives,
            availableTypes: availableTypes,
            seaweedChance: seaweedChance,
            iceChance: iceChance,
            stoneChance: stoneChance,
            frozenChance: frozenChance,
            weightChance: weightChance,
            pressureChance: pressureChance,
            isDark: isDark,
            pearlDropCount: fruitDropCount,
            gridSize: gridSize,
            layout: layout,
            starRequirement: starRequirement,
            multiHitChance: multiHitChance
        };
    }
}
