/* 
 * PROJECT: AQUA MATCH PUZZLE
 * DEVELOPER: Emad Ibrahim
 * STUDIO: NexApp Development Studio
 * COPYRIGHT: © 2026 NexApp. All Rights Reserved.
 */

export const FISH_TYPES = {
    NEON_TETRA: {
        id: 'NEON_TETRA',
        name: 'Zebra Discus',
        sprite: 'assets/zebra-discus-fish.webp',
        rarity: 'Common',
        baseValue: 100,
        description: 'A round zebra-striped tropical discus with vibrant blue, orange, and red vertical stripes.',
        personality: 'social',
        biome: 'Bright Coral Reef'
    },
    GUPPY: {
        id: 'GUPPY',
        name: 'Clownfish',
        sprite: 'assets/red-orange-fish.webp',
        rarity: 'Common',
        baseValue: 100,
        description: 'A cute round red-orange striped clownfish with a cheerful smiling face.',
        personality: 'social',
        biome: 'Bright Coral Reef'
    },
    OSCAR: {
        id: 'OSCAR',
        name: 'Baby Octopus',
        sprite: 'assets/purple-octopus.webp',
        rarity: 'Epic',
        baseValue: 500,
        description: 'A cute purple baby octopus with big friendly eyes.',
        personality: 'territorial',
        biome: 'The Abyss'
    },
    GOLD_BUTTERFLY: {
        id: 'GOLD_BUTTERFLY',
        name: 'Angler Lightfish',
        sprite: 'assets/blue-lightfish.webp',
        rarity: 'Uncommon',
        baseValue: 200,
        description: 'A friendly deep-sea lightfish with a cute happy smile and a glowing yellow lure.',
        personality: 'curious',
        biome: 'Sunken Ship'
    },
    BLUE_TANG: {
        id: 'BLUE_TANG',
        name: 'Rainbow Fish',
        sprite: 'assets/cute-rainbow-fish.webp',
        rarity: 'Uncommon',
        baseValue: 200,
        description: 'A magical round rainbow fish with a bright yellow face, blue scales, and a purple tail.',
        personality: 'social',
        biome: 'Bright Coral Reef'
    },
    YELLOW_FIN: {
        id: 'YELLOW_FIN',
        name: 'Yellow Fin',
        sprite: 'assets/yellow-fin-fish.webp',
        rarity: 'Common',
        baseValue: 100,
        description: 'A sleek silver fish with vibrant yellow fins.',
        personality: 'solitary',
        biome: 'Ancient Shipwreck'
    },
    SILVER_BUTTERFLY: {
        id: 'SILVER_BUTTERFLY',
        name: 'Silver Butterfly',
        sprite: 'assets/silver-butterflyfish.webp',
        rarity: 'Uncommon',
        baseValue: 200,
        description: 'Glistening silver body with delicate butterfly-like fins.',
        personality: 'curious',
        biome: 'Kelp Forest'
    },
    PARADISE_FISH: {
        id: 'PARADISE_FISH',
        name: 'Paradise Fish',
        sprite: 'assets/paradisefish-sprite.webp',
        rarity: 'Rare',
        baseValue: 350,
        description: 'A stunning fish with long, flowing fins and vibrant red and blue stripes.',
        personality: 'territorial',
        biome: 'Midnight Zone'
    },
    NEON_GOLDFISH: {
        id: 'NEON_GOLDFISH',
        name: 'Neon Goldfish',
        sprite: 'assets/neongoldfish-sprite.webp',
        rarity: 'Rare',
        baseValue: 350,
        description: 'A glowing variation of the classic goldfish.',
        personality: 'lazy',
        biome: 'Bioluminescent Cave'
    },
    DAMSELFISH: {
        id: 'DAMSELFISH',
        name: 'Damselfish',
        sprite: 'assets/damselfish-sprite.webp',
        rarity: 'Common',
        baseValue: 100,
        description: 'A small, hardy fish often found in vibrant coral reefs.',
        personality: 'social',
        biome: 'Coral Garden'
    },
    ANGLERFISH: {
        id: 'ANGLERFISH',
        name: 'Anglerfish',
        sprite: 'assets/anglerfish-sprite-webp.webp',
        rarity: 'Rare',
        baseValue: 400,
        description: 'A master of the deep with a glowing lure to attract prey.',
        personality: 'solitary',
        biome: 'Midnight Zone',
        ability: 'BIOLUMINESCENT_LURE'
    },
    PEARL_POWERUP: {
        id: 'PEARL_POWERUP',
        name: 'Pearl Blast',
        sprite: 'assets/pearl-powerup-sprite-webp.webp',
        rarity: 'Power-up',
        baseValue: 1000,
        description: 'An explosive pearl that clears surrounding bubbles.'
    },
    RAINBOW_POWERUP: {
        id: 'RAINBOW_POWERUP',
        name: 'Rainbow Fish',
        sprite: 'assets/rainbow-fish-sprite.webp',
        rarity: 'Power-up',
        baseValue: 2000,
        description: 'A magical fish that clears all bubbles of a single species.'
    },
    SHIELD_POWERUP: {
        id: 'SHIELD_POWERUP',
        name: 'Bubble Shield',
        sprite: 'assets/bubble-shield-powerup.webp',
        rarity: 'Power-up',
        baseValue: 500,
        description: 'Protects you from using moves for 5 turns!'
    },
    GOLDEN_PEARL: {
        id: 'GOLDEN_PEARL',
        name: 'Golden Pearl',
        sprite: 'assets/golden-pearl-objective.webp',
        rarity: 'Legendary',
        baseValue: 5000,
        description: 'A legendary pearl that must be brought to the bottom!'
    },
    SEA_FRUIT: {
        id: 'SEA_FRUIT',
        name: 'Sea Fruit',
        sprite: 'assets/sea-fruit-objective-webp.webp',
        rarity: 'Artifact',
        baseValue: 3000,
        description: 'A delicious sea fruit! Bring it to the seafloor to complete the level.'
    },
    STONE_BLOCKER: {
        id: 'STONE_BLOCKER',
        name: 'Ancient Stone',
        sprite: 'assets/stone-blocker-webp.webp',
        rarity: 'Obstacle',
        baseValue: 0,
        description: 'An immovable ancient stone. Match nearby to clear it!'
    },
    DEEP_SEA_GUARDIAN: {
        id: 'DEEP_SEA_GUARDIAN',
        name: 'Abyssal Guardian',
        sprite: 'assets/deep-sea-guardian-leviathan.webp',
        rarity: 'Legendary',
        baseValue: 0,
        description: 'A massive 2x2 guardian of the abyss. It cannot be matched or moved!'
    },
    // BIOME ARTIFACTS
    PRISM_ARTIFACT: {
        id: 'PRISM_ARTIFACT',
        name: 'Sunlit Prism',
        sprite: 'assets/realistic-crystal-bubble-v2.webp',
        rarity: 'Artifact',
        baseValue: 1000,
        description: 'A prism that refracts light to clear random bubbles.'
    },
    CORAL_HEART_ARTIFACT: {
        id: 'CORAL_HEART_ARTIFACT',
        name: 'Coral Heart',
        sprite: 'assets/heart-icon.webp',
        rarity: 'Artifact',
        baseValue: 1000,
        description: 'The pulsing heart of the reef. Adds 5 extra moves!'
    },
    VINE_ARTIFACT: {
        id: 'VINE_ARTIFACT',
        name: 'Kelp Vine',
        sprite: 'assets/seaweed-lock.webp',
        rarity: 'Artifact',
        baseValue: 1000,
        description: 'A strong vine that clears all Seaweed from the board.'
    },
    LANTERN_ARTIFACT: {
        id: 'LANTERN_ARTIFACT',
        name: 'Abyssal Lantern',
        sprite: 'assets/glowing-bubble-tile.webp',
        rarity: 'Artifact',
        baseValue: 1000,
        description: 'Illuminates the dark, removing the darkness shroud!'
    },
    PRESSURE_ARTIFACT: {
        id: 'PRESSURE_ARTIFACT',
        name: 'Pressure Valve',
        sprite: 'assets/stone-blocker-webp.webp',
        rarity: 'Artifact',
        baseValue: 1000,
        description: 'Releases pressure to clear a wide cross of bubbles.'
    },
    MAGMA_CORE_ARTIFACT: {
        id: 'MAGMA_CORE_ARTIFACT',
        name: 'Magma Core',
        sprite: 'assets/volcanic-guardian-crab-webp.webp',
        rarity: 'Artifact',
        baseValue: 1000,
        description: 'A volatile core that explodes in a 2x2 area.'
    },
    ICE_PICK_ARTIFACT: {
        id: 'ICE_PICK_ARTIFACT',
        name: 'Frost Pick',
        sprite: 'assets/ice-crack-overlay-webp.webp',
        rarity: 'Artifact',
        baseValue: 1000,
        description: 'Clears all Ice and Frozen bubbles instantly.'
    },
    SPARK_ARTIFACT: {
        id: 'SPARK_ARTIFACT',
        name: 'Bio-Spark',
        sprite: 'assets/bioluminescent-guardian-jellyfish-webp.webp',
        rarity: 'Artifact',
        baseValue: 1000,
        description: 'Triggers a powerful Sonar Pulse!'
    },
    COMPASS_ARTIFACT: {
        id: 'COMPASS_ARTIFACT',
        name: 'Ancient Compass',
        sprite: 'assets/golden-pearl-objective.webp',
        rarity: 'Artifact',
        baseValue: 1000,
        description: 'Points the way through the shipwreck. Clears a random row and column.'
    },
    VOID_ORB_ARTIFACT: {
        id: 'VOID_ORB_ARTIFACT',
        name: 'Void Orb',
        sprite: 'assets/realistic-crystal-bubble.webp',
        rarity: 'Artifact',
        baseValue: 1000,
        description: 'A swirling orb that consumes the most common species on board.'
    }
};

