// 1. تهيئة الـ SDK تلقائياً عند تحميل اللعبة
window.addEventListener('load', () => {
    if (window.CrazyGames && window.CrazyGames.SDK) {
        window.CrazyGames.SDK.game.init();
        console.log("CrazyGames SDK Initialized.");
    }
});

// 2. إخبار المنصة أن اللعب قد بدأ (عند بدء المرحلة أو العودة للعب)
function notifyGameplayStart() {
    if (window.CrazyGames && window.CrazyGames.SDK) {
        window.CrazyGames.SDK.game.gameplayStart();
    }
}

// 3. إخبار المنصة أن اللعب توقف (عند نهاية المرحلة أو الخسارة)
function notifyGameplayStop() {
    if (window.CrazyGames && window.CrazyGames.SDK) {
        window.CrazyGames.SDK.game.gameplayStop();
    }
}

// 4. دالة عرض الإعلان البيني (Midgame Ad) عند الانتقال بين المراحل أو عند الخسارة
function showInterstitialAd(onAdComplete) {
    if (window.CrazyGames && window.CrazyGames.SDK) {
        notifyGameplayStop(); // إيقاف اللعبة وإسكات الصوت مؤقتاً أثناء الإعلان
        
        window.CrazyGames.SDK.ad.requestAd("midgame", {
            adFinished: () => {
                console.log("Ad finished successfully.");
                notifyGameplayStart(); // استئناف اللعب
                if (onAdComplete) onAdComplete();
            },
            adError: (error) => {
                console.log("Ad error or blocked:", error);
                notifyGameplayStart(); // استئناف اللعب حتى لو فشل الإعلان
                if (onAdComplete) onAdComplete();
            },
            adStarted: () => {
                console.log("Ad started.");
            }
        });
    } else {
        // لو كنت تجرب اللعبة محلياً على جهازك والـ SDK غير موجود
        if (onAdComplete) onAdComplete();
    }
}
/* 
 * PROJECT: AQUA MATCH PUZZLE
 * DEVELOPER: Emad Ibrahim
 * STUDIO: NexApp Development Studio
 * COPYRIGHT: © 2026 NexApp. All Rights Reserved.
 * ACCESS_KEY: NexApp#AquaGame1966
 */
import * as THREE from 'three';
import * as Tone from 'tone';
import { LEVEL_COUNT, FISH_TYPES, HYBRID_SPECIES, ABYSS_LEGENDARIES, STORE_ITEMS, HABITAT_UPGRADES, DAILY_MISSIONS, CLEANLINESS_DECAY_RATE, ALGAE_MIN_CLEANLINESS, CLEANING_RATE, HUNGER_DECAY_RATE, AUTO_FEED_RATE, BREEDING_HAPPINESS_THRESHOLD, BREEDING_COOLDOWN, BREEDING_CHANCE, PEARL_PACKS, COMMUNITY_CLEANUP_GOAL, ABYSSAL_VAULT_ACHIEVEMENTS, GENETIC_TRAITS } from './config.js';
import { LevelGenerator } from './Level_Data.js';
import { BubblePiece } from './BubblePiece.js';
import { Grid } from './Grid.js';
import { Fish } from './Fish.js';
import { VolcanicVent } from './VolcanicVent.js';
import { AudioManager } from './AudioManager.js';
import { UIManager } from './UIManager.js';
import { Decoration } from './Decoration.js';
import { dbManager } from './DatabaseManager.js';

class Game {
    constructor() {
        // --- LIVE CRAZYGAMES SDK V2 INTEGRATION ---
        this.isAdPlaying = false;
        this.cgsdk = null;
        
        // --- INITIALIZE STATE IMMEDIATELY ---
        this.lives = 25;
        this.maxLives = 25;
        this.pearls = 0;
        this.boosters = {
            hammer: 3,
            shuffle: 2,
            colorBomb: 1,
            rocket: 2,
            rocketV: 2,
            sonar_pulse: 0,
            depth_scanner: 0,
            hazard_deflector: 0
        };
        this.collectedSpecies = new Set();
        this.fishInventory = [];
        this.levelStats = {};
        
        const isRosebud = window.location.hostname.includes('rosebud') || 
                          window.location.hostname.includes('localhost') || 
                          window.location.hostname === '127.0.0.1' ||
                          window.location.hostname === '' || // Iframe sometimes has empty hostname
                          window.location.hostname.includes('preview') ||
                          window.location.hostname.includes('cloud-revision') ||
                          window.location.hostname.includes('rosebud-app.io') ||
                          window.location.hostname.includes('rosebud-ai.com');
        
        if (!isRosebud) {
            // Load SDK dynamically if not in Rosebud preview to prevent console warnings
            const script = document.createElement('script');
            script.src = "https://sdk.crazygames.com/crazygames-sdk-v2.js";
            script.onload = () => {
                const sdk = window.CrazyGames && window.CrazyGames.SDK;
                if (sdk && sdk.environment !== 'disabled') {
                    this.cgsdk = sdk;
                    console.log("[CrazyGames SDK] Initialized. Environment:", sdk.environment);
                    
                    // Only request real banner if we are in a live or local environment that supports it
                    if (sdk.environment === 'live' || sdk.environment === 'local') {
                        this.cgsdk.ad.requestAd("banner", {
                            id: "crazy-banner-container",
                            width: 300,
                            height: 50,
                            adFinished: () => {
                                console.log("[CrazyGames SDK] Live Banner Ad loaded successfully.");
                                const bannerContent = document.getElementById('crazy-banner-content');
                                if (bannerContent) bannerContent.style.opacity = '0'; // Cleanly fade loader label
                            },
                            adError: (error) => {
                                console.warn("[CrazyGames SDK] Banner ad failed:", error);
                                const bannerContent = document.getElementById('crazy-banner-content');
                                if (bannerContent) bannerContent.innerText = "AQUA MATCH: DEEP SEA DESCENT";
                            }
                        });
                    } else {
                        console.log("[CrazyGames SDK] Environment is not live/local. Skipping real banner ad.");
                    }
                } else {
                    console.log("[CrazyGames SDK] SDK disabled on this domain. Using simulated ads.");
                }
            };
            document.head.appendChild(script);
        } else {
            console.log("[CrazyGames SDK] Development environment detected. SDK loading skipped.");
        }

        // Setup Three.js Default Loading Manager to update our NexApp Splash Screen progress bar
        this.assetsAreLoaded = false;
        this.minimumTimeElapsed = false;
        
        const updateProgressBar = (percent) => {
            const bar = document.getElementById('splash-loader-bar');
            const text = document.getElementById('splash-loader-text');
            const validPercent = isNaN(percent) ? 0 : Math.min(100, Math.max(0, percent));
            if (bar) bar.style.width = `${validPercent}%`;
            if (text) text.innerText = `Loading Deep Sea Reefs... ${Math.round(validPercent)}%`;
        };

        THREE.DefaultLoadingManager.onStart = (url, loaded, total) => {
            const percent = total > 0 ? (loaded / total) * 100 : 0;
            updateProgressBar(percent);
        };

        THREE.DefaultLoadingManager.onProgress = (url, loaded, total) => {
            const percent = total > 0 ? (loaded / total) * 100 : 0;
            updateProgressBar(percent);
        };

        THREE.DefaultLoadingManager.onLoad = () => {
            console.log("[LoadingManager] All Three.js assets fully loaded.");
            updateProgressBar(100);
            this.assetsAreLoaded = true;
            this.checkSplashCompletion();
        };

        THREE.DefaultLoadingManager.onError = (url) => {
            console.warn("[LoadingManager] Error loading asset:", url);
        };

        // Minimum show duration of 1.5s for studio branding showcase
        setTimeout(() => {
            this.minimumTimeElapsed = true;
            this.checkSplashCompletion();
        }, 1500);

        // Safety fallback timer to prevent getting stuck if assets load near-instantly or are cached
        setTimeout(() => {
            if (!this.assetsAreLoaded) {
                console.log("[LoadingManager] Backup timer fired. Resolving splash screen.");
                this.assetsAreLoaded = true;
                this.checkSplashCompletion();
            }
        }, 3500);

        const startBtn = document.getElementById('splash-start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', async () => {
                console.log("[Splash] Start clicked. Initializing procedural audio & fading splash out...");
                if (this.audio) {
                    await this.audio.init();
                    this.audio.playClick();
                }
                
                const splash = document.getElementById('nexapp-splash');
                if (splash) {
                    splash.classList.add('fade-out');
                    setTimeout(() => {
                        splash.remove();
                        // Automatically start Level 1 and reveal the matching grid immediately
                        this.startLevel(0);
                    }, 800);
                }
            });
        }

        this.levelGenerator = new LevelGenerator();
        this.scene = new THREE.Scene();
        
        const frame = document.getElementById('game-frame') || document.body;
        const rect = frame.getBoundingClientRect();
        