export const HYBRID_SPECIES = {
    'SHALLOW_CORAL_HYBRID': {
        id: 'SHALLOW_CORAL_HYBRID',
        name: 'Chroma-Tang',
        baseSpecies: 'BLUE_TANG',
        patternSpecies: 'NEON_TETRA',
        rarity: 'Ultra-Rare',
        description: 'A mesmerizing hybrid with the Blue Tang body and iridescent Neon Tetra stripes.'
    },
    'KELP_MIDNIGHT_HYBRID': {
        id: 'KELP_MIDNIGHT_HYBRID',
        name: 'Ghost Butterfly',
        baseSpecies: 'SILVER_BUTTERFLY',
        patternSpecies: 'OSCAR',
        rarity: 'Ultra-Rare',
        description: 'A haunting hybrid with butterfly fins and dark, marbled Midnight patterns.'
    },
    'BIO_SHIPWRECK_HYBRID': {
        id: 'BIO_SHIPWRECK_HYBRID',
        name: 'Lume-Fin',
        baseSpecies: 'YELLOW_FIN',
        patternSpecies: 'NEON_GOLDFISH',
        rarity: 'Ultra-Rare',
        description: 'A glowing hybrid that combines the Yellow Fin silhouette with Bioluminescent spores.'
    }
};

export const COMMUNITY_CLEANUP_GOAL = {
    target: 1000000, // Total pearls contributed globally
    label: 'Restore the Great Reef',
    rewards: [
        { threshold: 0.25, name: 'Crystal Clear Water', reward: 'visual_upgrade' },
        { threshold: 0.5, name: 'Ancient Artifacts', reward: 'store_discount' },
        { threshold: 0.75, name: 'Legendary Spawning', reward: 'breeding_boost' },
        { threshold: 1.0, name: 'Eternal Bloom', reward: 'mega_pearl_pack' }
    ]
};

export const ABYSS_LEGENDARIES = [
    { 
        id: 'void_phoenix', 
        name: 'Void Phoenix', 
        sprite: 'assets/void-phoenix-fish-webp.webp', 
        depth: 100, 
        description: 'A flame-like fish that thrives in the pressure of the 100m mark.' 
    },
    { 
        id: 'hadal_dragon', 
        name: 'Hadal Dragon', 
        sprite: 'assets/hadal-dragon-goby-webp.webp', 
        depth: 500, 
        description: 'A majestic dragon-goby found only in the 500m Hadal trenches.' 
    },
    { 
        id: 'star_ray', 
        name: 'Infinite Star-Ray', 
        sprite: 'assets/infinite-star-ray-webp.webp', 
        depth: 1000, 
        description: 'A celestial creature that mirrors the night sky at 1000m depth.' 
    }
];

export const LEVEL_COUNT = 1000;

export const STORE_ITEMS = [
    {
        id: 'green_kelp',
        name: 'Giant Kelp',
        price: 50,
        sprite: 'assets/giant-kelp-decoration.webp',
        description: 'Tall, swaying green kelp that adds life to any aquarium.',
        type: 'plant'
    },
    {
        id: 'red_coral',
        name: 'Fire Coral',
        price: 150,
        sprite: 'assets/fire-coral-decoration.webp',
        description: 'A vibrant red coral that glows subtly in the deep.',
        type: 'decoration',
        hue: 330
    },
    {
        id: 'blue_crystal',
        name: 'Ocean Crystal',
        price: 300,
        sprite: 'assets/realistic-crystal-bubble-v2.webp',
        description: 'A rare blue crystal found in the deepest Atlantis ruins.',
        type: 'decoration',
        hue: 200
    },
    {
        id: 'golden_chest',
        name: 'Mini Treasure',
        price: 500,
        sprite: 'assets/treasure-chest-closed.webp',
        description: 'A small, golden chest that might hold ancient secrets.',
        type: 'decoration'
    }
];