        this.camera = new THREE.PerspectiveCamera(75, rect.width / rect.height, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(rect.width, rect.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        frame.appendChild(this.renderer.domElement);

        this.worldSize = 7.2;
        this.camera.position.z = 12;
        window.gameCamera = this.camera; // Expose for UI positioning

        this.audio = new AudioManager();
        window.gameAudioManager = this.audio; // Expose for UI access
        window.gameFISH_TYPES = FISH_TYPES; // Expose for UI access
        window.gameLives = this.lives; // Expose for UI check
        
        this.currentLevelIndex = 0;
        this.currentLevelConfig = null;
        this.grid = null;
        this.aquariumFish = [];
        this.aquariumFood = [];
        this.score = 0;
        this.moves = 0;
        this.shieldTurns = 0; // Turns remaining for Bubble Shield
        this.isLevelActive = false;
        this.isCompleting = false;
        this.collectedSpecies = new Set();
        this.fishInventory = []; // Array of { speciesId, traits }
        this.pearls = 0;
        this.communityPearls = 0; // Simulated global pearls
        this.purchasedDecorations = [];
        this.purchasedHabitats = ['clear_water'];
        this.activeHabitatId = 'clear_water';
        this.tankCleanliness = 100;
        this.fishSatiety = 100;
        this.isPointerDown = false;
        this.swipeStartPos = { x: 0, y: 0 };
        this.swipePiece = null;
        this.sessionDepth = 0; // Initialize session depth
        
        // Camera Shake State
        this.shakeIntensity = 0;
        this.baseCameraPos = new THREE.Vector3(0, 0, 12);
        
        // Lives System
        this.lastLifeTime = Date.now();
        this.lifeRefillRate = 120000; // 2 minutes per life
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Migration Event State
        this.migrationEvent = {
            active: false,
            targetSpecies: null,
            timer: 120, // Start first event in 2 mins
            duration: 60
        };

        // Tournament State
        this.tournament = {
            active: true,
            name: "The Abyssal Sprint",
            endTime: Date.now() + 86400000, // 24 hours from now
            playerDepth: 0,
            leaderboard: [
                { name: "DeepDiver99", depth: 1240 },
                { name: "CoralQueen", depth: 1105 },
                { name: "BubblesMcGee", depth: 980 },
                { name: "NeonKnight", depth: 850 },
                { name: "FishFriend", depth: 720 }
            ]
        };

        this.vault = {}; // Map of achievement ID -> { progress, claimed }

        // --- ABYSS STRESS TEST MODULE ---
        this.isStressTesting = false;
        window.startAbyssStressTest = (level = 900) => this.runStressTest(level);

        this.setupBackground();
        this.camera.position.set(0, 0, 10);
        this.camera.lookAt(0, 0, 0);
        this.camera.rotation.set(0, 0, 0);

        this.renderer.setClearColor(0x000000, 0);

        const emergencyCanvas = document.createElement('div');
        emergencyCanvas.id = 'emergency-canvas';
        emergencyCanvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 2000000;
            pointer-events: none;
            background: rgba(0, 20, 50, 0.4);
            backdrop-filter: blur(8px);
            transition: opacity 0.3s ease;
        `;
        
        // --- EMERGENCY MENU VIEW ---
        const menuContainer = document.createElement('div');
        menuContainer.id = 'emergency-menu';
        menuContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            pointer-events: auto;
        `;

        const title = document.createElement('h1');
        title.innerText = 'AQUA MATCH';
        title.style.cssText = `
            font-size: 2.2rem; color: white; margin-bottom: 1.2rem;
            text-shadow: 0 0 15px #00aaff, 0 0 5px white;
            letter-spacing: 3px; font-family: sans-serif;
            text-align: center;
        `;
        menuContainer.appendChild(title);

        const createMenuBtn = (text, onClick, color1, color2, isPrimary = false) => {
            const btn = document.createElement('button');
            btn.innerText = text;
            btn.className = 'interactive-btn'; // Use UIManager's global style
            const bg = isPrimary ? `linear-gradient(135deg, ${color1}, ${color2})` : 'rgba(255,255,255,0.1)';
            const border = isPrimary ? '2px solid white' : `1.5px solid ${color1}`;
            const textColor = isPrimary ? 'black' : 'white';
            const shadow = isPrimary ? `0 5px 15px ${color1}88` : 'none';
            
            btn.style.cssText = `
                width: 85%;
                max-width: 260px;
                padding: ${isPrimary ? '0.8rem' : '0.6rem'};
                font-size: ${isPrimary ? '1.1rem' : '0.85rem'};
                background: ${bg};
                border: ${border};
                color: ${textColor};
                font-weight: 900;
                border-radius: 40px;
                box-shadow: ${shadow};
                font-family: sans-serif;
                text-transform: uppercase;
                letter-spacing: 1px;
                pointer-events: auto;
                margin-bottom: 3px;
            `;
            btn.onmouseenter = () => {
                btn.style.boxShadow = isPrimary ? `0 15px 40px ${color1}AA` : `0 0 15px ${color1}55`;
                if (this.audio) this.audio.playHover();
            };
            btn.onmouseleave = () => {
                btn.style.boxShadow = shadow;
            };
            btn.onpointerdown = (e) => {
                e.stopPropagation();
                if (this.audio) this.audio.playClick();
                onClick();
            };
            return btn;
        };

        const playBtn = createMenuBtn('PLAY NOW', () => {
            this.showEmergencyView('levels');
        }, '#00ffaa', '#00aaff', true);

        const aqBtn = createMenuBtn('My Aquarium', () => {
            this.hideEmergency();
            this.ui.showView('aquariumMode');
        }, '#00ffaa', '#00aaff');

        const storeBtn = createMenuBtn('Decoration Store', () => {
            this.hideEmergency();
            this.ui.showView('store');
        }, '#00ffff', '#00aaff');

        const missionsBtn = createMenuBtn('Daily Missions', () => {
            this.hideEmergency();
            this.ui.showView('missions');
        }, '#ffd700', '#ffaa00');

        const leaderboardBtn = createMenuBtn('Leaderboard', () => {
            this.hideEmergency();
            this.ui.showView('leaderboard');
        }, '#ff00ff', '#aa00ff');

        const testAdBtn = createMenuBtn('TEST MIDROLL AD', () => {
            this.triggerMidrollAd();
        }, '#ff4444', '#ffaa00');

        const stressTestBtn = createMenuBtn('ABYSS STRESS TEST', () => {
            this.hideEmergency();
            this.runStressTest(900);
        }, '#ff0000', '#550000');

        const resetBtn = document.createElement('button');
        resetBtn.innerText = 'RELOAD GAME';
        resetBtn.style.cssText = `
            margin-top: 30px; background: none; border: 1px solid rgba(255,255,255,0.3);
            color: rgba(255,255,255,0.5); padding: 5px 15px; border-radius: 20px;
            font-size: 0.7rem; cursor: pointer; pointer-events: auto;
        `;
        resetBtn.onclick = () => window.location.reload();

        menuContainer.appendChild(playBtn);
        menuContainer.appendChild(aqBtn);
        menuContainer.appendChild(storeBtn);
        menuContainer.appendChild(missionsBtn);
        menuContainer.appendChild(leaderboardBtn);
        menuContainer.appendChild(testAdBtn);
        menuContainer.appendChild(stressTestBtn);
        menuContainer.appendChild(resetBtn);
        
        // --- EMERGENCY LEVELS VIEW ---
        const levelsContainer = document.createElement('div');
        levelsContainer.id = 'emergency-levels';
        levelsContainer.style.cssText = `
            display: none;
            flex-direction: column;
            align-items: center;
            width: 92%;
            max-width: 380px;
            height: 85%;
            max-height: 650px;
            background: rgba(0, 10, 30, 0.9);
            border: 3px solid #00ffff;
            border-radius: 35px;
            padding: 20px;
            pointer-events: auto;
            box-shadow: 0 0 40px rgba(0, 255, 255, 0.25);
            position: relative;
            box-sizing: border-box;
        `;

        const levelsHeader = document.createElement('div');
        levelsHeader.style.cssText = `
            width: 100%; text-align: center; margin-bottom: 20px;
        `;
        levelsHeader.innerHTML = `
            <h2 style="color: white; margin: 0; font-size: 1.5rem; letter-spacing: 2px; text-shadow: 0 0 10px #00ffff;">SELECT LEVEL</h2>
            <div id="grid-pearl-stats" style="color: #00ffff; font-weight: bold; margin-top: 5px; font-size: 1rem;">⚪ <span id="grid-pearl-count">0</span></div>
        `;
        levelsContainer.appendChild(levelsHeader);

        const gridScroll = document.createElement('div');
        gridScroll.id = 'levels-grid-scroll';
        gridScroll.style.cssText = `
            width: 100%;
            flex: 1;
            overflow-y: auto;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            padding: 10px;
            scrollbar-width: thin;
            scrollbar-color: #00ffff transparent;
        `;
        levelsContainer.appendChild(gridScroll);

        const gridBackBtn = createMenuBtn('BACK TO MENU', () => {
            this.showEmergencyView('menu');
        }, '#ffaa00', '#ff5500');
        gridBackBtn.style.width = '100%';
        gridBackBtn.style.marginTop = '20px';
        levelsContainer.appendChild(gridBackBtn);

        emergencyCanvas.appendChild(menuContainer);
        emergencyCanvas.appendChild(levelsContainer);
        frame.appendChild(emergencyCanvas);
        this.emergencyCanvas = emergencyCanvas;

        this.setupLights();
        this.setupEventListeners();
        
        this.ui = new UIManager(
            (levelIndex) => this.startLevel(levelIndex),
            () => this.showMenu()
        );

        this.clock = new THREE.Clock();
        this.animate();
        this.loadGameState();

        // Tournament Reset Check
        setInterval(() => this.checkTournamentReset(), 10000); // Check every 10 seconds
    }

    checkSplashCompletion() {
        if (this.assetsAreLoaded && this.minimumTimeElapsed) {
            console.log("[Splash] Conditions met. Showing Enter Button.");
            const loaderContainer = document.getElementById('splash-loader-container');
            const startBtn = document.getElementById('splash-start-btn');
            if (loaderContainer) {
                loaderContainer.style.opacity = '0';
                setTimeout(() => {
                    loaderContainer.style.display = 'none';
                    if (startBtn) {
                        startBtn.style.display = 'block';
                    }
                }, 500);
            } else {
                if (startBtn) startBtn.style.display = 'block';
            }
        }
    }

    checkTournamentReset() {
        const now = Date.now();
        if (now >= this.tournament.endTime) {
            this.resetTournament();
        }
    }

    resetTournament() {
        // Award rewards based on rank before resetting
        const playerRank = this.getTournamentRank();
        if (playerRank <= 3 && this.tournament.playerDepth > 0) {
            const rewards = [1500, 750, 300];
            const prize = rewards[playerRank - 1];
            this.pearls += prize;
            this.ui.updatePearls(this.pearls);
            this.ui.showComboMessage(`TOURNAMENT PRIZE: ${prize} PEARLS!`);
            window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'chest-open' }));
        }

        // Reset state
        this.tournament.playerDepth = 0;
        this.tournament.endTime = Date.now() + 86400000; // New 24h cycle
        
        // Randomize some leaderboard names/values for variety
        const names = ["AbyssWalker", "Oceanic", "StarFish", "WaveRider", "DeepSea", "CoralKing", "PearlHunter"];
        this.tournament.leaderboard = this.tournament.leaderboard.map(entry => ({
            name: names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 100),
            depth: 800 + Math.floor(Math.random() * 1000)
        })).sort((a, b) => b.depth - a.depth);

        this.saveGameState();
        this.ui.renderTournament(this.tournament, 0);
    }

    getTournamentRank() {
        const combined = [...this.tournament.leaderboard, { name: "Me", depth: this.tournament.playerDepth }]
            .sort((a, b) => b.depth - a.depth);
        return combined.findIndex(e => e.name === "Me") + 1;
    }

    loadGameState() {
        const saved = localStorage.getItem('aquaMatchSave');
        let data = {};
        try {
            data = saved ? JSON.parse(saved) : {};
        } catch (e) {
            data = {};
        }
        
        this.collectedSpecies = new Set(data.collectedSpecies || []);
        this.fishInventory = Array.isArray(data.fishInventory) ? data.fishInventory : [];
        this.lives = (typeof data.lives === 'number' && !isNaN(data.lives)) ? data.lives : 25;
        this.lastLifeTime = (typeof data.lastLifeTime === 'number' && !isNaN(data.lastLifeTime)) ? data.lastLifeTime : Date.now();
        this.levelStats = data.levelStats || {};
        this.boosters = {
            hammer: 3, shuffle: 2, colorBomb: 1, rocket: 2, rocketV: 2,
            sonar_pulse: 0, depth_scanner: 0, hazard_deflector: 0,
            ...(data.boosters || {})
        };
        this.pearls = typeof data.pearls === 'number' ? data.pearls : (data.coins || 0);
        this.pearlsContributed = data.pearlsContributed || 0;
        this.purchasedDecorations = data.purchasedDecorations || [];
        this.purchasedHabitats = data.purchasedHabitats || ['clear_water'];
        this.activeHabitatId = data.activeHabitatId || 'clear_water';
        this.tankCleanliness = (typeof data.tankCleanliness === 'number') ? data.tankCleanliness : 100;
        this.fishSatiety = (typeof data.fishSatiety === 'number') ? data.fishSatiety : 100;
        this.totalMissionsCompleted = data.totalMissionsCompleted || 0;
        this.maxDepthReached = data.maxDepthReached || 0;
        
        this.dailyMissions = data.dailyMissions || {};
        this.lastMissionDate = data.lastMissionDate || "";
        this.checkDailyMissions();
        
        this.vault = data.vault || {};

        this.lastSeenUnlockedLevel = (typeof data.lastSeenUnlockedLevel === 'number') ? data.lastSeenUnlockedLevel : 1;
        this.updateUnlockedLevel();
        this.ui.updatePearls(this.pearls);
    }

    saveGameState() {
        const totalStars = this.getTotalStars();
        const totalScore = Object.values(this.levelStats).reduce((sum, s) => sum + s.score, 0);
        const abyssDepth = Math.max(0, this.unlockedLevel - 500);
        
        // Check for new Depth Record
        if (abyssDepth > this.maxDepthReached) {
            this.maxDepthReached = abyssDepth;
            if (abyssDepth > 0) {
                this.ui.showDepthRecordModal(abyssDepth);
                window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'star' }));
            }
        }

        // Check for new Abyss Discoveries
        ABYSS_LEGENDARIES.forEach(l => {
            if (abyssDepth >= l.depth && !this.collectedSpecies.has(l.id)) {
                this.collectedSpecies.add(l.id);
                // Trigger a special UI event for discovery
                window.dispatchEvent(new CustomEvent('new-abyss-discovery', { detail: l }));
            }
        });

        const highScore = Object.values(this.levelStats).length > 0
            ? Math.max(...Object.values(this.levelStats).map(s => s.score || 0))
            : 0;

        localStorage.setItem('aquaMatchSave', JSON.stringify({
            collectedSpecies: Array.from(this.collectedSpecies),
            fishInventory: this.fishInventory,
            lives: this.lives,
            lastLifeTime: this.lastLifeTime,
            levelStats: this.levelStats,
            boosters: this.boosters,
            pearls: this.pearls,
            purchasedDecorations: this.purchasedDecorations,
            purchasedHabitats: this.purchasedHabitats,
            activeHabitatId: this.activeHabitatId,
            tankCleanliness: this.tankCleanliness,
            fishSatiety: this.fishSatiety,
            totalMissionsCompleted: this.totalMissionsCompleted,
            maxDepthReached: this.maxDepthReached,
            dailyMissions: this.dailyMissions,
            lastMissionDate: this.lastMissionDate,
            lastSeenUnlockedLevel: this.lastSeenUnlockedLevel,
            vault: this.vault,
            pearlsContributed: this.pearlsContributed,
            
            // Explicit requested save parameters
            currentLevel: this.unlockedLevel,
            coins: this.pearls,
            highScore: highScore
        }));

        // Sync to cloud including individual level records
        dbManager.updateScore(totalStars, totalScore, this.totalMissionsCompleted, this.levelStats, this.collectedSpecies, abyssDepth, this.pearlsContributed);
    }

    getTotalStars() {
        return Object.values(this.levelStats).reduce((sum, stat) => sum + stat.stars, 0);
    }

    checkDailyMissions() {
        const today = new Date().toISOString().split('T')[0];
        if (this.lastMissionDate !== today) {
            this.lastMissionDate = today;
            this.dailyMissions = {};
            
            // Activate the 3 specific daily missions
            DAILY_MISSIONS.forEach(m => {
                this.dailyMissions[m.id] = {
                    id: m.id,
                    progress: 0,
                    claimed: false
                };
            });
            this.saveGameState();
        }
    }

    updateUnlockedLevel() {
        const totalStars = this.getTotalStars();
        let unlocked = 1;
        for (let i = 0; i < LEVEL_COUNT; i++) {
            const config = this.levelGenerator.generate(i);
            if (totalStars >= config.starRequirement || i === 0) {
                unlocked = i + 1;
            } else {
                break;
            }
        }
        this.unlockedLevel = unlocked;
    }

    updateLives() {
        const now = Date.now();
        if (this.lives < this.maxLives) {
            const diff = now - this.lastLifeTime;
            if (diff >= this.lifeRefillRate) {
                const livesToAdd = Math.floor(diff / this.lifeRefillRate);
                this.lives = Math.min(this.maxLives, this.lives + livesToAdd);
                this.lastLifeTime = now - (diff % this.lifeRefillRate);
                this.saveGameState();
            }
            
            const remaining = this.lifeRefillRate - (now - this.lastLifeTime);
            const progress = (this.lifeRefillRate - remaining) / this.lifeRefillRate;
            const mins = Math.floor(remaining / 60000);
            const secs = Math.floor((remaining % 60000) / 1000);
            this.ui.updateLives(this.lives, `${mins}:${secs < 10 ? '0' : ''}${secs}`, progress);
        } else {
            this.ui.updateLives(this.lives, "FULL", 0);
        }
        window.gameLives = this.lives;
    }

    setupBackground() {
        const textureLoader = new THREE.TextureLoader();
        
        // Main Background Image (Stylized Brain Coral Seabed)
        const backgroundTexture = textureLoader.load('assets/background-playing-webp.png');
        backgroundTexture.colorSpace = THREE.SRGBColorSpace;
        
        // Use as scene background for a perfect fit
        this.scene.background = backgroundTexture;

        // Ensure existing background elements are not created or are removed
        if (this.seabed) this.scene.remove(this.seabed);
        if (this.caustics) this.scene.remove(this.caustics);
        if (this.lightRays) this.scene.remove(this.lightRays);
        
        this.seabed = null;
        this.caustics = null;
        this.lightRays = null;
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        this.mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
        this.mainLight.position.set(5, 10, 7.5);
        this.scene.add(this.mainLight);

        const rimLight = new THREE.PointLight(0x00ffff, 0.8);
        rimLight.position.set(-5, -5, 5);
        this.scene.add(rimLight);
    }

    handleBackButton() {
        console.log("[BackButton] Intercepted browser back button.");
        
        // 1. Close any temporary overlays inside UIManager root (such as Pedigree analysis, social package modal)
        const tempOverlays = document.querySelectorAll('.temporary-ui-overlay');
        if (tempOverlays.length > 0) {
            console.log("[BackButton] Closing temporary overlays");
            tempOverlays.forEach(el => el.remove());
            return;
        }

        // 2. If the emergency levels list is active inside emergencyCanvas, go back to menu view
        const emergencyCanvas = document.getElementById('emergency-canvas');
        if (emergencyCanvas && emergencyCanvas.style.display === 'flex') {
            const levels = document.getElementById('emergency-levels');
            if (levels && levels.style.display === 'flex') {
                this.showEmergencyView('menu');
            } else {
                this.hideEmergency();
                this.ui.showView('menu');
            }
            return;
        }

        // 3. Close settings/pause modal overlay if it's currently open
        if (this.ui.modalOverlay && this.ui.modalOverlay.style.display === 'flex') {
            console.log("[BackButton] Dismissing open modal overlay");
            this.ui.modalOverlay.style.display = 'none';
            this.ui.modalOverlay.style.pointerEvents = 'none';
            return;
        }

        // 4. Handle based on active screen view
        const view = this.ui.currentView;
        if (view === 'game') {
            // Active gameplay: trigger Settings Modal (Menu/Pause Screen)
            console.log("[BackButton] Triggering in-game pause settings modal");
            this.ui.showSettingsModal();
        } else if (view === 'levelSummary') {
            // Summary: go back to levels select map
            console.log("[BackButton] Exiting summary back to map view");
            this.ui.showView('levels');
        } else if (view === 'menu') {
            // At Main Menu: toggle Settings Modal
            console.log("[BackButton] At main menu, opening settings modal");
            this.ui.showSettingsModal();
        } else {
            // Return back to Main Menu
            console.log("[BackButton] Sub-view active, returning to menu");
            this.ui.showView('menu');
        }
    }

    setupEventListeners() {
        // Intercept browser back button / history popstate to safely pause or open menu
        window.history.pushState({ page: 'menu' }, '');
        window.addEventListener('popstate', (e) => {
            window.history.pushState({ page: 'menu' }, '');
            this.handleBackButton();
        });

        window.addEventListener('resize', () => {
            const frame = document.getElementById('game-frame') || document.body;
            const rect = frame.getBoundingClientRect();
            this.camera.aspect = rect.width / rect.height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(rect.width, rect.height);
        });

        // --- ENHANCED MOBILE TOUCH EXTENSIONS (IREMS & MENU) ---
        // Ensure immediate response and block defaults except for scrollable areas
        const handleTouchStart = (e) => {
            const target = e.target;
            const isScrollable = target.closest('#levels-grid-scroll') || 
                               target.closest('#missions-list') || 
                               target.closest('#store-list') ||
                               target.closest('#leaderboard-list') ||
                               target.closest('#vault-list') ||
                               target.closest('#tournament-list');
            
            if (!isScrollable) {
                // Prevent browser zoom/pan if not in a scrollable list
                if (e.touches.length > 1 && e.cancelable) e.preventDefault();
            }
            
            // Haptic Feedback for Menu & Items (IREMS)
            if (window.navigator.vibrate) {
                if (target.closest('.interactive-btn') || target.tagName === 'BUTTON') {
                    window.navigator.vibrate(10);
                }
            }
            
            this.onPointerDown(e);
        };

        const handleTouchMove = (e) => {
            const target = e.target;
            const isScrollable = target.closest('#levels-grid-scroll') || 
                               target.closest('#missions-list') || 
                               target.closest('#store-list') ||
                               target.closest('#leaderboard-list') ||
                               target.closest('#vault-list') ||
                               target.closest('#tournament-list');
            
            // If we are swiping a piece, we MUST prevent default to avoid scrolling
            if (this.swipePiece && e.cancelable) {
                e.preventDefault();
            } else if (!isScrollable && e.cancelable) {
                // Block bounce effects on non-scrollable areas
                e.preventDefault();
            }
            
            this.onPointerMove(e);
        };

        // Pointer event listeners (desktop + primary mobile)
        window.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'mouse') this.onPointerDown(e);
        });
        window.addEventListener('pointermove', (e) => {
            if (e.pointerType === 'mouse') this.onPointerMove(e);
        });
        window.addEventListener('pointerup', (e) => {
            if (e.pointerType === 'mouse') this.onPointerUp();
        });

        // Touch event listeners (mobile primary) with passive: false to allow preventDefault
        window.addEventListener('touchstart', handleTouchStart, { passive: false });
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', () => this.onPointerUp(), { passive: false });
        
        window.addEventListener('request-emergency-levels', () => {
            this.showEmergencyView('levels');
        });

        window.addEventListener('test-midroll-ad', () => {
            this.triggerMidrollAd();
        });

        window.addEventListener('next-level', () => {
            if (this.currentLevelIndex < LEVEL_COUNT - 1) {
                this.startLevel(this.currentLevelIndex + 1);
                this.ui.showView('game');
            } else {
                this.ui.showView('menu');
            }
        });

        window.addEventListener('retry-level', () => {
            this.startLevel(this.currentLevelIndex);
        });

        window.addEventListener('view-changed', (e) => {
            const view = e.detail;
            this.isLevelActive = (view === 'game');
            
            // If the UI is showing a standard view, hide the emergency canvas
            if (view !== 'levels' && view !== 'menu') {
                this.hideEmergency();
            }
            
            if (view === 'aquariumMode') {
                this.initAquariumMode();
            } else if (this.isAquariumActive && view !== 'aquarium') {
                this.exitAquariumMode();
            }
        });

        window.addEventListener('show-view', (e) => {
            this.ui.showView(e.detail);
            this.isLevelActive = (e.detail === 'game');
        });

        window.addEventListener('render-map', () => {
            this.ui.renderLevelMap(
                this.unlockedLevel, 
                this.levelStats, 
                this.getTotalStars(), 
                (idx) => {
                    window.dispatchEvent(new CustomEvent('request-level-summary', { 
                        detail: { index: idx, stats: this.levelStats[idx] || { score: 0, stars: 0 } } 
                    }));
                }
            );
        });

        window.addEventListener('render-missions', () => {
            this.ui.renderMissions(this.dailyMissions);
        });

        window.addEventListener('claim-mission', (e) => {
            const mission = this.dailyMissions[e.detail.id];
            const config = DAILY_MISSIONS.find(m => m.id === e.detail.id);
            if (mission && config && !mission.claimed) {
                mission.claimed = true;
                this.totalMissionsCompleted++;
                
                // Handle different reward types
                if (config.reward === 'hammer') {
                    this.boosters.hammer += config.rewardAmount;
                    this.ui.updateBoosters(this.boosters);
                    this.ui.showComboMessage(`+${config.rewardAmount} HAMMER!`);
                } else {
                    this.pearls += config.reward;
                    this.ui.updatePearls(this.pearls);
                    this.ui.showComboMessage(`+${config.reward} PEARLS!`);
                }
                
                this.saveGameState();
                this.ui.renderMissions(this.dailyMissions);
                window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'star' }));
            }
        });

        window.addEventListener('powerup-created', (e) => {
            const { type } = e.detail;
            Object.values(this.dailyMissions).forEach(m => {
                const config = DAILY_MISSIONS.find(dm => dm.id === m.id);
                if (config && config.type === 'create_powerup' && config.powerup === type && m.progress < config.target) {
                    m.progress++;
                    this.saveGameState();
                }
            });
        });

        window.addEventListener('obstacle-cleared', (e) => {
            const type = e.detail.type;
            Object.values(this.dailyMissions).forEach(m => {
                const config = DAILY_MISSIONS.find(dm => dm.id === m.id);
                if (config && config.type === type && m.progress < config.target) {
                    m.progress++;
                    this.saveGameState();
                }
            });
        });

        window.addEventListener('render-aquarium', () => {
            this.ui.renderAquarium(FISH_TYPES, this.collectedSpecies);
        });

        window.addEventListener('render-store', () => {
            this.ui.renderStore(this.pearls, this.purchasedDecorations, this.purchasedHabitats, this.activeHabitatId);
        });

        window.addEventListener('render-pearl-bank', () => {
            this.ui.renderPearlBank(PEARL_PACKS, this.pearls);
        });

        window.addEventListener('purchase-pearls', (e) => {
            const pack = e.detail;
            this.pearls += pack.amount;
            this.saveGameState();
            this.ui.updatePearls(this.pearls);
            this.ui.renderPearlBank(PEARL_PACKS, this.pearls); // Update view after purchase
            this.ui.showComboMessage(`+${pack.amount} PEARLS!`);
            window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'chest-open' }));
        });

        window.addEventListener('buy-lives', (e) => {
            const pack = e.detail;
            if (this.pearls >= pack.price) {
                this.pearls -= pack.price;
                this.lives = Math.min(this.maxLives, this.lives + pack.amount);
                this.saveGameState();
                this.ui.updatePearls(this.pearls);
                this.ui.updateLives(this.lives);
                this.ui.showComboMessage(`+${pack.amount} LIVES!`);
                window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'star' }));
                this.ui.renderPearlBank(PEARL_PACKS, this.pearls); // Refresh view
            } else {
                this.ui.showNotEnoughPearlsPopup();
            }
        });

        window.addEventListener('buy-booster', (e) => {
            const pack = e.detail;
            if (this.pearls >= pack.price) {
                this.pearls -= pack.price;
                this.boosters[pack.id] += pack.amount;
                this.saveGameState();
                this.ui.updatePearls(this.pearls);
                this.ui.updateBoosters(this.boosters);
                this.ui.showComboMessage(`+${pack.amount} ${pack.name.toUpperCase()}!`);
                window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'star' }));
                this.ui.renderPearlBank(PEARL_PACKS, this.pearls); // Refresh view
            } else {
                this.ui.showNotEnoughPearlsPopup();
            }
        });

        window.addEventListener('buy-item', (e) => {
            const item = e.detail;
            if (this.pearls >= item.price) {
                this.pearls -= item.price;
                if (item.type === 'habitat') {
                    if (!this.purchasedHabitats.includes(item.id)) {
                        this.purchasedHabitats.push(item.id);
                    }
                    this.activeHabitatId = item.id;
                    this.applyHabitat(item.id);
                } else {
                    this.purchasedDecorations.push(item.id);
                }
                this.saveGameState();
                this.ui.updatePearls(this.pearls);
                this.ui.renderStore(this.pearls, this.purchasedDecorations, this.purchasedHabitats, this.activeHabitatId);
            }
        });

        window.addEventListener('apply-habitat', (e) => {
            this.activeHabitatId = e.detail.id;
            this.applyHabitat(this.activeHabitatId);
            this.saveGameState();
            this.ui.renderStore(this.pearls, this.purchasedDecorations, this.purchasedHabitats, this.activeHabitatId);
        });

        window.addEventListener('purchase-instant-booster', (e) => {
            const { type, price } = e.detail;
            if (this.pearls >= price) {
                this.pearls -= price;
                this.ui.updatePearls(this.pearls);
                this.saveGameState();

                if (type === 'extra-moves') {
                    this.moves += 5;
                    this.ui.updateHUD(this.currentLevelConfig.level, this.score, this.currentLevelConfig.objectives, this.moves);
                    this.ui.showComboMessage("+5 MOVES!");
                    window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'star' }));
                } else if (type === 'fish-swap') {
                    // Activate a special "Free Swap" mode
                    if (this.grid) this.grid.isFreeSwapActive = true;
                    this.ui.showComboMessage("FREE SWAP!");
                    this.ui.showActiveHint("Select two bubbles to swap!");
                    window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'star' }));
                } else if (type === 'clear-row') {
                    this.boosters.rocket++;
                    this.activeBooster = 'rocket';
                    this.ui.updateActiveBooster('rocket');
                    this.ui.updateBoosters(this.boosters);
                    this.ui.showComboMessage("SELECT ROW!");
                    window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'star' }));
                } else if (type === 'clear-column') {
                    this.boosters.rocketV++;
                    this.activeBooster = 'rocketV';
                    this.ui.updateActiveBooster('rocketV');
                    this.ui.updateBoosters(this.boosters);
                    this.ui.showComboMessage("SELECT COLUMN!");
                    window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'star' }));
                } else if (type === 'hammer') {
                    this.boosters.hammer++;
                    this.activeBooster = 'hammer';
                    this.ui.updateActiveBooster('hammer');
                    this.ui.updateBoosters(this.boosters);
                    this.ui.showComboMessage("SELECT TILE!");
                    window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'star' }));
                }
            }
        });

        window.addEventListener('request-level-summary', (e) => {
            const config = this.levelGenerator.generate(e.detail.index);
            const stats = e.detail.stats;
            this.ui.showLevelSummary(config, stats, () => this.startLevel(e.detail.index));
        });

        window.addEventListener('objective-collected', (e) => {
            if (!this.isLevelActive) return;
            const { type, id } = e.detail;
            let primaryMet = false;

            this.currentLevelConfig.objectives.forEach(obj => {
                if (obj.type === type && (obj.id === id || obj.species === id)) {
                    obj.current++;
                    if (obj.isPrimary && obj.current >= obj.target) {
                        primaryMet = true;
                    }
                }
            });
            this.audio.playPowerUp();
            this.ui.updateHUD(this.currentLevelConfig.level, this.score, this.currentLevelConfig.objectives, this.moves);
            
            // Win condition: Primary target species reached
            const allMet = this.currentLevelConfig.objectives.every(obj => obj.current >= obj.target);
            
            if (primaryMet || allMet) {
                this.completeLevel();
            }
        });

        window.addEventListener('render-tournament', () => {
            this.ui.renderTournament(this.tournament, this.tournament.playerDepth);
        });

        window.addEventListener('render-vault', () => {
            const stats = {
                collectionSize: this.collectedSpecies.size,
                legendaryCount: Array.from(this.collectedSpecies).filter(id => ABYSS_LEGENDARIES.some(l => l.id === id)).length,
                maxDepth: this.maxDepthReached,
                hybridCount: this.fishInventory.filter(f => f.traits && f.traits.isHybrid).length
            };
            this.ui.renderVault(this.vault, stats);
        });

        window.addEventListener('claim-vault-reward', (e) => {
            const achId = e.detail.id;
            const ach = ABYSSAL_VAULT_ACHIEVEMENTS.find(a => a.id === achId);
            if (ach && (!this.vault[achId] || !this.vault[achId].claimed)) {
                this.vault[achId] = this.vault[achId] || {};
                this.vault[achId].claimed = true;
                this.pearls += ach.reward;
                this.ui.updatePearls(this.pearls);
                this.ui.showComboMessage(`VAULT REWARD: ${ach.reward} PEARLS!`);
                this.saveGameState();
                
                // Re-render vault
                const stats = {
                    collectionSize: this.collectedSpecies.size,
                    legendaryCount: Array.from(this.collectedSpecies).filter(id => ABYSS_LEGENDARIES.some(l => l.id === id)).length,
                    maxDepth: this.maxDepthReached,
                    hybridCount: this.fishInventory.filter(f => f.traits && f.traits.isHybrid).length
                };
                this.ui.renderVault(this.vault, stats);
                window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'star' }));
            }
        });

        window.addEventListener('points-earned', (e) => {
            if (!this.isLevelActive) return;
            this.score += e.detail.points;
            this.sessionDepth += e.detail.points * 0.01; // Depth increases with score
            
            // Contribute to community goal
            const contribution = Math.floor(e.detail.points / 100);
            if (contribution > 0) {
                this.pearlsContributed += contribution;
                // Note: communityPearls display will be updated by the database subscription
                
                // Trigger Sonar Pulse if contribution is large
                if (contribution > 5) {
                    this.triggerCollectiveSonar();
                }
            }
            
            // Track match species mission progress
            Object.values(this.dailyMissions).forEach(m => {
                const config = DAILY_MISSIONS.find(dm => dm.id === m.id);
                if (config && config.type === 'match_species' && config.species === e.detail.species && m.progress < config.target) {
                    m.progress++;
                    this.saveGameState();
                }
            });
            
            // Depth Scanner Logic
            if (this.currentLevelIndex >= 499) { // Abyss mode
                const baseDepth = (e.detail.combo || 1) * 2;
                const multiplier = this.boosters.depth_scanner > 0 ? 1.2 : 1.0;
                const depthGained = Math.floor(baseDepth * multiplier);
                this.sessionDepth += depthGained;
                
                // Show depth gain feedback
                if (depthGained > 0) {
                    this.ui.updateSessionDepth(this.sessionDepth);
                }
            }
            
            // Track score mission progress
            Object.values(this.dailyMissions).forEach(m => {
                const config = DAILY_MISSIONS.find(dm => dm.id === m.id);
                if (config && config.type === 'score' && m.progress < config.target) {
                    m.progress = Math.min(config.target, m.progress + e.detail.points);
                    this.saveGameState();
                }
            });
            
            // Show combo feedback if multiplier exists
            if (e.detail.combo > 1) {
                this.ui.showComboMessage(e.detail.combo);
                this.maxComboReached = Math.max(this.maxComboReached, e.detail.combo);
            }

            // Update objectives
            this.currentLevelConfig.objectives.forEach(obj => {
                if (obj.type === 'score') {
                    obj.current = this.score;
                } else if (obj.type === 'collect' && obj.species === e.detail.species) {
                    obj.current++;
                    if (obj.isPrimary && obj.current >= obj.target) {
                        primaryMet = true;
                    }
                } else if (obj.type === 'reach_combo' && e.detail.combo >= obj.target) {
                    obj.current = Math.max(obj.current, e.detail.combo);
                } else if (obj.type === 'activate_powerup' && e.detail.species === 'POWERUP') {
                    obj.current++;
                }
            });

            if (e.detail.species && e.detail.species !== 'POWERUP') {
                if (!this.collectedSpecies.has(e.detail.species)) {
                    this.collectedSpecies.add(e.detail.species);
                    this.newDiscoveryThisLevel.add(e.detail.species);
                }
                
                // Migration Bonus
                if (this.migrationEvent.active && e.detail.species === this.migrationEvent.targetSpecies) {
                    this.pearls += 1;
                    this.ui.updatePearls(this.pearls);
                    this.saveGameState();
                }

                this.audio.playPop(this.currentLevelIndex);
            } else {
                this.audio.playPowerUp();
                if (e.detail.species === 'PEARL_POWERUP') {
                    this.pearls += 5;
                    this.ui.updatePearls(this.pearls);
                    this.saveGameState();
                }
            }

            // Screen Shake on match
            const shakeBase = e.detail.species === 'POWERUP' ? 0.2 : 0.08;
            this.triggerShake(shakeBase + (e.detail.combo * 0.02));

            this.ui.updateHUD(this.currentLevelConfig.level, this.score, this.currentLevelConfig.objectives, this.moves);
            
            // Win condition: Primary target species reached
            const allMet = this.currentLevelConfig.objectives.every(obj => obj.current >= obj.target);
            
            if (primaryMet || allMet) {
                this.completeLevel();
            }
        });

        window.addEventListener('move-made', (e) => {
            const isFree = e.detail && e.detail.isFree;
            
            if (isFree) {
                // Move not deducted for free swap!
                this.ui.showActiveHint(""); // Clear hint
            } else if (this.shieldTurns > 0) {
                this.shieldTurns--;
                this.ui.updateShield(this.shieldTurns);
                // Move not deducted while shield is active!
            } else {
                this.moves--;
            }
            
            this.ui.updateHUD(this.currentLevelConfig.level, this.score, this.currentLevelConfig.objectives, this.moves);
            
            // Check for Biome Hazards after move completes
            if (this.grid) {
                // Wait for potential cascades to finish before hazard ticks
                setTimeout(() => {
                    if (this.isLevelActive && !this.grid.isProcessing) {
                        this.grid.tickHazards();
                    }
                }, 800);
            }

            if (this.moves <= 0) {
                const allMet = this.currentLevelConfig.objectives.every(obj => obj.current >= obj.target);
                if (!allMet) this.gameOver();
            }
        });

        window.addEventListener('shield-activated', () => {
            this.shieldTurns = 5; // Shield lasts for 5 turns
            this.ui.updateShield(this.shieldTurns);
            this.audio.playPowerUp(); // Use powerup sound for shield
        });

        window.addEventListener('ad-reward-claimed', (e) => {
            const { type, count } = e.detail;
            
            // Immediately stop any residual ad sounds and play success chime
            if (this.audio) {
                this.audio.playAdRewardSuccess();
                this.audio.unmuteMusic();
            }

            if (type === 'lives') {
                this.lives += count;
                this.saveGameState();
                this.ui.updateLives(this.lives);
                this.ui.showComboMessage(`+${count} LIFE!`);
            } else if (type === 'pearls') {
                this.pearls += count;
                this.saveGameState();
                this.ui.updatePearls(this.pearls);
                this.ui.showComboMessage(`+${count} PEARLS!`);
            }
        });

        window.addEventListener('request-double-coins-ad', () => {
            console.log("[Rewarded Ad] Requesting Double Coins ad...");
            this.triggerRewardedAd(
                () => {
                    const doubleReward = this.consolationPearls || 15;
                    this.pearls += doubleReward;
                    this.saveGameState();
                    if (this.ui) {
                        this.ui.updatePearls(this.pearls);
                        this.ui.onDoubleCoinsAdSuccess();
                        this.ui.showComboMessage(`+${doubleReward} DOUBLE COINS! ⚪`);
                    }
                    if (this.audio && this.audio.playAdRewardSuccess) {
                        this.audio.playAdRewardSuccess();
                    }
                },
                () => {
                    console.warn("[Rewarded Ad] Double Coins ad failed or was closed.");
                    if (this.ui && this.ui.onDoubleCoinsAdFailure) {
                        this.ui.onDoubleCoinsAdFailure();
                    }
                }
            );
        });

        window.addEventListener('reward-claimed', (e) => {
            const { type, count } = e.detail;
            if (type === 'lives') {
                this.lives += count;
                this.ui.updateLives(this.lives);
            } else if (type === 'hammer') {
                this.boosters.hammer += count;
                this.ui.updateBoosters(this.boosters);
            } else if (type === 'shuffle') {
                this.boosters.shuffle += count;
                this.ui.updateBoosters(this.boosters);
            } else if (type === 'colorBomb') {
                this.boosters.colorBomb += count;
                this.ui.updateBoosters(this.boosters);
            } else if (type === 'rocket') {
                this.boosters.rocket += count;
                this.ui.updateBoosters(this.boosters);
            } else if (type === 'rocketV') {
                this.boosters.rocketV += count;
                this.ui.updateBoosters(this.boosters);
            } else if (type === 'pearls') {
                this.pearls += count;
                this.ui.updatePearls(this.pearls);
            }
            this.saveGameState();
        });

        window.addEventListener('buy-gadget', (e) => {
            const gadget = e.detail;
            if (this.pearls >= gadget.price) {
                this.pearls -= gadget.price;
                const amount = gadget.charges || 1;
                this.boosters[gadget.id] += amount;
                this.saveGameState();
                this.ui.updatePearls(this.pearls);
                this.ui.updateBoosters(this.boosters);
                this.ui.showComboMessage(`+${gadget.name.toUpperCase()}!`);
                window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'star' }));
                this.ui.renderPearlBank(PEARL_PACKS, this.pearls);
            } else {
                this.ui.showNotEnoughPearlsPopup();
            }
        });

        window.addEventListener('use-booster', (e) => {
            const type = e.detail.type;
            if (this.boosters[type] > 0) {
                if (type === 'hammer') {
                    this.activeBooster = 'hammer';
                    this.ui.updateActiveBooster('hammer');
                } else if (type === 'colorBomb') {
                    this.activeBooster = 'colorBomb';
                    this.ui.updateActiveBooster('colorBomb');
                } else if (type === 'rocket') {
                    this.activeBooster = 'rocket';
                    this.ui.updateActiveBooster('rocket');
                } else if (type === 'rocketV') {
                    this.activeBooster = 'rocketV';
                    this.ui.updateActiveBooster('rocketV');
                } else if (type === 'shuffle') {
                    this.boosters.shuffle--;
                    this.grid.shuffleGrid();
                    this.saveGameState();
                } else if (type === 'sonar_pulse') {
                    this.boosters.sonar_pulse--;
                    this.grid.clearAllObstacles();
                    this.saveGameState();
                }
                this.ui.updateBoosters(this.boosters);
            }
        });

        window.addEventListener('play-sfx', (e) => {
            const sfxDetail = typeof e.detail === 'string' ? { type: e.detail } : e.detail;
            const sfxType = sfxDetail.type;
            const combo = sfxDetail.combo || 1;

            if (sfxType === 'star') {
                this.audio.playStarPop && this.audio.playStarPop();
            } else if (sfxType === 'chest-open') {
                this.audio.playChestOpen && this.audio.playChestOpen();
            } else if (sfxType === 'pop') {
                this.audio.playPop && this.audio.playPop(combo);
            } else if (sfxType === 'zap') {
                this.audio.playZap && this.audio.playZap();
            } else if (sfxType === 'rocket') {
                this.audio.playRocketSound && this.audio.playRocketSound();
            } else if (sfxType === 'shuffle') {
                this.audio.playShuffle && this.audio.playShuffle();
            } else if (sfxType === 'ice_crack') {
                this.audio.playIceCrack && this.audio.playIceCrack();
            } else if (sfxType === 'stone_break') {
                this.audio.playStoneBreak && this.audio.playStoneBreak();
            }
        });

        window.addEventListener('check-hazard-deflector', (e) => {
            if (this.boosters.hazard_deflector > 0) {
                this.boosters.hazard_deflector--;
                this.saveGameState();
                this.ui.updateBoosters(this.boosters);
                e.preventDefault(); // Stop the hazard from triggering
            }
        });

        window.addEventListener('camera-shake', (e) => {
            this.triggerShake(e.detail.intensity);
            if (window.navigator.vibrate) {
                const duration = Math.min(200, Math.floor(e.detail.intensity * 500));
                window.navigator.vibrate(duration);
            }
        });

        window.addEventListener('new-abyss-discovery', (e) => {
            this.ui.showDiscoveryModal(e.detail);
            window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'star' }));
        });

        // --- CrazyGames Mock Banner Ad Rotation & Event Tracking ---
        const mockAds = [
            "🐠 UNLOCK NEON GOLDFISH IN PEACEFUL SANCTUARY! ⚪ +250 Pearls",
            "🚀 CRUSH OBSTACLES WITH THE ROW ROCKET BOOSTER!",
            "🏆 JOIN THE ABYSSAL SPRINT DEPTH TOURNAMENT!",
            "🔋 REFILL LIFE HEARTS INSTANTLY - WATCH FREE SPONSOR VIDEO!"
        ];
        let adIndex = 0;
        this._rotateBannerAd = () => {
            if (this.cgsdk) return; // Do not modify when real SDK banner is loaded
            const bannerContent = document.getElementById('crazy-banner-content');
            if (bannerContent && !this.isAdPlaying) {
                bannerContent.style.opacity = '0';
                setTimeout(() => {
                    adIndex = (adIndex + 1) % mockAds.length;
                    bannerContent.innerText = mockAds[adIndex];
                    bannerContent.style.opacity = '1';
                }, 300);
            }
        };
        
        // Rotate banner ads every 8 seconds
        this._bannerInterval = setInterval(() => {
            if (!this.cgsdk) this._rotateBannerAd();
        }, 8000);
        
        // Initial load
        setTimeout(() => {
            if (!this.cgsdk) this._rotateBannerAd();
        }, 500);

        // Sync banner borders and copy with active view changes (simulated CrazyGames context)
        window.addEventListener('view-changed', (e) => {
            if (this.cgsdk) return; // Do not modify when real SDK banner is active
            const banner = document.getElementById('crazy-banner-container');
            const bannerContent = document.getElementById('crazy-banner-content');
            if (banner && bannerContent && !this.isAdPlaying) {
                if (e.detail === 'game') {
                    bannerContent.innerText = "🎮 MATCH 3 FISH TO CLEAR DEEP-SEA HAZARDS!";
                    banner.style.borderColor = "rgba(0, 255, 170, 0.5)";
                } else if (e.detail === 'levels') {
                    bannerContent.innerText = "🗺️ DISCOVER ANCIENT REEFS AND MYSTERIOUS HADAL TRENCHES!";
                    banner.style.borderColor = "rgba(0, 170, 255, 0.5)";
                } else {
                    bannerContent.innerText = mockAds[adIndex];
                    banner.style.borderColor = "rgba(0, 255, 255, 0.35)";
                }
            }
        });
    }

    showEmergencyView(view) {
        const menu = document.getElementById('emergency-menu');
        const levels = document.getElementById('emergency-levels');
        
        if (view === 'menu') {
            menu.style.display = 'flex';
            levels.style.display = 'none';
        } else if (view === 'levels') {
            menu.style.display = 'none';
            levels.style.display = 'flex';
            this.renderLevelGrid();
        }
        
        this.emergencyCanvas.style.display = 'flex';
        this.emergencyCanvas.style.opacity = '1';
        this.emergencyCanvas.style.pointerEvents = 'auto';
    }

    hideEmergency() {
        this.emergencyCanvas.style.opacity = '0';
        this.emergencyCanvas.style.pointerEvents = 'none';
        setTimeout(() => {
            if (this.emergencyCanvas.style.opacity === '0') {
                this.emergencyCanvas.style.display = 'none';
            }
        }, 300);
    }

    renderLevelGrid() {
        const grid = document.getElementById('levels-grid-scroll');
        const pearlCount = document.getElementById('grid-pearl-count');
        if (!grid) return;
        
        grid.innerHTML = '';
        pearlCount.innerText = this.pearls.toLocaleString();

        const levelsToAnimate = [];

        // Scroll to the current unlocked level or the one being animated
        const currentTargetIdx = Math.max(0, this.unlockedLevel - 1);

        for (let i = 0; i < LEVEL_COUNT; i++) {
            const levelNum = i + 1;
            const levelConfig = this.levelGenerator.generate(i);
            const isUnlocked = i === 0 || this.unlockedLevel > i;
            const isNewlyUnlocked = isUnlocked && levelNum > this.lastSeenUnlockedLevel;
            const stats = this.levelStats[i] || { stars: 0, score: 0 };
            
            const node = document.createElement('div');
            node.id = `grid-node-${i}`;
            node.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 5px;
                cursor: pointer;
                transition: transform 0.2s;
                position: relative;
                padding-bottom: 10px;
            `;
            
            const bubble = document.createElement('div');
            // If newly unlocked, start as locked visually and we'll animate it
            const color = (isUnlocked && !isNewlyUnlocked) ? '#00ffff' : '#333';
            const bgColor = (isUnlocked && !isNewlyUnlocked) ? 'rgba(0, 255, 255, 0.1)' : 'rgba(0,0,0,0.4)';
            const shadow = (isUnlocked && !isNewlyUnlocked) ? '0 0 15px rgba(0, 255, 255, 0.4)' : 'none';
            
            bubble.style.cssText = `
                width: 52px;
                height: 52px;
                border-radius: 50%;
                border: 3px solid ${color};
                background: ${bgColor};
                display: flex;
                align-items: center;
                justify-content: center;
                color: ${(isUnlocked && !isNewlyUnlocked) ? 'white' : '#666'};
                font-weight: bold;
                font-size: 1.1rem;
                box-shadow: ${shadow};
                position: relative;
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            `;
            bubble.innerText = levelNum;

            if (!isUnlocked || isNewlyUnlocked) {
                const lock = document.createElement('span');
                lock.innerText = '🔒';
                lock.style.cssText = `
                    position: absolute;
                    font-size: 0.8rem;
                    bottom: -5px;
                    right: -5px;
                    transition: transform 0.3s, opacity 0.3s;
                `;
                bubble.appendChild(lock);
                if (isNewlyUnlocked) levelsToAnimate.push({ node, bubble, lock, index: i });
            }

            const stars = document.createElement('div');
            stars.style.cssText = `
                display: flex;
                gap: 2px;
                height: 12px;
                opacity: ${isNewlyUnlocked ? 0 : 1};
                transition: opacity 0.5s;
            `;
            for (let s = 0; s < 3; s++) {
                const star = document.createElement('span');
                star.innerText = '★';
                star.style.cssText = `
                    font-size: 0.8rem;
                    color: ${s < stats.stars ? '#ffd700' : 'rgba(255,255,255,0.1)'};
                `;
                stars.appendChild(star);
            }

            node.appendChild(bubble);
            node.appendChild(stars);

            if (isUnlocked) {
                node.onmouseenter = () => {
                    bubble.style.transform = 'scale(1.1)';
                    if (isUnlocked && !isNewlyUnlocked) bubble.style.boxShadow = '0 0 25px rgba(0, 255, 255, 0.8)';
                    if (this.audio) this.audio.playHover();
                };
                node.onmouseleave = () => {
                    bubble.style.transform = 'scale(1)';
                    bubble.style.boxShadow = isNewlyUnlocked ? 'none' : shadow;
                };
                node.onclick = () => {
                    if (this.audio) this.audio.playClick();
                    this.hideEmergency();
                    this.ui.showLevelSummary(levelConfig, stats, () => this.startLevel(i));
                };
            } else {
                node.onclick = () => {
                    if (this.audio) this.audio.playDenied && this.audio.playDenied();
                    node.style.animation = 'none';
                    node.offsetHeight; 
                    node.style.animation = 'emergency-shake 0.4s ease-in-out';
                    if (window.navigator.vibrate) window.navigator.vibrate([50, 30, 50]);
                };
            }

            grid.appendChild(node);
        }

        // Add styles if not present
        if (!document.getElementById('emergency-styles')) {
            const style = document.createElement('style');
            style.id = 'emergency-styles';
            style.innerHTML = `
                @keyframes emergency-shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px) rotate(-2deg); }
                    75% { transform: translateX(5px) rotate(2deg); }
                }
                @keyframes bubble-pop-in {
                    0% { transform: scale(0.8); }
                    50% { transform: scale(1.3); }
                    100% { transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
        }

        // Ensure current level is visible
        setTimeout(() => {
            const targetNode = document.getElementById(`grid-node-${currentTargetIdx}`);
            if (targetNode) {
                targetNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);

        // Play Unlock Animations
        if (levelsToAnimate.length > 0) {
            setTimeout(() => {
                levelsToAnimate.forEach((item, i) => {
                    setTimeout(() => {
                        this.playUnlockAnimation(item.node, item.bubble, item.lock);
                    }, i * 300);
                });
                this.lastSeenUnlockedLevel = this.unlockedLevel;
                this.saveGameState();
            }, 800);
        }
    }

    playUnlockAnimation(node, bubble, lock) {
        if (this.audio) this.audio.playStarPop && this.audio.playStarPop();
        
        lock.style.transform = 'scale(1.5) rotate(20deg)';
        lock.style.opacity = '0';
        
        bubble.style.borderColor = '#00ffff';
        bubble.style.background = 'rgba(0, 255, 255, 0.2)';
        bubble.style.color = 'white';
        bubble.style.boxShadow = '0 0 25px rgba(0, 255, 255, 0.8)';
        bubble.style.animation = 'bubble-pop-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        
        const stars = node.querySelector('div');
        if (stars) stars.style.opacity = '1';

        this.createPopParticles(bubble);
        
        if (window.navigator.vibrate) window.navigator.vibrate(50);
    }

    createPopParticles(element) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const colors = ['#00ffff', '#ffffff', '#00ffaa'];
        
        for (let i = 0; i < 15; i++) {
            const p = document.createElement('div');
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = 4 + Math.random() * 8;
            p.style.cssText = `
                position: fixed;
                left: ${centerX}px;
                top: ${centerY}px;
                width: ${size}px;
                height: ${size}px;
                background: ${color};
                border-radius: 50%;
                pointer-events: none;
                z-index: 2000001;
                box-shadow: 0 0 8px ${color};
            `;
            document.body.appendChild(p);
            
            const angle = Math.random() * Math.PI * 2;
            const dist = 30 + Math.random() * 60;
            const tx = Math.cos(angle) * dist;
            const ty = Math.sin(angle) * dist;
            
            p.animate([
                { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                { transform: `translate(${tx}px, ${ty}px) scale(0)`, opacity: 0 }
            ], {
                duration: 600 + Math.random() * 400,
                easing: 'cubic-bezier(0, .5, .5, 1)'
            }).onfinish = () => p.remove();
        }
    }

    triggerShake(intensity = 0.2) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    }

    pauseGameplay(isAdTriggered = false) {
        console.log("[Gameplay] Pausing game engine (physics, inputs, and background music).");
        this.savedLevelActiveState = this.isLevelActive;
        this.isLevelActive = false; // Freeze match-3 grid update tick and block user controls
        
        // Mute full custom audio engine outputs
        if (this.audio) {
            this.savedMuteState = Tone.Destination.mute;
            Tone.Destination.mute = true;
        }

        if (isAdTriggered && this.ui) {
            this.ui.showAdPauseOverlay(true);
        }
    }

    resumeGameplay() {
        console.log("[Gameplay] Resuming game engine (physics, inputs, and background music).");
        this.isLevelActive = this.savedLevelActiveState !== undefined ? this.savedLevelActiveState : true;
        
        // Unmute audio smoothly
        if (this.audio) {
            Tone.Destination.mute = this.savedMuteState !== undefined ? this.savedMuteState : false;
        }

        if (this.ui) {
            this.ui.showAdPauseOverlay(false);
        }
    }

    triggerMidrollAd() {
        if (this.isAdPlaying) return;
        
        if (this.cgsdk) {
            this.isAdPlaying = true;
            this.pauseGameplay(true);
            
            this.cgsdk.ad.requestAd('midroll', {
                adStarted: () => {
                    console.log("[CrazyGames SDK] Live Midroll ad started.");
                },
                adFinished: () => {
                    console.log("[CrazyGames SDK] Live Midroll ad finished.");
                    this.resumeGameplay();
                    this.isAdPlaying = false;
                },
                adError: (error) => {
                    console.error("[CrazyGames SDK] Live Midroll ad failed:", error);
                    this.resumeGameplay();
                    this.isAdPlaying = false;
                }
            });
        } else {
            console.log("[CrazyGames SDK] Standalone mode. Triggering simulated midroll.");
            this.isAdPlaying = true;
            this.pauseGameplay(true);
            
            if (this.ui && this.ui.showSimulatedAdOverlay) {
                this.ui.showSimulatedAdOverlay(() => {
                    this.resumeGameplay();
                    this.isAdPlaying = false;
                });
            } else {
                // Fallback if UI is not ready
                setTimeout(() => {
                    this.resumeGameplay();
                    this.isAdPlaying = false;
                }, 3000);
            }
        }
    }

    triggerRewardedAd(onSuccess, onFailure) {
        if (this.isAdPlaying) return;
        
        if (this.cgsdk) {
            this.isAdPlaying = true;
            this.pauseGameplay(true);
            
            this.cgsdk.ad.requestAd('rewarded', {
                adStarted: () => {
                    console.log("[CrazyGames SDK] Live Rewarded ad started.");
                },
                adFinished: () => {
                    console.log("[CrazyGames SDK] Live Rewarded ad completed. Granting reward.");
                    this.resumeGameplay();
                    this.isAdPlaying = false;
                    if (onSuccess) onSuccess();
                },
                adError: (error) => {
                    console.error("[CrazyGames SDK] Live Rewarded ad failed:", error);
                    this.resumeGameplay();
                    this.isAdPlaying = false;
                    if (onFailure) onFailure();
                }
            });
        } else {
            console.log("[CrazyGames SDK] Standalone mode. Simulated ad reward granted.");
            if (onSuccess) onSuccess();
        }
    }

    // --- ABYSS STRESS TEST ENGINE ---
    async runStressTest(levelIndex = 900) {
        if (this.isStressTesting) return;
        this.isStressTesting = true;
        console.log(`%c[StressTest] Starting Abyss Stress Test on Level ${levelIndex + 1}...`, 'color: #00ffff; font-weight: bold;');
        
        // Start the level
        this.lives = 99; // Infinite lives for test
        this.startLevel(levelIndex);
        this.ui.showView('game');
        
        let movesPerformed = 0;
        const maxTestMoves = 50;
        
        const performRandomMove = async () => {
            if (!this.isLevelActive || movesPerformed >= maxTestMoves || !this.grid) {
                this.isStressTesting = false;
                console.log(`%c[StressTest] Abyss Stress Test Completed. Performed ${movesPerformed} moves without logic locks.`, 'color: #00ff00; font-weight: bold;');
                return;
            }

            if (this.grid.isProcessing) {
                setTimeout(performRandomMove, 100);
                return;
            }

            // Find a valid swap
            const matches = this.grid.board.findPossibleMoves();
            if (matches.length > 0) {
                const move = matches[Math.floor(Math.random() * matches.length)];
                const p1 = this.grid.grid[move.r1][move.c1];
                const p2 = this.grid.grid[move.r2][move.c2];
                
                if (p1 && p2 && p1 instanceof BubblePiece && p2 instanceof BubblePiece) {
                    console.log(`[StressTest] Executing move ${movesPerformed + 1}: (${move.r1},${move.c1}) <-> (${move.r2},${move.c2})`);
                    await this.grid.swapPieces(p1, p2);
                    movesPerformed++;
                }
            } else {
                console.log("[StressTest] No moves found. Shuffling...");
                await this.grid.shuffleGrid();
            }

            // Wait for cascades to fully settle
            setTimeout(performRandomMove, 1200);
        };

        // Kick off the loop
        setTimeout(performRandomMove, 2000);
    }

    onPointerDown(event) {
        let clientX = event.clientX;
        let clientY = event.clientY;
        
        // Unify Touch coordinates for absolute mobile compatibility
        if (event.touches && event.touches.length > 0) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        }

        this.isPointerDown = true;
        this.swipeStartPos = { x: clientX, y: clientY };
        this.swipePiece = null;
        
        this.audio.init();
        
        const frame = document.getElementById('game-frame') || document.body;
        const rect = frame.getBoundingClientRect();
        this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        if (!this.isLevelActive || !this.grid) {
            if (this.isAquariumActive) {
                this.isScrubbing = true;
                document.body.classList.add('scrubbing');
                this.checkAquariumInteraction(event);
            }
            return;
        }

        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const interactiveObjects = [];
        if (this.grid) interactiveObjects.push(...this.grid.pieces);
        if (this.aquariumFish) interactiveObjects.push(...this.aquariumFish);
        
        const intersects = this.raycaster.intersectObjects(interactiveObjects, true);

        if (intersects.length > 0) {
            let obj = intersects[0].object;
            while (obj && !(obj instanceof BubblePiece) && !(obj instanceof Fish)) {
                obj = obj.parent;
            }
            if (obj) {
                if (obj instanceof Fish) {
                    obj.onTap && obj.onTap();
                    if (this.isAquariumActive) {
                        this.ui.showPedigree(obj.traits, obj.config.name);
                    }
                    if (window.navigator.vibrate) window.navigator.vibrate(10);
                    return;
                }

                // Block booster usage if grid is already busy
                if (this.grid && this.grid.isProcessing) return;

                if (this.activeBooster === 'hammer') {
                    this.boosters.hammer--;
                    this.grid.activatePowerUp(obj, 'BOOSTER_HAMMER').then(() => this.grid.processCascades());
                    this.activeBooster = null;
                    this.ui.updateActiveBooster(null);
                    this.ui.updateBoosters(this.boosters);
                    this.saveGameState();
                } else if (this.activeBooster === 'colorBomb') {
                    this.boosters.colorBomb--;
                    this.grid.activateColorBomb(obj).then(() => this.grid.processCascades());
                    this.activeBooster = null;
                    this.ui.updateActiveBooster(null);
                    this.ui.updateBoosters(this.boosters);
                    this.saveGameState();
                } else if (this.activeBooster === 'rocket') {
                    this.boosters.rocket--;
                    this.grid.activateRocket(obj).then(() => this.grid.processCascades());
                    this.activeBooster = null;
                    this.ui.updateActiveBooster(null);
                    this.ui.updateBoosters(this.boosters);
                    this.saveGameState();
                } else if (this.activeBooster === 'rocketV') {
                    this.boosters.rocketV--;
                    this.grid.activateVerticalRocket(obj).then(() => this.grid.processCascades());
                    this.activeBooster = null;
                    this.ui.updateActiveBooster(null);
                    this.ui.updateBoosters(this.boosters);
                    this.saveGameState();
                } else {
                    // Set current piece for swipe detection
                    this.swipePiece = obj;
                    obj.onWiggle(); // Immediate feedback
                    
                    // Immediately lock touch movement to prevent page scrolling during drag
                    if (event.cancelable) event.preventDefault();
                }
                if (window.navigator.vibrate) window.navigator.vibrate(20);
            }
        }
    }

    onPointerUp() {
        this.isPointerDown = false;
        this.isScrubbing = false;
        this.swipePiece = null;
        if (this.grid) this.grid.hideSwipeIndicator();
        document.body.classList.remove('scrubbing');
        
        // Safety audio unlock for strict mobile browsers
        if (this.audio && !this.audio.isInitialized) {
            this.audio.init();
        }
    }

    onPointerMove(event) {
        if (!this.isPointerDown) return;

        let clientX = event.clientX;
        let clientY = event.clientY;

        // Unify Touch coordinates for absolute mobile compatibility
        if (event.touches && event.touches.length > 0) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        }

        // Prevent default scrolling on mobile when actively swiping a game piece
        if (this.swipePiece) {
            if (event.cancelable) event.preventDefault();
        }

        const frame = document.getElementById('game-frame') || document.body;
        const rect = frame.getBoundingClientRect();
        this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        if (this.swipePiece && this.grid) {
            const dx = clientX - this.swipeStartPos.x;
            const dy = clientY - this.swipeStartPos.y;
            const threshold = 30; // Pixel threshold for swipe
            const indicatorThreshold = 10; // Threshold to show highlights

            if (Math.abs(dx) > indicatorThreshold || Math.abs(dy) > indicatorThreshold) {
                let direction = '';
                if (Math.abs(dx) > Math.abs(dy)) {
                    direction = dx > 0 ? 'right' : 'left';
                } else {
                    direction = dy > 0 ? 'down' : 'up';
                }

                // Highlight candidate pieces for feedback (directional arrows disabled)
                this.grid.highlightSwap(this.swipePiece, direction);

                if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
                    this.grid.hideSwipeIndicator();
                    this.grid.handleSwipe(this.swipePiece, direction).then(validMove => {
                        if (validMove) {
                            window.dispatchEvent(new CustomEvent('move-made', { detail: { isFree: this.grid.isFreeSwapActive } }));
                            this.grid.isFreeSwapActive = false;
                        }
                    });
                    
                    this.swipePiece = null; // Clear to prevent multiple swipes from one gesture
                }
            } else {
                this.grid.hideSwipeIndicator();
            }
        }
    }

    checkAquariumInteraction(event) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.aquariumFish, true);

        if (intersects.length > 0) {
            let obj = intersects[0].object;
            while (obj && !(obj instanceof Fish) && !(obj instanceof Decoration)) {
                obj = obj.parent;
            }
            if (obj instanceof Fish || obj instanceof Decoration) {
                const result = obj.onTap && obj.onTap();
                if (window.navigator.vibrate) window.navigator.vibrate(10);
                
                // Handle special decoration interaction results
                if (result === 'bubbles') {
                    for (let i = 0; i < 5; i++) {
                        setTimeout(() => this.dropFood(this.mouse, 0x00ffff), i * 100);
                    }
                }
                return;
            }
        } else {
            // Drop food on click in empty space
            this.dropFood(this.mouse);
        }
    }

    dropFood(mouse, color = 0x99ccff) { // Watery blue food by default
        if (this.aquariumFood.length > 20) return; // Limit food count

        const foodTexture = new THREE.TextureLoader().load('assets/crystal-bubble-webp-webp.webp');
        const foodMaterial = new THREE.SpriteMaterial({ 
            map: foodTexture, 
            color: color,
            transparent: true,
            opacity: 0.6 // Slightly transparent
        });
        const food = new THREE.Sprite(foodMaterial);
        
        // Project mouse to world space at z=0
        const vec = new THREE.Vector3(mouse.x, mouse.y, 0.5);
        vec.unproject(this.camera);
        const dir = vec.sub(this.camera.position).normalize();
        const distance = -this.camera.position.z / dir.z;
        const pos = this.camera.position.clone().add(dir.multiplyScalar(distance));
        
        food.position.copy(pos);
        food.scale.set(0.3, 0.3, 1);
        
        this.scene.add(food);
        this.aquariumFood.push(food);
    }

    startLevel(index) {
        if (this.lives <= 0) {
            this.ui.showOutOfLivesModal();
            this.ui.showView('menu');
            return;
        }

        this.ui.showView('game');
        this.isCompleting = false; // Reset completing state
        
        try {
            this.currentLevelIndex = index;
            this.currentLevelConfig = this.levelGenerator.generate(index);
            
            // Apply Biome shift
            if (this.currentLevelConfig.biome) {
                const b = this.currentLevelConfig.biome;
                
                // Enhanced Biome Specific Environment
                if (b.name === 'The Hadal Void') {
                    // Volumetric "Hadal Void" Fog
                    this.scene.fog = new THREE.FogExp2(0x050505, 0.08); // Much denser
                    
                    // Special Hadal Particles (Dark/Voids)
                    this.setupHadalEnvironment();
                } else {
                    this.scene.fog = new THREE.FogExp2(b.fogColor, 0.02);
                    if (this.hadalParticles) {
                        this.scene.remove(this.hadalParticles);
                        this.hadalParticles = null;
                    }
                }
                
                // Adjust lights
                const ambient = this.scene.children.find(c => c instanceof THREE.AmbientLight);
                if (ambient) {
                    if (this.currentLevelConfig.isDark) {
                        ambient.intensity = 0.05; 
                        ambient.color.set(0x000205);
                        if (this.mainLight) this.mainLight.intensity = 0.15;
                    } else {
                        ambient.intensity = 0.6;
                        ambient.color.set(b.fogColor).lerp(new THREE.Color(0xffffff), 0.5);
                        if (this.mainLight) this.mainLight.intensity = 1.2;
                    }
                }
            }

            this.score = 0;
            this.sessionDepth = 0; // NEW: Reset session depth
            this.maxComboReached = 0; // Track max combo for summary
            this.newDiscoveryThisLevel = new Set(); // Reset discoveries
            this.moves = this.currentLevelConfig.moves;
            this.shieldTurns = 0; // Reset shield on new level
            this.ui.updateShield(0);
            this.isLevelActive = true;

            this.clearScene();
            
            this.decorations = new Decoration(null, { x: 15, y: 15 }, index);
            this.scene.add(this.decorations);
            
            // --- Calculate Genetic Trait Hooks ---
            const resilientSpecies = new Set();
            this.fishInventory.forEach(f => {
                if (f.traits && f.traits.geneticTraits && f.traits.geneticTraits.includes('RESILIENT_SCALE')) {
                    resilientSpecies.add(f.speciesId);
                }
            });
            this.currentLevelConfig.resilientSpecies = resilientSpecies;

            // Add biome color to level config for grid/pieces
            this.currentLevelConfig.starThresholds = [
                this.currentLevelConfig.objectives.find(o => o.type === 'score')?.target || 1000,
                (this.currentLevelConfig.objectives.find(o => o.type === 'score')?.target || 1000) * 1.5,
                (this.currentLevelConfig.objectives.find(o => o.type === 'score')?.target || 1000) * 2.2
            ];
            this.currentLevelConfig.bubbleSprite = 'assets/crystal-bubble-webp-webp.webp';

            this.grid = new Grid(this.currentLevelConfig, this.worldSize, this.scene);

            // Add Biome-Specific Obstacles
            if (this.currentLevelConfig.biome.name === 'Volcanic Vent') {
                this.volcanicVent = new VolcanicVent({ x: this.worldSize, y: this.worldSize });
                this.scene.add(this.volcanicVent);
            } else {
                this.volcanicVent = null;
            }

            this.ui.updateHUD(this.currentLevelConfig.level, 0, this.currentLevelConfig.objectives, this.moves);
            this.ui.triggerStageStartSlideIn(this.currentLevelConfig.level, this.currentLevelConfig.objectives);
            this.ui.updateBoosters(this.boosters);
            this.audio.startBiomeSoundscape(this.currentLevelConfig.biome.name);
            
            // Deduct life
            this.lives--;
            if (this.lives === this.maxLives - 1) this.lastLifeTime = Date.now();
            this.saveGameState();
        } catch (error) {
            console.error("Failed to start level:", error);
            this.isLevelActive = false;
        }
    }

    async completeLevel() {
        if (this.isCompleting) return;
        this.isCompleting = true;
        this.isLevelActive = false;
        
        // Trigger completion animation on the top HUD fish
        if (this.ui) this.ui.playLevelCompleteAnimation();
        
        // Start Sugar Crush sequence
        if (this.moves > 0) {
            await this.runSugarCrush();
        }

        const bonusScore = 0; // Moves already converted to score in Sugar Crush
        const totalScore = this.score;
        const starThresholds = this.currentLevelConfig.starThresholds;

        // Calculate stars based on score vs thresholds
        let stars = 0;
        if (totalScore >= starThresholds[2]) stars = 3;
        else if (totalScore >= starThresholds[1]) stars = 2;
        else if (totalScore >= starThresholds[0]) stars = 1;
        else stars = 1; // Default to 1 if objective met but score low

        // Award pearls based on stars
        const pearlRewards = { 1: 10, 2: 25, 3: 50 };
        const awardedPearls = pearlRewards[stars] || 10;
        this.pearls += awardedPearls;

        // Handle Depth Scanner consumption
        if (this.currentLevelIndex >= 499 && this.boosters.depth_scanner > 0) {
            this.boosters.depth_scanner--;
            this.ui.updateBoosters(this.boosters);
        }

        // Save stats for the map
        const currentStats = this.levelStats[this.currentLevelIndex] || { score: 0, stars: 0 };
        const isNewHighScore = totalScore > currentStats.score;
        
        if (totalScore > currentStats.score || stars > currentStats.stars) {
            this.levelStats[this.currentLevelIndex] = {
                score: Math.max(totalScore, currentStats.score),
                stars: Math.max(stars, currentStats.stars)
            };
        }

        // Update Abyss Depth Record
        if (this.currentLevelIndex >= 499) {
            const baseLevelDepth = (this.currentLevelIndex - 499) * 50;
            const finalDepth = baseLevelDepth + this.sessionDepth;
            if (finalDepth > this.maxDepthReached) {
                this.maxDepthReached = finalDepth;
                this.ui.showDepthRecordModal(finalDepth);
                window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'star' }));
            }
        }

        this.updateUnlockedLevel();
        
        // Track win level mission progress
        Object.values(this.dailyMissions).forEach(m => {
            const config = DAILY_MISSIONS.find(dm => dm.id === m.id);
            if (config && config.type === 'win_level' && m.progress < config.target) {
                m.progress++;
            }
        });

        this.saveGameState();

        this.audio.playLevelClear();

        if (this.currentLevelIndex === LEVEL_COUNT - 1) {
            // Level 1000 Closure: Grand Finale sequence
            setTimeout(() => this.ui.showGrandFinale(), 1000);
            return;
        }

        setTimeout(() => this.ui.showVictory({
            score: this.score,
            movesLeft: 0,
            totalMoves: this.currentLevelConfig.moves,
            starThresholds,
            maxCombo: this.maxComboReached,
            isNewHighScore,
            discoveries: Array.from(this.newDiscoveryThisLevel)
        }), 1000);
    }

    async runSugarCrush() {
        this.ui.showComboMessage("SUGAR CRUSH!");
        window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'star' }));
        
        while (this.moves > 0) {
            this.moves--;
            this.ui.updateHUD(this.currentLevelConfig.level, this.score, this.currentLevelConfig.objectives, this.moves);
            
            // Pick a random piece and turn it into a powerup
            const r = Math.floor(Math.random() * this.grid.gridSize);
            const c = Math.floor(Math.random() * this.grid.gridSize);
            const piece = this.grid.grid[r][c];
            
            if (piece && !piece.isPowerUp && !piece.isStone) {
                const pu = this.grid.spawnPowerUp(r, c, 'PEARL_POWERUP');
                await new Promise(res => setTimeout(res, 200));
                await this.grid.activatePowerUp(pu);
                await this.grid.processCascades(); // Explicitly call cascades after each sugar crush powerup
                await new Promise(res => setTimeout(res, 100));
            } else {
                // Just add points if we can't spawn a powerup
                this.score += 500;
                this.ui.updateHUD(this.currentLevelConfig.level, this.score, this.currentLevelConfig.objectives, this.moves);
                await new Promise(res => setTimeout(res, 100));
            }
        }
    }

    gameOver() {
        this.isLevelActive = false;
        
        // Award consolation pearls (coins) on fail
        this.consolationPearls = 15;
        this.pearls += this.consolationPearls;
        this.saveGameState();
        
        if (this.ui) {
            this.ui.updatePearls(this.pearls);
            if (this.ui.resetGameOverAdState) {
                this.ui.resetGameOverAdState();
            }
        }

        setTimeout(() => this.ui.showView('gameOver'), 1000);
    }

    showMenu() {
        this.isLevelActive = false;
        this.ui.showView('menu');
        
        // Auto-show daily rewards if available
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        if (!this.ui.isGiftClaimed || now - this.ui.lastGiftTime >= oneDay) {
            setTimeout(() => this.ui.showDailyRewardCalendar(), 500);
        } else {
            // Chance for a simulated Social Care Package (Gifting)
            if (Math.random() < 0.15) {
                setTimeout(() => {
                    this.ui.showGiftModal((amount) => {
                        this.pearls += amount;
                        this.ui.updatePearls(this.pearls);
                        this.saveGameState();
                        window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'chest-open' }));
                    });
                }, 1000);
            }
        }
    }

    applyHabitat(habitatId) {
        const habitat = HABITAT_UPGRADES.find(h => h.id === habitatId);
        if (!habitat) return;

        // Apply visual effects
        if (this.scene) {
            const tint = habitat.effect.tint;
            const fogDensity = habitat.effect.fogDensity;
            
            // Adjust scene background tint if possible, or just fog
            this.scene.fog = new THREE.FogExp2(tint, fogDensity);
            
            const ambient = this.scene.children.find(c => c instanceof THREE.AmbientLight);
            if (ambient) {
                ambient.color.set(tint);
                ambient.intensity = habitat.id === 'midnight_tint' ? 0.2 : 0.6;
            }
        }

        // Apply music
        if (this.audio) {
            if (habitat.music) {
                this.audio.updateHabitatMusic(habitat);
            } else {
                // Fallback to a default biome soundscape based on habitat if needed
                this.audio.startBiomeSoundscape('Bright Coral Reef');
            }
        }
    }

    generateRandomGeneticTraits() {
        const traits = [];
        const keys = Object.keys(GENETIC_TRAITS);
        if (Math.random() < 0.2) { // 20% chance for a trait
            traits.push(keys[Math.floor(Math.random() * keys.length)]);
        }
        return traits;
    }

    initAquariumMode() {
        this.isAquariumActive = true;
        this.clearScene();
        this.aquariumFood = [];
        
        // Apply active habitat
        this.applyHabitat(this.activeHabitatId);
        
        // Update filter & feeder UI
        const hasFilter = this.purchasedDecorations.includes('nano_filter');
        const hasFeeder = this.purchasedDecorations.includes('auto_feeder');
        this.ui.updateFilterStatus(hasFilter);
        this.ui.updateFeederStatus(hasFeeder);

        // Add Algae Overlay
        const algaeGeo = new THREE.PlaneGeometry(30, 20);
        const algaeMat = new THREE.MeshBasicMaterial({
            color: 0x224400,
            transparent: true,
            opacity: 0,
            depthWrite: false
        });
        this.algaeOverlay = new THREE.Mesh(algaeGeo, algaeMat);
        this.algaeOverlay.position.z = 5; // In front of everything but behind UI
        this.scene.add(this.algaeOverlay);

        // Add purchased decorations
        this.purchasedDecorations.forEach((itemId, idx) => {
            const itemConfig = STORE_ITEMS.find(i => i.id === itemId);
            if (itemConfig) {
                const deco = new Decoration(itemConfig, { x: 18, y: 10 }, 0);
                
                // Position decorations mostly at the bottom
                const x = (Math.random() - 0.5) * 16;
                const y = -4 + Math.random() * 2;
                const z = (Math.random() - 0.5) * 4;
                deco.position.set(x, y, z);
                
                this.scene.add(deco);
                this.aquariumFish.push(deco); // Reuse list for cleanup and interaction
            }
        });

        // Add random floating decorations for aquarium feel
        this.decorations = new Decoration(null, { x: 20, y: 15 }, 0);
        this.scene.add(this.decorations);

        const worldSize = { x: 18, y: 10, z: 5 };
        
        // Spawn each discovered species
        this.collectedSpecies.forEach(id => {
            let fishConfig = FISH_TYPES[id];
            
            // If not in standard FISH_TYPES, check ABYSS_LEGENDARIES
            if (!fishConfig) {
                const legendary = ABYSS_LEGENDARIES.find(l => l.id === id);
                if (legendary) {
                    fishConfig = {
                        id: legendary.id,
                        name: legendary.name,
                        sprite: legendary.sprite,
                        rarity: 'Legendary',
                        description: legendary.description
                    };
                }
            }

            if (fishConfig) {
                // Determine how many of this species we own
                const ownedOfSpecies = this.fishInventory.filter(f => f.speciesId === id);
                
                if (ownedOfSpecies.length === 0) {
                    // Initial stock for newly discovered species
                    const count = 1 + Math.floor(Math.random() * 2); 
                    for (let i = 0; i < count; i++) {
                        const traits = { 
                            hueShift: 0, 
                            sizeMult: 1.0, 
                            speedMult: 1.0,
                            geneticTraits: this.generateRandomGeneticTraits()
                        };
                        const age = 100; // Adults
                        this.fishInventory.push({ speciesId: id, traits, age });
                        const fish = new Fish(fishConfig, worldSize, traits);
                        fish.age = age;
                        this.scene.add(fish);
                        this.aquariumFish.push(fish);
                    }
                } else {
                    ownedOfSpecies.forEach(fData => {
                        const fish = new Fish(fishConfig, worldSize, fData.traits);
                        fish.age = fData.age || 100;
                        fish.isBaby = fish.age < 100;
                        this.scene.add(fish);
                        this.aquariumFish.push(fish);
                    });
                }
            }
        });
        
        this.saveGameState(); // Persist initial stock if needed

        // If no fish yet, show a hint or a default fish
        if (this.aquariumFish.length === 0) {
            console.log("Empty aquarium - start playing to collect species!");
        }

        this.camera.position.z = 15;
    }

    exitAquariumMode() {
        this.isAquariumActive = false;
        this.clearScene();
        this.camera.position.z = 12;
    }

    clearScene() {
        const disposeObject = (obj) => {
            if (!obj) return;
            if (obj.dispose) {
                obj.dispose();
            } else {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(m => m.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
            }
            if (obj.children) {
                obj.children.forEach(disposeObject);
            }
        };

        if (this.algaeOverlay) {
            this.scene.remove(this.algaeOverlay);
            disposeObject(this.algaeOverlay);
            this.algaeOverlay = null;
        }
        if (this.grid && this.grid.pieces) {
            this.grid.pieces.forEach(p => {
                this.scene.remove(p);
                disposeObject(p);
            });
            // Also cleanup weather and darkness
            if (this.grid.weatherSystem) {
                this.scene.remove(this.grid.weatherSystem);
                disposeObject(this.grid.weatherSystem);
            }
            if (this.grid.darknessShroud) {
                this.scene.remove(this.grid.darknessShroud);
                disposeObject(this.grid.darknessShroud);
            }
            if (this.grid.lights) {
                this.grid.lights.forEach(l => {
                    this.scene.remove(l);
                    disposeObject(l);
                });
            }
            if (this.grid.indicator) {
                this.scene.remove(this.grid.indicator);
                disposeObject(this.grid.indicator);
            }
            this.grid = null;
        }
        if (this.decorations) {
            this.scene.remove(this.decorations);
            disposeObject(this.decorations);
            this.decorations = null;
        }
        if (this.volcanicVent) {
            this.scene.remove(this.volcanicVent);
            disposeObject(this.volcanicVent);
            this.volcanicVent = null;
        }
        this.aquariumFish.forEach(f => {
            this.scene.remove(f);
            disposeObject(f);
        });
        this.aquariumFish = [];
        this.aquariumFood.forEach(f => {
            this.scene.remove(f);
            disposeObject(f);
        });
        this.aquariumFood = [];
    }

    getEffectiveDecayRate() {
        // Each Nano Filter reduces decay by 30% (multiplicative for balance)
        const filterCount = this.purchasedDecorations.filter(id => id === 'nano_filter').length;
        let rate = CLEANLINESS_DECAY_RATE;
        for (let i = 0; i < filterCount; i++) {
            rate *= 0.7; 
        }
        return rate;
    }

    checkBreeding(delta) {
        // Find pairs of fish that are close and not on cooldown
        const adults = this.aquariumFish.filter(f => (f instanceof Fish) && !f.isBaby && f.breedingCooldown <= 0);
        if (adults.length < 2) return;

        for (let i = 0; i < adults.length; i++) {
            for (let j = i + 1; j < adults.length; j++) {
                const f1 = adults[i];
                const f2 = adults[j];
                
                if (f1.position.distanceTo(f2.position) < 1.8) {
                    // Same species has higher chance, cross-species lower
                    const isSameSpecies = f1.config.id === f2.config.id;
                    const chance = isSameSpecies ? BREEDING_CHANCE : BREEDING_CHANCE * 0.3;

                    if (Math.random() < chance * delta) {
                        this.triggerBreedingVisuals(f1, f2);
                        f1.breedingCooldown = BREEDING_COOLDOWN;
                        f2.breedingCooldown = BREEDING_COOLDOWN;
                        return; // One baby at a time per frame
                    }
                }
            }
        }
    }

    triggerBreedingVisuals(f1, f2) {
        // 1. Crossover Glow on parents
        if (f1.sprite) f1.sprite.element?.classList.add('breeding-glow');
        if (f2.sprite) f2.sprite.element?.classList.add('breeding-glow');
        
        // 2. DNA Particle System (3D)
        const midpoint = new THREE.Vector3().addVectors(f1.position, f2.position).multiplyScalar(0.5);
        const dnaGroup = new THREE.Group();
        this.scene.add(dnaGroup);

        const particleCount = 12;
        const particles = [];
        const texture = new THREE.TextureLoader().load('assets/realistic-crystal-bubble-v2.webp');
        
        for (let i = 0; i < particleCount; i++) {
            const material = new THREE.SpriteMaterial({ 
                map: texture, 
                color: i % 2 === 0 ? 0x00ffff : 0xff00ff,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending
            });
            const p = new THREE.Sprite(material);
            p.scale.set(0.2, 0.2, 1);
            dnaGroup.add(p);
            particles.push(p);
        }

        let startTime = performance.now();
        const animateDNA = (time) => {
            const elapsed = (time - startTime) / 1000;
            if (elapsed > 1.5) {
                this.scene.remove(dnaGroup);
                this.spawnBaby(f1, f2, midpoint);
                return;
            }

            particles.forEach((p, i) => {
                const t = elapsed * 4 + (i * 0.5);
                const radius = 0.5 * (1 - elapsed / 1.5);
                p.position.set(
                    Math.cos(t) * radius,
                    (i / particleCount - 0.5) * 2 + Math.sin(t * 0.5) * 0.2,
                    Math.sin(t) * radius
                );
                p.position.add(midpoint);
                p.material.opacity = 0.8 * (1 - elapsed / 1.5);
            });
            requestAnimationFrame(animateDNA);
        };
        requestAnimationFrame(animateDNA);
    }

    setupHadalEnvironment() {
        if (this.hadalParticles) this.scene.remove(this.hadalParticles);
        
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        for (let i = 0; i < 500; i++) {
            vertices.push(
                (Math.random() - 0.5) * 40,
                (Math.random() - 0.5) * 40,
                (Math.random() - 0.5) * 20
            );
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const material = new THREE.PointsMaterial({ 
            color: 0x4444ff, 
            size: 0.1, 
            transparent: true, 
            opacity: 0.4,
            blending: THREE.AdditiveBlending 
        });
        this.hadalParticles = new THREE.Points(geometry, material);
        this.scene.add(this.hadalParticles);
    }

    spawnBaby(f1, f2, position) {
        const p1Id = f1.config.id;
        const p2Id = f2.config.id;
        
        let babySpeciesId = p1Id;
        let traits = {
            hueShift: 0,
            sizeMult: 1.0,
            speedMult: 1.0,
            isGlowing: false,
            rarity: 'common',
            pattern: null,
            isHybrid: false,
            geneticTraits: [],
            pedigree: {
                father: p1Id,
                mother: p2Id,
                generation: (f1.traits.pedigree?.generation || 0) + 1
            }
        };

        // Inherit genetic traits
        const potentialTraits = [...(f1.traits.geneticTraits || []), ...(f2.traits.geneticTraits || [])];
        potentialTraits.forEach(t => {
            if (Math.random() < 0.4) { // 40% chance to inherit each parent trait
                if (!traits.geneticTraits.includes(t)) traits.geneticTraits.push(t);
            }
        });

        // Chance for new mutation trait if 3+ ancestors
        if (traits.pedigree.generation >= 3 && Math.random() < 0.3) {
            const keys = Object.keys(GENETIC_TRAITS);
            const newTrait = keys[Math.floor(Math.random() * keys.length)];
            if (!traits.geneticTraits.includes(newTrait)) traits.geneticTraits.push(newTrait);
        }

        // Check for Hybrid Result
        const hybridKey = Object.keys(HYBRID_SPECIES).find(k => {
            const h = HYBRID_SPECIES[k];
            return (h.baseSpecies === p1Id && h.patternSpecies === p2Id) || 
                   (h.baseSpecies === p2Id && h.patternSpecies === p1Id);
        });

        if (hybridKey) {
            const h = HYBRID_SPECIES[hybridKey];
            babySpeciesId = h.baseSpecies;
            traits.rarity = 'ultra-rare';
            traits.isHybrid = true;
            traits.pattern = {
                sprite: FISH_TYPES[h.patternSpecies].sprite,
                color: 0xffffff
            };
        } else if (p1Id !== p2Id) {
            // Random Cross-Breed Traits
            babySpeciesId = Math.random() < 0.5 ? p1Id : p2Id;
            const otherParent = babySpeciesId === p1Id ? f2 : f1;
            
            traits.pattern = {
                sprite: otherParent.config.sprite,
                color: 0xffffff
            };
            traits.rarity = 'rare';
            traits.isHybrid = Math.random() < 0.3; // 30% chance of functional hybrid traits
        }

        // Genetic Crossover for existing traits
        const p1Traits = f1.traits;
        const p2Traits = f2.traits;
        
        traits.hueShift = Math.random() < 0.5 ? p1Traits.hueShift : p2Traits.hueShift;
        traits.sizeMult = (p1Traits.sizeMult + p2Traits.sizeMult) / 2 * (0.9 + Math.random() * 0.2);
        traits.speedMult = (p1Traits.speedMult + p2Traits.speedMult) / 2 * (0.9 + Math.random() * 0.2);
        traits.isGlowing = p1Traits.isGlowing || p2Traits.isGlowing;

        // Genetic Traits Crossover
        traits.geneticTraits = [];
        const possibleTraits = ['ANCIENT_WISDOM', 'AQUA_SPEED', 'PEARL_MAGNET', 'RESILIENT_SCALE'];
        const parentTraits = [...(p1Traits.geneticTraits || []), ...(p2Traits.geneticTraits || [])];
        
        // 50% chance to inherit a trait from parents
        if (parentTraits.length > 0 && Math.random() < 0.5) {
            const inherited = parentTraits[Math.floor(Math.random() * parentTraits.length)];
            if (!traits.geneticTraits.includes(inherited)) traits.geneticTraits.push(inherited);
        }
        
        // 10% chance for a spontaneous mutation/new trait
        if (Math.random() < 0.1) {
            const mutated = possibleTraits[Math.floor(Math.random() * possibleTraits.length)];
            if (!traits.geneticTraits.includes(mutated)) traits.geneticTraits.push(mutated);
        }

        // Mutation: 15% chance
        if (Math.random() < 0.15) traits.hueShift += (Math.random() - 0.5) * 60;
        if (Math.random() < 0.05) { // Ultra-Rare Mutation
            traits.rarity = 'ultra-rare';
            traits.isGlowing = true;
            traits.isHybrid = true;
            traits.hueShift = Math.random() * 360;
        }

        const fishConfig = FISH_TYPES[babySpeciesId];
        const worldSize = { x: 18, y: 10, z: 5 };
        const baby = new Fish(fishConfig, worldSize, traits);
        baby.position.copy(position);
        baby.isBaby = true;
        baby.age = 0;
        baby.breedingCooldown = BREEDING_COOLDOWN;
        
        this.scene.add(baby);
        this.aquariumFish.push(baby);
        
        // Update inventory
        this.fishInventory.push({ speciesId: babySpeciesId, traits, age: 0 });
        this.saveGameState();

        this.ui.showBreedingAlert(traits, fishConfig.name);
        window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'star' }));
    }

    updateMigrationEvent(delta) {
        // Global Sync Logic (Deterministic across all clients)
        const cycle = 600; // 10 minutes
        const duration = 120; // 2 minutes
        const now = Math.floor(Date.now() / 1000);
        const timeInCycle = now % cycle;
        const isActive = timeInCycle < duration;
        const eventId = Math.floor(now / cycle);
        
        if (isActive) {
            if (!this.migrationEvent.active || this.migrationEvent.id !== eventId) {
                // Trigger/Sync Migration
                this.migrationEvent.active = true;
                this.migrationEvent.id = eventId;
                
                // Deterministically choose a target species using eventId as seed
                const available = Object.keys(FISH_TYPES).filter(k => !k.includes('POWERUP'));
                const seedIndex = eventId % available.length;
                this.migrationEvent.targetSpecies = available[seedIndex];
                
                const fishName = FISH_TYPES[this.migrationEvent.targetSpecies].name;
                this.ui.updateMigrationEvent(true, fishName);
                this.ui.showComboMessage(`COMMUNITY EVENT: ${fishName.toUpperCase()}!`);
                window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'star' }));
            }
            // Update countdown for UI (optional, could add to UIManager)
            this.migrationEvent.timer = duration - timeInCycle;
        } else if (this.migrationEvent.active) {
            // End Migration
            this.migrationEvent.active = false;
            this.ui.updateMigrationEvent(false);
            this.ui.showComboMessage("COMMUNITY EVENT ENDED");
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.isAdPlaying) {
            // Freeze rendering/updating of Three.js during the active ad midroll
            this.renderer.render(this.scene, this.camera);
            return;
        }

        const delta = this.clock.getDelta();
        const time = this.clock.elapsedTime;

        this.updateLives();
        this.updateMigrationEvent(delta);
        
        // Depth Scanner visual
        if (this.grid) {
            this.grid.setScannerActive(this.boosters.depth_scanner > 0);
        }

        // Handle Camera Shake
        if (this.shakeIntensity > 0.01) {
            this.camera.position.x = this.baseCameraPos.x + (Math.random() - 0.5) * this.shakeIntensity;
            this.camera.position.y = this.baseCameraPos.y + (Math.random() - 0.5) * this.shakeIntensity;
            this.shakeIntensity *= 0.9;
        } else if (this.shakeIntensity > 0) {
            this.camera.position.x = this.baseCameraPos.x;
            this.camera.position.y = this.baseCameraPos.y;
            this.shakeIntensity = 0;
        }

        if (this.grid) this.grid.update(delta, time);
        if (this.volcanicVent) this.volcanicVent.update(delta);
        
        // Update Hadal Particles
        if (this.hadalParticles) {
            this.hadalParticles.rotation.y += delta * 0.05;
            this.hadalParticles.rotation.x += delta * 0.03;
        }
        
        if (this.isAquariumActive) {
            // Decay cleanliness using effective rate (accounting for filters)
            const decayRate = this.getEffectiveDecayRate();
            this.tankCleanliness = Math.max(0, this.tankCleanliness - decayRate * delta);
            
            // Hunger decay
            this.fishSatiety = Math.max(0, this.fishSatiety - HUNGER_DECAY_RATE * delta);

            // Automatic feeding
            if (this.purchasedDecorations.includes('auto_feeder')) {
                this.fishSatiety = Math.min(100, this.fishSatiety + AUTO_FEED_RATE * delta);
            }

            // Increment cleanliness if scrubbing
            if (this.isScrubbing) {
                const prevCleanliness = this.tankCleanliness;
                this.tankCleanliness = Math.min(100, this.tankCleanliness + CLEANING_RATE * delta);
                if (Math.floor(prevCleanliness) !== Math.floor(this.tankCleanliness)) {
                    this.saveGameState(); // Throttle saves
                }
            }

            this.ui.updateCleanliness && this.ui.updateCleanliness(this.tankCleanliness);
            this.ui.updateHunger && this.ui.updateHunger(this.fishSatiety);

            // Update Algae Visual
            if (this.algaeOverlay) {
                const algaeIntensity = Math.max(0, (ALGAE_MIN_CLEANLINESS - this.tankCleanliness) / ALGAE_MIN_CLEANLINESS);
                this.algaeOverlay.material.opacity = algaeIntensity * 0.7; // Max 0.7 opacity
            }

            const overallHappiness = (this.tankCleanliness + this.fishSatiety) / 2;
            this.aquariumFish.forEach(f => {
                if (f.update) f.update(delta, this.aquariumFood, overallHappiness, this.aquariumFish);

                // Check proximity to decorations for "Sway" reaction
                if (f instanceof Fish && this.decorations) {
                    this.decorations.children.forEach(deco => {
                        if (deco instanceof Decoration) {
                            const dist = f.position.distanceTo(deco.position);
                            if (dist < 2.5) {
                                deco.reactToFish();
                            }
                        }
                    });
                }
            });

            // Breeding Logic
            if (overallHappiness >= BREEDING_HAPPINESS_THRESHOLD) {
                this.checkBreeding(delta);
            }

            // Update food
            for (let i = this.aquariumFood.length - 1; i >= 0; i--) {
                const food = this.aquariumFood[i];
                food.position.y -= 1.5 * delta; // Sink
                food.rotation.z += delta;

                // Check if eaten
                let eaten = false;
                for (const fish of this.aquariumFish) {
                    if (fish instanceof Fish && fish.position.distanceTo(food.position) < 0.8) {
                        eaten = true;
                        this.pearls += 1; // Reward for feeding
                        this.fishSatiety = Math.min(100, this.fishSatiety + 15); // Restore satiety
                        this.ui.updatePearls(this.pearls);
                        this.ui.updateHunger(this.fishSatiety);
                        this.saveGameState();
                        window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'pop' }));
                        break;
                    }
                }

                if (eaten || food.position.y < -6) {
                    this.scene.remove(food);
                    this.aquariumFood.splice(i, 1);
                }
            }
        }
        
        // Add subtle environmental motion
        if (this.seabed) {
            this.seabed.position.x = Math.sin(time * 0.2) * 0.5;
            this.seabed.position.y = Math.cos(time * 0.15) * 0.3;
        }
        if (this.caustics) {
            this.caustics.position.x = Math.sin(time * 0.2) * 1.2;
            this.caustics.position.y = Math.cos(time * 0.15) * 0.8;
            this.caustics.rotation.z = time * 0.02;
            
            // Pulse scale and texture offset for fluid realism
            const scale = 1.1 + Math.sin(time * 0.4) * 0.1;
            this.caustics.scale.set(scale, scale, 1);
            
            if (this.caustics.material.map) {
                this.caustics.material.map.offset.x = time * 0.015;
                this.caustics.material.map.offset.y = time * 0.01;
            }
        }
        if (this.lightRays) {
            this.lightRays.children.forEach((ray, i) => {
                ray.position.x += Math.sin(time * 0.5 + i) * 0.005;
                ray.opacity = 0.05 + Math.sin(time * 0.8 + i) * 0.03;
            });
        }

        this.renderer.render(this.scene, this.camera);
    }

    triggerCollectiveSonar() {
        if (!this.grid) return;
        
        // Visual feedback
        this.ui.showActiveHint("COLLECTIVE SONAR PULSE!");
        this.shakeIntensity = 1.5;
        
        // Affect the grid (stun boss or clear obstacles)
        this.grid.applyCollectiveSonar();
        
        window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'star' }));
    }
}

new Game();