export const HABITAT_UPGRADES = [
    {
        id: 'clear_water',
        name: 'Crystal Water',
        price: 500,
        sprite: 'assets/realistic-crystal-bubble-v2.webp',
        description: 'Ultra-clear water for perfect visibility.',
        type: 'habitat',
        effect: { tint: 0xffffff, fogDensity: 0.01 },
        music: { baseFreq: 110, type: 'sine', lfoSpeed: 0.1 }
    },
    {
        id: 'midnight_tint',
        name: 'Midnight Tint',
        price: 1000,
        sprite: 'assets/biome-midnight-zone.webp',
        description: 'Deep blue atmospheric water for a moody tank.',
        type: 'habitat',
        effect: { tint: 0x001133, fogDensity: 0.05 },
        music: { baseFreq: 55, type: 'square', lfoSpeed: 0.05, filterFreq: 100 }
    },
    {
        id: 'tropical_glow',
        name: 'Tropical Glow',
        price: 1500,
        sprite: 'assets/biome-sunlit-shallows.webp',
        description: 'Warm, golden water that feels like a sunset.',
        type: 'habitat',
        effect: { tint: 0xffaa00, fogDensity: 0.02 },
        music: { baseFreq: 220, type: 'triangle', lfoSpeed: 0.2, filterFreq: 800 }
    },
    {
        id: 'biolume_deep',
        name: 'Biolume Deep',
        price: 2000,
        sprite: 'assets/biome-bioluminescent-grotto.webp',
        description: 'Purple neon waters with pulsing bio-light.',
        type: 'habitat',
        effect: { tint: 0x110022, fogDensity: 0.08, pulse: true },
        music: { baseFreq: 82, type: 'sawtooth', lfoSpeed: 0.5, filterFreq: 300, pulseMusic: true }
    }
];

export const GENETIC_TRAITS = {
    ANCIENT_WISDOM: { name: 'Ancient Wisdom', description: 'Gains XP 50% faster.', icon: '🧠' },
    AQUA_SPEED: { name: 'Aqua Speed', description: 'Swims 25% faster in the tank.', icon: '⚡' },
    PEARL_MAGNET: { name: 'Pearl Magnet', description: 'Higher chance to find pearls in descent.', icon: '🧲' },
    RESILIENT_SCALE: { name: 'Resilient Scale', description: 'Resists 1 environmental hazard.', icon: '🛡️' }
};

export const CLEANLINESS_DECAY_RATE = 0.5; // % per second
export const CLEANING_RATE = 10.0; // % per second of scrubbing
export const ALGAE_MIN_CLEANLINESS = 80; // Start showing algae below this %
export const HUNGER_DECAY_RATE = 0.3; // % per second
export const AUTO_FEED_RATE = 0.8; // % per second from feeder
export const BREEDING_HAPPINESS_THRESHOLD = 95;
export const BREEDING_COOLDOWN = 60; // seconds
export const BREEDING_CHANCE = 0.05; // 5% chance per second when conditions met

// MATCH TARGET CONFIGURATION
export const BASE_FISH_COLLECT_TARGET = 15; // Configure how many fish must be matched to advance
export const TARGET_SCALING_RATE = 2; // Extra fish per 10 levels

export const PEARL_PACKS = [
    { id: 'pack_small', name: 'Pearl Pouch', amount: 100, price: '$0.99', icon: '⚪' },
    { id: 'pack_medium', name: 'Pearl Crate', amount: 550, price: '$4.99', icon: '📦', bonus: '10% Extra' },
    { id: 'pack_large', name: 'Pearl Chest', amount: 1200, price: '$9.99', icon: '🎁', bonus: '20% Extra' },
    { id: 'pack_vault', name: 'Pearl Vault', amount: 3000, price: '$19.99', icon: '🏛️', bonus: '50% Extra' }
];

export const LIFE_PACKS = [
    { id: 'life_refill', name: 'Instant Refill', amount: 25, price: 200, icon: '❤️', description: 'Fully restores your energy!' },
    { id: 'life_starter', name: 'Energy Shot', amount: 5, price: 50, icon: '⚡', description: 'Get 5 quick lives.' }
];

export const DAILY_MISSIONS = [
    { id: 'fish_hunter', label: 'Fish Hunter', description: 'Match 100 Blue Fish', target: 100, type: 'match_species', species: 'BLUE_TANG', reward: 10 },
    { id: 'level_explorer', label: 'Level Explorer', description: 'Win 3 levels', target: 3, type: 'win_level', reward: 'hammer', rewardAmount: 1 },
    { id: 'combo_master', label: 'Combo Master', description: 'Create 5 Color Bombs', target: 5, type: 'create_powerup', powerup: 'RAINBOW_POWERUP', reward: 20 }
];

export const DAILY_REWARDS = [
    { day: 1, type: 'pearls', amount: 50, icon: '⚪', label: '50 Pearls' },
    { day: 2, type: 'lives', amount: 2, icon: '❤️', label: '2 Hearts' },
    { day: 3, type: 'hammer', amount: 1, icon: 'assets/pearl-powerup-sprite-webp.webp', label: '1 Hammer' },
    { day: 4, type: 'colorBomb', amount: 1, icon: 'assets/rainbow-fish-sprite.webp', label: '1 Color Bomb' },
    { day: 5, type: 'shuffle', amount: 1, icon: 'assets/realistic-crystal-bubble-v2.webp', label: '1 Shuffle' },
    { day: 6, type: 'lives', amount: 5, icon: '❤️', label: '5 Hearts' },
    { day: 7, type: 'jackpot', amount: 500, icon: '🎁', label: 'Jackpot!', 
      bonus: { pearls: 500, hammer: 2, shuffle: 2, colorBomb: 2, lives: 10 } 
    }
];

export const BOOSTER_PACKS = [
    { id: 'hammer', name: 'Hammer', price: 100, icon: 'assets/pearl-powerup-sprite-webp.webp', description: 'Clear any bubble!', amount: 1 },
    { id: 'shuffle', name: 'Shuffle', price: 150, icon: '🔀', description: 'Mix the grid!', amount: 1 },
    { id: 'colorBomb', name: 'Color Bomb', price: 250, icon: 'assets/rainbow-fish-sprite.webp', description: 'Clear all of one color!', amount: 1 },
    { id: 'rocket', name: 'Rocket', price: 150, icon: '🚀', description: 'Clear a whole row!', amount: 1 },
    { id: 'rocketV', name: 'Vertical Rocket', price: 150, icon: '🚀', description: 'Clear a whole column!', amount: 1 }
];

export const UTILITY_GADGETS = [
    { 
        id: 'depth_scanner', 
        name: 'Depth Scanner', 
        price: 500, 
        icon: '📡', 
        description: 'Passive: Increases depth gained per match by 20%.', 
        type: 'passive',
        effect: { depthMultiplier: 1.2 }
    },
    { 
        id: 'hazard_deflector', 
        name: 'Hazard Deflector', 
        price: 450, 
        icon: '🛡️', 
        description: 'Auto-blocks the next 3 environmental hazards.', 
        type: 'charge',
        charges: 3
    },
    { 
        id: 'sonar_pulse', 
        name: 'Sonar Pulse', 
        price: 600, 
        icon: '🔊', 
        description: 'Clears all Seaweed, Ice, and Stones from the board.', 
        type: 'active'
    }
];

export const ABYSSAL_VAULT_ACHIEVEMENTS = [
    {
        id: 'collector_bronze',
        name: 'Novice Collector',
        description: 'Collect 3 different species of fish.',
        target: 3,
        type: 'collection_size',
        reward: 100
    },
    {
        id: 'collector_silver',
        name: 'Expert Collector',
        description: 'Collect 10 different species of fish.',
        target: 10,
        type: 'collection_size',
        reward: 500
    },
    {
        id: 'legendary_finder',
        name: 'Legendary Discovery',
        description: 'Find your first Legendary fish in the Abyss.',
        target: 1,
        type: 'legendary_count',
        reward: 1000
    },
    {
        id: 'abyss_diver',
        name: 'Abyss Diver',
        description: 'Reach a depth of 500m in the Abyss.',
        target: 500,
        type: 'max_depth',
        reward: 750
    },
    {
        id: 'hybrid_master',
        name: 'Genetic Architect',
        description: 'Successfully breed your first Hybrid species.',
        target: 1,
        type: 'hybrid_count',
        reward: 1200
    }
];
