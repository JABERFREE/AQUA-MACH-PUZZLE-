/* 
 * PROJECT: AQUA MATCH PUZZLE
 * DEVELOPER: Emad Ibrahim
 * STUDIO: NexApp Development Studio
 * COPYRIGHT: © 2026 NexApp. All Rights Reserved.
 */

import { dbManager } from './DatabaseManager.js';
import { LIFE_PACKS, DAILY_REWARDS, DAILY_MISSIONS, LEVEL_COUNT, GENETIC_TRAITS, ABYSSAL_VAULT_ACHIEVEMENTS } from './config.js';

export class UIManager {
    constructor(onLevelStart, onMenuStart) {
        this.onLevelStart = onLevelStart;
        this.onMenuStart = onMenuStart;
        this.currentView = 'menu'; // menu, levels, game, gameOver
        this.isGiftClaimed = localStorage.getItem('aqua_match_gift_claimed') === 'true';
        this.lastGiftTime = parseInt(localStorage.getItem('aqua_match_last_gift_time') || 0);
        this.dailyStreak = parseInt(localStorage.getItem('aqua_match_daily_streak') || 1);
        if (this.dailyStreak < 1) this.dailyStreak = 1;
        
        // Reset claim and check streak if 24 hours passed
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        
        if (this.lastGiftTime === 0) {
            this.dailyStreak = 1;
            localStorage.setItem('aqua_match_daily_streak', '1');
        } else if (now - this.lastGiftTime > oneDay) {
            this.isGiftClaimed = false;
            localStorage.setItem('aqua_match_gift_claimed', 'false');
            
            // If more than 48 hours passed, streak is lost (reset to day 1)
            if (now - this.lastGiftTime > oneDay * 2) {
                this.dailyStreak = 1;
                localStorage.setItem('aqua_match_daily_streak', '1');
            }
        }

        this.setupUI();
        this.showView('menu'); // Reverting to standard main menu start
    }
    
    attachFeedback(element) {
        if (!element) return;
        
        const handleInteraction = (e) => {
            // Immediate feedback on touch/pointer down
            if (window.gameAudioManager) window.gameAudioManager.playClick();
        };

        element.addEventListener('pointerdown', handleInteraction);

        element.addEventListener('mouseenter', () => {
            if (window.gameAudioManager) window.gameAudioManager.playHover();
        });
    }

    setupUI() {
        // Emergency cleanup of any previous root
        const oldRoot = document.getElementById('ui-root');
        if (oldRoot) oldRoot.remove();

        const root = document.createElement('div');
        root.id = 'ui-root';
        root.style.cssText = `
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            touch-action: none;
        `;
        const frame = document.getElementById('game-frame') || document.body;
        frame.appendChild(root);
        this.root = root;
        
        // Ensure buttons have auto pointer events and click feedback
        const style = document.createElement('style');
        style.innerHTML = `
            .interactive-btn, button { 
                pointer-events: auto !important; 
                transition: transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s !important;
                cursor: pointer !important;
            }
            .interactive-btn:active, button:active { 
                transform: scale(0.92) !important; 
                filter: brightness(0.9) !important;
            }
            .interactive-btn:hover, button:hover {
                filter: brightness(1.1);
            }
            @keyframes btn-glow {
                0% { transform: scale(1); box-shadow: 0 4px 10px rgba(255,215,0,0.3); }
                100% { transform: scale(1.03); box-shadow: 0 8px 25px rgba(255,215,0,0.7), 0 0 10px rgba(255,255,255,0.4); }
            }
            @keyframes hud-wobble {
                0%, 100% { transform: rotate(0deg) scale(1); }
                25% { transform: rotate(-5deg) scale(1.1); }
                50% { transform: rotate(5deg) scale(1.1); }
                75% { transform: rotate(-3deg) scale(1.1); }
            }
            @keyframes marker-float {
                0%, 100% { transform: translateY(0) rotate(10deg); }
                50% { transform: translateY(-10px) rotate(12deg); }
            }
            @keyframes fish-float {
                0%, 100% { transform: translateY(0) rotate(0deg); }
                50% { transform: translateY(-5px) rotate(3deg); }
            }
            @keyframes fish-complete-pulse {
                0% { transform: scale(1); filter: brightness(1); }
                30% { transform: scale(1.3); filter: brightness(1.5) drop-shadow(0 0 15px #00ffff); }
                60% { transform: scale(1.1); filter: brightness(1.2) drop-shadow(0 0 10px #00ffff); }
                80% { transform: scale(1.2); filter: brightness(1.4) drop-shadow(0 0 12px #00ffff); }
                100% { transform: scale(1); filter: brightness(1); }
            }
            @keyframes sparkle-burst {
                0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
            }
            .fish-float-anim {
                animation: fish-float 3s ease-in-out infinite;
            }
            .fish-complete-anim {
                animation: fish-complete-pulse 0.8s ease-out 3;
            }
            .hud-wobble-anim {
                animation: hud-wobble 0.6s ease-in-out;
            }
            .combo-message {
                position: absolute;
                top: 38%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-family: 'Orbitron', sans-serif;
                font-size: 2.3rem;
                font-weight: 900;
                color: #ffd700;
                text-shadow: 0 0 15px rgba(255, 215, 0, 0.8), 0 0 5px white, 0 4px 10px rgba(0,0,0,0.9);
                animation: combo-pop-anim 1.1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                pointer-events: none;
                z-index: 100000;
                white-space: pre-line;
                line-height: 1.2;
            }
            @keyframes combo-pop-anim {
                0% { transform: translate(-50%, -50%) scale(0.4); opacity: 0; }
                20% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
                80% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                100% { transform: translate(-50%, -120px) scale(0.85); opacity: 0; }
            }
        `;
        document.head.appendChild(style);

        // Top HUD Container - Glassy Light Blue
        // Top HUD Container - Glassy Light Blue, downscaled and clustered for mobile view compatibility
        this.topBar = document.createElement('div');
        this.topBar.id = 'top-bar-container';
        this.topBar.style.cssText = `
            position: absolute; top: 15px; width: 100%; max-width: 440px; box-sizing: border-box; padding: 0 12px;
            display: none; flex-direction: column; align-items: center; justify-content: center;
            pointer-events: none; z-index: 100000; left: 50%; transform: translateX(-50%);
        `;
        
        this.topBar.innerHTML = `
            <!-- Event Banner (New) -->
            <div id="event-banner" style="
                position: absolute; bottom: 105px; left: 50%; transform: translateX(-50%);
                background: linear-gradient(90deg, transparent, rgba(0, 255, 170, 0.8), transparent);
                padding: 5px 40px; border-radius: 10px; display: none; flex-direction: column; align-items: center;
                pointer-events: none; white-space: nowrap; transition: opacity 0.5s;
                border-top: 1px solid rgba(255,255,255,0.3); border-bottom: 1px solid rgba(255,255,255,0.3);
                z-index: 500;
            ">
                <div style="font-size: 0.65rem; color: #fff; text-transform: uppercase; font-weight: bold; letter-spacing: 2px;">Deep Sea Migration</div>
                <div id="event-text" style="font-size: 1.1rem; color: #fff; font-weight: bold; text-shadow: 0 0 10px #00ffaa;">LEGENDARY NEON TAI!</div>
            </div>

            <div style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 5px; padding: 0; pointer-events: none; flex-wrap: nowrap;">
                
                <!-- Heart Lives & Timer Widget (Compact) -->
                <div id="lives-section" class="interactive-btn" style="
                    display: flex; align-items: center; gap: 6px; padding: 4px 8px;
                    pointer-events: auto; cursor: pointer; transition: transform 0.2s;
                    text-shadow: 0 1px 4px rgba(0,0,0,0.8); position: relative;
                    background: rgba(255, 255, 255, 0.05); border-radius: 17px; border: 1.5px solid rgba(255,255,255,0.18); height: 34px;">
                    <img src="assets/heart-icon.webp" style="width: 28px; height: 28px; filter: drop-shadow(0 1px 5px rgba(0,0,0,0.5));">
                    <div style="display: flex; flex-direction: column; align-items: flex-start; justify-content: center;">
                        <span id="lives-count" style="font-size: 0.9rem; font-weight: bold; color: #fff; line-height: 1;">25</span>
                        <span id="lives-timer" style="font-size: 0.55rem; color: #00ffaa; font-weight: bold; letter-spacing: 0.5px; line-height: 1; margin-top: 1px;">FULL</span>
                    </div>
                    <div id="life-refill-bar-container" style="position: absolute; bottom: -5px; left: 10%; width: 80%; height: 3px; background: rgba(0,0,0,0.3); border-radius: 1.5px; overflow: hidden; display: none; border: 1px solid rgba(255,255,255,0.1);">
                        <div id="life-refill-progress" style="width: 0%; height: 100%; background: #00ffaa; box-shadow: 0 0 3px #00ffaa;"></div>
                    </div>
                </div>

                <!-- Pearl HUD (Compact) -->
                <div id="pearl-hud" class="interactive-btn" style="
                    display: flex; align-items: center; gap: 6px; padding: 4px 10px; 
                    pointer-events: auto; text-shadow: 0 1px 4px rgba(0,0,0,0.8); cursor: pointer;
                    background: rgba(255, 255, 255, 0.05); border-radius: 17px; border: 1.5px solid rgba(255,255,255,0.18); height: 34px;">
                    <span style="font-size: 1.25rem; filter: drop-shadow(0 0 3px #fff); line-height: 1;">⚪</span>
                    <span id="hud-pearl-count" style="font-size: 0.9rem; font-weight: bold; color: #fff; line-height: 1;">0</span>
                    <span style="font-size: 0.9rem; color: #00ffaa; font-weight: bold; margin-left: 1px; line-height: 1;">+</span>
                </div>

                <!-- Daily Gift Shortcut (Compact Row Layout) -->
                <div id="top-gift-btn" class="interactive-btn" style="
                    display: flex; align-items: center; gap: 6px; padding: 4px 8px; cursor: pointer; 
                    pointer-events: auto; transition: transform 0.3s;
                    text-shadow: 0 1px 4px rgba(0,0,0,0.8);
                    background: rgba(255, 255, 255, 0.05); border-radius: 17px; border: 1.5px solid rgba(255,255,255,0.18); height: 34px;">
                    <div class="chest-idle" style="filter: drop-shadow(0 2px 8px rgba(0,0,0,0.4)); display: flex; align-items: center;">
                         <img src="assets/treasure-chest-closed.webp" style="width: 28px; height: 28px;">
                    </div>
                    <span style="font-size: 0.55rem; font-weight: bold; text-transform: uppercase; line-height: 1;">Gift</span>
                </div>

                <!-- Score & Level Widget (Compact) -->
                <div id="score-level-container" style="
                    display: flex; align-items: center; gap: 10px; padding: 4px 10px;
                    pointer-events: auto; text-shadow: 0 1px 4px rgba(0,0,0,0.8);
                    background: rgba(255, 255, 255, 0.05); border-radius: 17px; border: 1.5px solid rgba(255,255,255,0.18); height: 34px;">
                    
                    <div id="total-stars-section" style="display: none; align-items: center; gap: 3px;">
                        <span style="font-size: 1rem; font-weight: bold; color: #ffd700;">★</span>
                        <span id="total-stars-count" style="font-size: 0.9rem; font-weight: bold; color: #fff;">0</span>
                    </div>
                    <div id="hud-score-section" style="display: flex; align-items: center; gap: 4px;">
                        <span style="font-size: 0.55rem; font-weight: bold; text-transform: uppercase; opacity: 0.9; line-height: 1;">Score</span>
                        <span id="score-indicator" style="font-size: 0.9rem; font-weight: bold; color: #ffd700; line-height: 1;">0</span>
                    </div>
                    <div id="hud-level-section" style="display: flex; align-items: center; gap: 4px;">
                        <span style="font-size: 0.55rem; font-weight: bold; text-transform: uppercase; opacity: 0.9; line-height: 1;">Lvl</span>
                        <span id="level-indicator" style="font-size: 0.9rem; font-weight: bold; color: #fff; line-height: 1;">1</span>
                    </div>
                </div>
            </div>

            <!-- Mini Collect Objective Icon (Top) - FISH ICON CONTAINER -->
            <div id="top-mini-objective" style="
                display: none; align-items: center; justify-content: center; 
                margin-top: 8px; background: rgba(0, 40, 100, 0.7); 
                padding: 4px 12px; border-radius: 20px; border: 1.5px solid #00ffff;
                pointer-events: auto; backdrop-filter: blur(8px); position: relative;
                box-shadow: 0 4px 15px rgba(0, 255, 255, 0.3);
                height: 36px;
            ">
                <img id="top-mini-objective-icon" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" style="width: 28px; height: 28px; filter: drop-shadow(0 0 6px rgba(255,255,255,1)); z-index: 1;">
                <div style="display: flex; align-items: baseline; gap: 4px; margin-left: 8px; z-index: 1;">
                    <span id="top-mini-objective-count" style="font-size: 1.2rem; font-weight: 900; color: #00ffaa; font-family: 'Orbitron', sans-serif; line-height: 1; text-shadow: 0 0 8px rgba(0,255,170,0.6);">0</span>
                </div>
            </div>
        `;
        this.root.appendChild(this.topBar);

        // Bottom Navigation Container - Matching Glassy Style, downscaled and clustered for mobile compatibility
        this.bottomBar = document.createElement('div');
        this.bottomBar.id = 'bottom-nav-container';
        this.bottomBar.style.cssText = `
            position: absolute; bottom: 10px; width: 98%; max-width: 500px;
            height: 125px; display: none; align-items: center; justify-content: center;
            pointer-events: none; z-index: 100000; left: 50%; transform: translateX(-50%);
        `;
        
        this.bottomBar.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; width: 100%; pointer-events: none;">
                <!-- Moves Left (Floating above settings) -->
                <div id="moves-container" style="display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.95); padding: 4px 14px; border-radius: 15px; border: 1.5px solid #50b4ff; color: #0055ff; box-shadow: 0 3px 10px rgba(0,0,0,0.15); font-weight: bold; pointer-events: auto;">
                    <span id="shield-indicator" style="display: none; align-items: center; gap: 4px; margin-right: 6px; color: #ffaa00; font-size: 0.8rem;">
                        <img src="assets/bubble-shield-powerup.webp" style="width: 20px; height: 20px;">
                        <span id="shield-turns" style="font-size: 0.8rem;">5</span>
                    </span>
                    <span style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.5px;">Moves</span>
                    <span id="moves-indicator" style="font-size: 1rem; font-weight: 900;">0</span>
                </div>

                <!-- Clustered side-by-side controls (Menu, Speaker/Mute, Settings Gear, Items) -->
                <div style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; pointer-events: auto;">
                    <!-- Menu Button -->
                    <div id="menu-btn" style="width: 68px; height: 28px; 
                        background: linear-gradient(180deg, rgba(160, 220, 255, 0.85) 0%, rgba(80, 180, 255, 0.7) 100%);
                        border: 1.5px solid white; border-radius: 14px; display: flex; align-items: center; justify-content: center; cursor: pointer; 
                        box-shadow: 0 3px 8px rgba(0,0,0,0.25); backdrop-filter: blur(4px); pointer-events: auto;">
                        <span style="font-size: 0.75rem; font-weight: bold; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">Menu</span>
                    </div>

                    <!-- Speaker Mute Button (Consolidated) -->
                    <div id="inline-mute-btn" style="width: 32px; height: 32px; 
                        background: rgba(0, 40, 100, 0.7); border: 1.5px solid #00ffff;
                        border-radius: 50%; display: flex; align-items: center; justify-content: center;
                        cursor: pointer; box-shadow: 0 3px 8px rgba(0,0,0,0.25); backdrop-filter: blur(4px); pointer-events: auto;">
                        <span id="inline-mute-icon" style="font-size: 0.95rem; line-height: 1;">${localStorage.getItem('aqua_match_muted') === 'true' ? '🔇' : '🔊'}</span>
                    </div>

                    <!-- Settings Button -->
                    <div id="settings-btn" style="width: 32px; height: 32px; 
                        background: linear-gradient(180deg, rgba(160, 220, 255, 0.9) 0%, rgba(80, 180, 255, 0.75) 100%);
                        border: 1.5px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; 
                        box-shadow: 0 3px 8px rgba(0,0,0,0.25); backdrop-filter: blur(4px); pointer-events: auto;">
                        <span style="font-size: 1.15rem; color: white; line-height: 1;">⚙</span>
                    </div>

                    <!-- Hint Button (New) -->
                    <div id="hint-btn" style="width: 32px; height: 32px; 
                        background: linear-gradient(180deg, #ffd700 0%, #ffaa00 100%);
                        border: 1.5px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; 
                        box-shadow: 0 3px 8px rgba(0,0,0,0.25); backdrop-filter: blur(4px); pointer-events: auto;">
                        <span style="font-size: 1.15rem; color: white; line-height: 1;">💡</span>
                    </div>

                    <!-- Boosters Drawer Button -->
                    <div id="boosters-btn" style="width: 68px; height: 28px; 
                        background: linear-gradient(180deg, rgba(160, 220, 255, 0.85) 0%, rgba(80, 180, 255, 0.7) 100%);
                        border: 1.5px solid white; border-radius: 14px; display: flex; align-items: center; justify-content: center; cursor: pointer; 
                        box-shadow: 0 3px 8px rgba(0,0,0,0.25); backdrop-filter: blur(4px); pointer-events: auto; position: relative;">
                        <span style="font-size: 0.75rem; font-weight: bold; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">Items</span>
                    </div>
                </div>
            </div>

            <!-- Booster Inventory Drawer (Slides from Right) - Ultra-Compact for mobile frame compatibility -->
            <div id="booster-drawer" style="
                position: absolute; right: 8px; bottom: 92px;
                background: linear-gradient(180deg, rgba(0, 40, 100, 0.9) 0%, rgba(0, 20, 50, 0.95) 100%);
                border: 2.5px solid #00ffff; border-radius: 20px; padding: 10px;
                display: none; flex-direction: column; gap: 10px; min-width: 85px;
                backdrop-filter: blur(10px); z-index: 2000;
                box-shadow: -5px 0 25px rgba(0,0,0,0.5);
            ">
                <div style="font-size: 0.65rem; color: #00ffff; font-weight: bold; text-align: center; text-transform: uppercase; letter-spacing: 0.5px;">Booster Deck</div>
                
                <div id="hammer-booster" class="interactive-btn" style="display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; background: rgba(255,255,255,0.05); padding: 6px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                    <img src="assets/pearl-powerup-sprite-webp.webp" style="width: 32px; height: 32px; filter: hue-rotate(90deg) drop-shadow(0 0 4px cyan);">
                    <div style="display: flex; align-items: center; gap: 3px;">
                        <span style="font-size: 0.52rem; font-weight: bold; color: #add8e6;">HAMMER</span>
                        <span id="hammer-count" style="font-size: 0.85rem; font-weight: bold; color: #ffd700;">3</span>
                    </div>
                </div>

                <div id="shuffle-booster" class="interactive-btn" style="display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; background: rgba(255,255,255,0.05); padding: 6px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #0088ff, #0055ff); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; box-shadow: 0 0 6px rgba(0,136,255,0.5);">🔀</div>
                    <div style="display: flex; align-items: center; gap: 3px;">
                        <span style="font-size: 0.52rem; font-weight: bold; color: #add8e6;">SHUFFLE</span>
                        <span id="shuffle-count" style="font-size: 0.85rem; font-weight: bold; color: #ffd700;">2</span>
                    </div>
                </div>

                <div id="color-bomb-booster" class="interactive-btn" style="display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; background: rgba(255,255,255,0.05); padding: 6px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                    <img src="assets/rainbow-fish-sprite.webp" style="width: 32px; height: 32px; filter: drop-shadow(0 0 6px magenta);">
                    <div style="display: flex; align-items: center; gap: 3px;">
                        <span style="font-size: 0.52rem; font-weight: bold; color: #add8e6;">COLOR BOMB</span>
                        <span id="color-bomb-count" style="font-size: 0.85rem; font-weight: bold; color: #ffd700;">1</span>
                    </div>
                </div>

                <div id="rocket-booster" class="interactive-btn" style="display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; background: rgba(255,255,255,0.05); padding: 6px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="font-size: 1.3rem; filter: drop-shadow(0 0 6px #ff4400);">🚀</div>
                    <div style="display: flex; align-items: center; gap: 3px;">
                        <span style="font-size: 0.52rem; font-weight: bold; color: #add8e6;">ROW ROCKET</span>
                        <span id="rocket-count" style="font-size: 0.85rem; font-weight: bold; color: #ffd700;">2</span>
                    </div>
                </div>

                <div id="rocket-v-booster" class="interactive-btn" style="display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; background: rgba(255,255,255,0.05); padding: 6px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="font-size: 1.3rem; filter: drop-shadow(0 0 6px #00ffaa); transform: rotate(90deg);">🚀</div>
                    <div style="display: flex; align-items: center; gap: 3px;">
                        <span style="font-size: 0.52rem; font-weight: bold; color: #add8e6;">COL ROCKET</span>
                        <span id="rocket-v-count" style="font-size: 0.85rem; font-weight: bold; color: #ffd700;">2</span>
                    </div>
                </div>

                <div id="booster-hint" style="font-size: 0.6rem; color: #ffd700; text-align: center; font-style: italic; opacity: 0; transition: opacity 0.3s;">Select a bubble!</div>
            </div>
        `;
        this.root.appendChild(this.bottomBar);

        // Add Floating Fullscreen control
        const bottomRightFullscreen = document.createElement('div');
        bottomRightFullscreen.id = 'bottom-right-fullscreen-btn';
        bottomRightFullscreen.className = 'interactive-btn';
        bottomRightFullscreen.style.cssText = `
            position: absolute; right: 15px; bottom: 85px; width: 44px; height: 44px;
            background: rgba(0, 40, 100, 0.7); border: 2.5px solid #00ffff;
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            cursor: pointer; pointer-events: auto; z-index: 100000; box-shadow: 0 4px 10px rgba(0,0,0,0.4);
            backdrop-filter: blur(5px); display: none;
        `;
        bottomRightFullscreen.innerHTML = `<span style="font-size: 1.2rem; line-height: 1;">⛶</span>`;
        this.root.appendChild(bottomRightFullscreen);

        // Wire up all top-right red close buttons (.close-x-btn) automatically via event delegation
        this.root.addEventListener('click', (e) => {
            const btn = e.target.closest('.close-x-btn');
            if (btn) {
                e.stopPropagation();
                if (window.gameAudioManager) window.gameAudioManager.playClick();
                const target = btn.getAttribute('data-close-target') || 'menu';
                if (target === 'prev') {
                    const prev = this.prevView || 'menu';
                    this.showView(prev);
                } else {
                    this.showView(target);
                }
            }
        });

        const inlineMuteBtn = this.bottomBar.querySelector('#inline-mute-btn');
        if (inlineMuteBtn) {
            inlineMuteBtn.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                if (window.gameAudioManager) {
                    const isMuted = window.gameAudioManager.toggleMute();
                    this.syncMuteState(isMuted);
                }
            });
        }

        // Fullscreen Toggle button listener
        bottomRightFullscreen.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            if (!document.fullscreenElement) {
                const frame = document.getElementById('game-frame') || document.documentElement;
                frame.requestFullscreen().catch(err => {
                    console.error("Error enabling fullscreen:", err);
                    document.documentElement.requestFullscreen().catch(e => console.error(e));
                });
            } else {
                document.exitFullscreen();
            }
        });

        // Add Decorative Reef Layer (As requested)
        this.reefLayer = document.createElement('div');
        this.reefLayer.id = 'ui-reef-layer';
        this.reefLayer.style.cssText = `
            position: absolute; bottom: -10px; width: 100%; height: 160px;
            pointer-events: none; z-index: 900;
            display: flex; justify-content: space-between; align-items: flex-end;
            padding: 0 5%; overflow: visible;
        `;
        
        const coralSrc = 'assets/شعب-مرجانية.png';
        this.reefLayer.innerHTML = `
            <img src="${coralSrc}" style="width: 180px; height: auto; transform-origin: bottom; animation: reef-sway 6s ease-in-out infinite; filter: drop-shadow(0 -5px 15px rgba(0,0,0,0.6)) brightness(1.1);">
            <img src="${coralSrc}" style="width: 150px; height: auto; transform: scaleX(-1); transform-origin: bottom; animation: reef-sway 8s ease-in-out infinite 1s; filter: drop-shadow(0 -5px 15px rgba(0,0,0,0.6)) brightness(1.1);">
            <img src="${coralSrc}" style="width: 130px; height: auto; position: absolute; left: 35%; transform: translateX(-50%) rotate(-5deg); bottom: -10px; opacity: 0.7; z-index: -1; filter: blur(1px) brightness(0.8);">
            <img src="${coralSrc}" style="width: 130px; height: auto; position: absolute; left: 65%; transform: translateX(-50%) rotate(5deg); bottom: -10px; opacity: 0.7; z-index: -1; filter: blur(1px) brightness(0.8);">
        `;
        this.root.appendChild(this.reefLayer);

        // Click listeners
        const livesSection = this.topBar.querySelector('#lives-section');
        const topGiftBtn = this.topBar.querySelector('#top-gift-btn');
        const pearlHud = this.topBar.querySelector('#pearl-hud');
        const hudMissionsBtn = this.topBar.querySelector('#hud-missions-btn');

        if (livesSection) livesSection.addEventListener('pointerdown', () => this.showBoosterShop());
        if (topGiftBtn) topGiftBtn.addEventListener('pointerdown', () => this.showDailyGiftModal());
        if (pearlHud) pearlHud.addEventListener('pointerdown', () => this.showBoosterShop());
        if (hudMissionsBtn) hudMissionsBtn.addEventListener('pointerdown', () => this.showView('missions'));
        
        this.bottomBar.querySelector('#menu-btn').addEventListener('pointerdown', () => this.showView('menu'));
        this.bottomBar.querySelector('#settings-btn').addEventListener('pointerdown', () => this.showSettingsModal());
        this.bottomBar.querySelector('#hint-btn').addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('request-hint'));
        });
        
        // Start Wobble Animation for interactive icons
        setInterval(() => {
            const chest = this.topBar.querySelector('#top-gift-btn img');
            const heart = this.topBar.querySelector('#lives-section img');
            if (chest) {
                chest.classList.add('hud-wobble-anim');
                setTimeout(() => chest.classList.remove('hud-wobble-anim'), 600);
            }
            if (heart) {
                setTimeout(() => {
                    heart.classList.add('hud-wobble-anim');
                    setTimeout(() => heart.classList.remove('hud-wobble-anim'), 600);
                }, 300); // Stagger slightly
            }
        }, 5000);
        
        const boostersBtn = this.bottomBar.querySelector('#boosters-btn');
        const boosterDrawer = this.bottomBar.querySelector('#booster-drawer');
        boostersBtn.addEventListener('pointerdown', (e) => {
            if (this.currentView !== 'game') return;
            const isVisible = boosterDrawer.style.display === 'flex';
            if (isVisible) {
                boosterDrawer.style.display = 'none';
                boosterDrawer.classList.remove('drawer-open');
            } else {
                boosterDrawer.style.display = 'flex';
                boosterDrawer.classList.add('drawer-open');
            }
            e.stopPropagation();
        });

        document.addEventListener('pointerdown', () => {
            boosterDrawer.style.display = 'none';
            boosterDrawer.classList.remove('drawer-open');
        });

        this.bottomBar.querySelector('#hammer-booster').addEventListener('pointerdown', () => {
            window.dispatchEvent(new CustomEvent('use-booster', { detail: { type: 'hammer' } }));
        });
        this.bottomBar.querySelector('#shuffle-booster').addEventListener('pointerdown', () => {
            window.dispatchEvent(new CustomEvent('use-booster', { detail: { type: 'shuffle' } }));
        });
        this.bottomBar.querySelector('#color-bomb-booster').addEventListener('pointerdown', () => {
            window.dispatchEvent(new CustomEvent('use-booster', { detail: { type: 'colorBomb' } }));
        });
        this.bottomBar.querySelector('#rocket-booster').addEventListener('pointerdown', () => {
            window.dispatchEvent(new CustomEvent('use-booster', { detail: { type: 'rocket' } }));
        });
        this.bottomBar.querySelector('#rocket-v-booster').addEventListener('pointerdown', () => {
            window.dispatchEvent(new CustomEvent('use-booster', { detail: { type: 'rocketV' } }));
        });
        
        // Modal Container (Daily Gift)
        this.modalOverlay = document.createElement('div');
        this.modalOverlay.id = 'modal-overlay';
        this.modalOverlay.style.cssText = `
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.7); display: none; align-items: center; justify-content: center;
            z-index: 200000; pointer-events: none; backdrop-filter: blur(5px);
        `;
        this.root.appendChild(this.modalOverlay);

        // Dedicated Custom Confirmation dialog overlay (highest layer, blurs behind, non-interfering)
        this.confirmOverlay = document.createElement('div');
        this.confirmOverlay.id = 'confirm-overlay';
        this.confirmOverlay.style.cssText = `
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 10, 30, 0.85); display: none; align-items: center; justify-content: center;
            z-index: 350000; pointer-events: none; backdrop-filter: blur(8px);
        `;
        this.root.appendChild(this.confirmOverlay);

        // View Definitions
        this.menuView = this.createView('menu');
        this.menuView.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; z-index: 100; padding: 20px;">
                <h1 style="font-size: 3rem; margin-bottom: 1.5rem; text-shadow: 0 0 20px #00aaff, 0 0 10px white; letter-spacing: 4px; text-align: center; color: white;">AQUA MATCH</h1>
                
                <!-- Main Options Interface -->
                <div style="display: flex; flex-direction: column; gap: 12px; width: 280px; padding: 25px; background: rgba(0, 15, 45, 0.5); border-radius: 40px; border: 2px solid rgba(0, 255, 255, 0.15); backdrop-filter: blur(10px); box-shadow: 0 10px 40px rgba(0,0,0,0.6);">
                    <button id="start-btn" class="interactive-btn" style="padding: 0.85rem; font-size: 1.25rem; background: linear-gradient(135deg, #00ffaa, #00aaff); border: 2.5px solid white; color: black; cursor: pointer; border-radius: 50px; font-family: inherit; font-weight: 900; box-shadow: 0 4px 15px rgba(0,255,170,0.4);">PLAY NOW</button>
                    <button id="aquarium-btn" class="interactive-btn" style="padding: 0.75rem; font-size: 1rem; background: rgba(0, 255, 170, 0.1); border: 2px solid #00ffaa; color: white; cursor: pointer; border-radius: 50px; font-family: inherit; font-weight: 800; text-shadow: 0 0 8px #00ffaa; letter-spacing: 1px;">MY AQUARIUM</button>
                    <button id="store-btn" class="interactive-btn" style="padding: 0.75rem; font-size: 1rem; background: rgba(0, 170, 255, 0.1); border: 2px solid #00aaff; color: white; cursor: pointer; border-radius: 50px; font-family: inherit; font-weight: 800; text-shadow: 0 0 8px #00aaff; letter-spacing: 1px;">DECORATION STORE</button>
                    <button id="missions-btn" class="interactive-btn" style="padding: 0.75rem; font-size: 1rem; background: rgba(0, 255, 255, 0.1); border: 2px solid #00ffff; color: white; cursor: pointer; border-radius: 50px; font-family: inherit; font-weight: 800; text-shadow: 0 0 8px #00ffff; letter-spacing: 1px;">DAILY MISSIONS</button>
                    <button id="leaderboard-btn" class="interactive-btn" style="padding: 0.75rem; font-size: 1rem; background: rgba(255, 215, 0, 0.1); border: 2px solid #ffd700; color: #ffd700; cursor: pointer; border-radius: 50px; font-family: inherit; font-weight: 800; text-shadow: 0 0 8px #ffd700; letter-spacing: 1px;">LEADERBOARD</button>
                </div>

                <!-- Secondary Options -->
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button id="vault-btn" class="interactive-btn" style="padding: 0.6rem 1.2rem; font-size: 0.75rem; background: rgba(255, 215, 0, 0.05); border: 1.5px solid rgba(255, 215, 0, 0.5); color: #ffd700; cursor: pointer; border-radius: 20px; font-family: inherit; font-weight: bold; position: relative;">
                        VAULT 🏆
                    </button>
                    <button id="tournament-btn" class="interactive-btn" style="padding: 0.6rem 1.2rem; font-size: 0.75rem; background: rgba(255, 100, 0, 0.05); border: 1.5px solid rgba(255, 100, 0, 0.5); color: #ff6400; cursor: pointer; border-radius: 20px; font-family: inherit; font-weight: bold; position: relative;">
                        TOURNAMENT <span style="color: #ff4444; animation: pulse 1s infinite;">●</span>
                    </button>
                </div>
            </div>
        `;
        this.menuView.querySelector('#start-btn').addEventListener('click', () => this.showView('levels'));
        this.menuView.querySelector('#leaderboard-btn').addEventListener('click', () => this.showView('leaderboard'));
        this.menuView.querySelector('#aquarium-btn').addEventListener('click', () => this.showView('aquariumMode'));
        this.menuView.querySelector('#store-btn').addEventListener('click', () => this.showView('store'));
        this.menuView.querySelector('#missions-btn').addEventListener('click', () => this.showView('missions'));
        this.menuView.querySelector('#vault-btn').addEventListener('click', () => this.showView('vault'));
        this.menuView.querySelector('#tournament-btn').addEventListener('click', () => this.showView('tournament'));

        // Attach audio/visual feedback to menu buttons
        ['#start-btn', '#leaderboard-btn', '#aquarium-btn', '#store-btn', '#missions-btn', '#vault-btn', '#tournament-btn'].forEach(id => {
            this.attachFeedback(this.menuView.querySelector(id));
        });

        // Tournament View
        this.tournamentView = this.createView('tournament');
        this.tournamentView.style.background = 'radial-gradient(circle at center, #001e4b 0%, #000 100%)';
        
        this.tournamentView.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; padding: 40px 20px; overflow-y: auto; position: relative;">
                <!-- Red Close button in top-right -->
                <button class="interactive-btn close-x-btn" data-close-target="menu" style="position: absolute; top: 15px; right: 15px; width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #ff4444, #cc0000); border: 2px solid white; color: white; font-weight: bold; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 10px rgba(255,0,0,0.4), 0 0 5px rgba(255,255,255,0.5); z-index: 10001;">✕</button>

                <div style="font-size: 0.8rem; color: #ff6400; font-weight: bold; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 5px;">Active Event</div>
                <h2 style="font-size: 2.2rem; margin-bottom: 0.5rem; text-shadow: 0 0 20px #ff6400; color: white; text-align: center;">THE ABYSSAL SPRINT</h2>
                
                <div id="tournament-timer" style="background: rgba(255,100,0,0.2); padding: 8px 25px; border-radius: 20px; border: 1px solid #ff6400; color: #ff6400; font-weight: bold; font-size: 1rem; margin-bottom: 25px;">
                    Ends in: 23:45:12
                </div>

                <div style="width: 100%; max-width: 450px; background: rgba(255,255,255,0.05); border-radius: 30px; border: 1px solid rgba(255,255,255,0.1); padding: 25px; margin-bottom: 20px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #add8e6; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Your Progress</div>
                    <div id="player-tournament-depth" style="font-size: 2.5rem; font-weight: 900; color: white; margin-bottom: 5px;">0m</div>
                    <div style="font-size: 0.8rem; color: #ff6400;">Current Rank: #--</div>
                </div>

                <div style="width: 100%; max-width: 450px; flex: 1; display: flex; flex-direction: column; gap: 10px;">
                    <div style="font-size: 0.9rem; color: white; font-weight: bold; text-align: left; padding-left: 10px; margin-bottom: 5px; display: flex; justify-content: space-between;">
                        <span>LEADERBOARD</span>
                        <span style="color: #ff6400;">PRIZE: 1,500 PEARLS</span>
                    </div>
                    <div id="tournament-list" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
                        <!-- Tournament entries here -->
                    </div>
                </div>

                <button id="tournament-back-btn" class="interactive-btn" style="margin-top: 25px; padding: 1rem 4rem; background: rgba(255,255,255,0.1); border: 2px solid white; color: white; cursor: pointer; border-radius: 30px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">BACK</button>
            </div>
        `;
        this.tournamentView.querySelector('#tournament-back-btn').addEventListener('click', () => this.showView('menu'));
        this.attachFeedback(this.tournamentView.querySelector('#tournament-back-btn'));

        // Abyssal Vault View
        this.vaultView = this.createView('vault');
        this.vaultView.style.background = 'radial-gradient(circle at top, #1a1a2e 0%, #0f0f1b 100%)';
        this.vaultView.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; padding: 40px 20px; overflow-y: auto; position: relative;">
                <!-- Red Close button in top-right -->
                <button class="interactive-btn close-x-btn" data-close-target="menu" style="position: absolute; top: 15px; right: 15px; width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #ff4444, #cc0000); border: 2px solid white; color: white; font-weight: bold; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 10px rgba(255,0,0,0.4), 0 0 5px rgba(255,255,255,0.5); z-index: 10001;">✕</button>

                <div style="font-size: 0.8rem; color: #ffd700; font-weight: bold; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 5px;">Collection Rewards</div>
                <h2 style="font-size: 2.5rem; margin-bottom: 0.5rem; text-shadow: 0 0 20px #ffd700; color: white; text-align: center;">ABYSSAL VAULT</h2>
                
                <div id="vault-progress-container" style="width: 100%; max-width: 450px; background: rgba(255,255,255,0.05); border-radius: 30px; border: 1px solid rgba(255,255,255,0.1); padding: 20px; margin-bottom: 25px; text-align: center;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #add8e6; text-transform: uppercase; margin-bottom: 8px;">
                        <span>Overall Completion</span>
                        <span id="vault-completion-percent">0%</span>
                    </div>
                    <div style="width: 100%; height: 12px; background: rgba(0,0,0,0.3); border-radius: 6px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
                        <div id="vault-completion-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #ffd700, #ff8800); box-shadow: 0 0 10px #ffd700; transition: width 1s ease-out;"></div>
                    </div>
                </div>

                <div id="vault-list" style="width: 100%; max-width: 450px; flex: 1; display: flex; flex-direction: column; gap: 15px;">
                    <!-- Achievement items here -->
                </div>

                <button id="vault-back-btn" class="interactive-btn" style="margin-top: 25px; padding: 1rem 4rem; background: rgba(255,255,255,0.1); border: 2px solid white; color: white; cursor: pointer; border-radius: 30px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">BACK</button>
            </div>
        `;
        this.vaultView.querySelector('#vault-back-btn').addEventListener('click', () => this.showView('menu'));
        this.attachFeedback(this.vaultView.querySelector('#vault-back-btn'));

        // Aquarium Mode (3D Swimming)
        this.aquariumModeView = this.createView('aquariumMode');
        this.aquariumModeView.innerHTML = `
            <!-- Red Close button in top-right -->
            <button class="interactive-btn close-x-btn" data-close-target="menu" style="position: absolute; top: 15px; right: 15px; width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #ff4444, #cc0000); border: 2px solid white; color: white; font-weight: bold; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 10px rgba(255,0,0,0.4), 0 0 5px rgba(255,255,255,0.5); z-index: 10001;">✕</button>

            <div id="aquarium-hud" style="position: absolute; top: 20px; width: 100%; display: flex; flex-direction: column; align-items: center; pointer-events: none; gap: 10px;">
                <div style="background: rgba(0, 50, 150, 0.6); backdrop-filter: blur(10px); padding: 10px 30px; border-radius: 40px; border: 2px solid rgba(255,255,255,0.3); color: white; text-align: center;">
                    <div style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">Peaceful Mode</div>
                    <div style="font-size: 1.4rem; font-weight: bold;">Your Sanctuary</div>
                </div>

                <!-- Cleanliness Meter -->
                <div id="cleanliness-widget" style="background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(5px); padding: 10px 20px; border-radius: 20px; border: 1px solid rgba(0, 255, 170, 0.5); display: flex; flex-direction: column; gap: 5px; width: 220px; position: relative;">
                    <div id="filter-status" style="position: absolute; right: -35px; top: 15px; display: none; filter: drop-shadow(0 0 5px #00ffaa);">
                        <span style="font-size: 1.2rem;">⚙️</span>
                    </div>
                    <div id="feeder-status" style="position: absolute; right: -35px; bottom: 15px; display: none; filter: drop-shadow(0 0 5px #ffcc00);">
                        <span style="font-size: 1.2rem;">🥫</span>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; font-size: 0.7rem; font-weight: bold; text-transform: uppercase;">
                        <span>Hygiene</span>
                        <span id="clean-percent">100%</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; margin-bottom: 5px;">
                        <div id="clean-bar" style="width: 100%; height: 100%; background: linear-gradient(90deg, #ff4444, #00ffaa); transition: width 0.3s;"></div>
                    </div>

                    <div style="display: flex; justify-content: space-between; font-size: 0.7rem; font-weight: bold; text-transform: uppercase;">
                        <span>Nutrition</span>
                        <span id="hunger-percent">100%</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                        <div id="hunger-bar" style="width: 100%; height: 100%; background: linear-gradient(90deg, #ff4444, #ffd700); transition: width 0.3s;"></div>
                    </div>
                </div>
                
                <div style="font-size: 0.7rem; color: #ffd700; text-transform: uppercase; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">Scrub walls to clean algae • Tap to feed</div>
            </div>
            
            <div style="position: absolute; bottom: 30px; display: flex; gap: 15px; z-index: 10;">
                <button id="aq-zen-btn" style="padding: 0.8rem 2rem; background: rgba(0, 255, 170, 0.2); border: 2px solid #00ffaa; color: white; cursor: pointer; border-radius: 25px; font-weight: bold; backdrop-filter: blur(5px);">ZEN MODE</button>
                <button id="aq-encyclopedia-btn" style="padding: 0.8rem 2rem; background: rgba(255,255,255,0.15); border: 2px solid white; color: white; cursor: pointer; border-radius: 25px; font-weight: bold; backdrop-filter: blur(5px);">ENCYCLOPEDIA</button>
                <button id="aq-exit-btn" style="padding: 0.8rem 2rem; background: rgba(255,255,255,0.15); border: 2px solid white; color: white; cursor: pointer; border-radius: 25px; font-weight: bold; backdrop-filter: blur(5px);">EXIT</button>
            </div>
        `;
        this.aquariumModeView.querySelector('#aq-exit-btn').addEventListener('click', () => this.showView('menu'));
        this.aquariumModeView.querySelector('#aq-encyclopedia-btn').addEventListener('click', () => this.showView('aquarium'));
        this.aquariumModeView.querySelector('#aq-zen-btn').addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('toggle-zen-mode', { detail: true }));
        });

        // Store View
        this.storeView = this.createView('store');
        this.storeView.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; padding: 40px 20px; position: relative;">
                <!-- Red Close button in top-right -->
                <button class="interactive-btn close-x-btn" data-close-target="menu" style="position: absolute; top: 15px; right: 15px; width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #ff4444, #cc0000); border: 2px solid white; color: white; font-weight: bold; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 10px rgba(255,0,0,0.4), 0 0 5px rgba(255,255,255,0.5); z-index: 10001;">✕</button>

                <h2 style="font-size: 2.5rem; margin-bottom: 0.5rem; text-shadow: 0 0 15px #00ffaa; color: white;">AQUARIUM STORE</h2>
                
                <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <button id="store-tab-decor" style="padding: 8px 20px; border-radius: 20px; border: 2px solid #00ffaa; background: #00ffaa; color: black; font-weight: bold; cursor: pointer;">DECOR</button>
                    <button id="store-tab-habitat" style="padding: 8px 20px; border-radius: 20px; border: 2px solid white; background: rgba(255,255,255,0.1); color: white; font-weight: bold; cursor: pointer;">HABITAT</button>
                </div>

                <div style="display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.4); padding: 5px 20px; border-radius: 20px; border: 1px solid #00ffaa; margin-bottom: 20px;">
                    <span style="font-size: 1.5rem;">⚪</span>
                    <span id="store-pearl-count" style="font-size: 1.5rem; font-weight: bold; color: #fff;">0</span>
                    <span style="font-size: 0.8rem; color: #00ffaa; font-weight: bold; text-transform: uppercase;">Pearls</span>
                </div>
                
                <div id="store-list" style="width: 100%; max-width: 500px; flex: 1; overflow-y: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; padding: 10px;">
                    <!-- Items will be injected here -->
                </div>

                <button id="store-back-btn" style="margin-top: 20px; padding: 0.8rem 3rem; background: rgba(255,255,255,0.1); border: 2px solid white; color: white; cursor: pointer; border-radius: 25px; font-weight: bold;">BACK</button>
            </div>
        `;
        this.storeView.querySelector('#store-back-btn').addEventListener('click', () => this.showView('menu'));
        this.attachFeedback(this.storeView.querySelector('#store-back-btn'));
        this.attachFeedback(this.storeView.querySelector('#store-tab-decor'));
        this.attachFeedback(this.storeView.querySelector('#store-tab-habitat'));
        
        this.storeTab = 'decor';
        const decorTab = this.storeView.querySelector('#store-tab-decor');
        const habitatTab = this.storeView.querySelector('#store-tab-habitat');

        decorTab.onclick = () => {
            this.storeTab = 'decor';
            decorTab.style.background = '#00ffaa'; decorTab.style.color = 'black'; decorTab.style.borderColor = '#00ffaa';
            habitatTab.style.background = 'rgba(255,255,255,0.1)'; habitatTab.style.color = 'white'; habitatTab.style.borderColor = 'white';
            window.dispatchEvent(new CustomEvent('render-store'));
        };

        habitatTab.onclick = () => {
            this.storeTab = 'habitat';
            habitatTab.style.background = '#00ffaa'; habitatTab.style.color = 'black'; habitatTab.style.borderColor = '#00ffaa';
            decorTab.style.background = 'rgba(255,255,255,0.1)'; decorTab.style.color = 'white'; decorTab.style.borderColor = 'white';
            window.dispatchEvent(new CustomEvent('render-store'));
        };

        // Leaderboard View
        this.leaderboardView = this.createView('leaderboard');
        this.leaderboardFilter = 'global'; // 'global' or 'friends'

        this.leaderboardView.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; padding: 40px 20px; position: relative;">
                <!-- Red Close button in top-right -->
                <button class="interactive-btn close-x-btn" data-close-target="menu" style="position: absolute; top: 15px; right: 15px; width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #ff4444, #cc0000); border: 2px solid white; color: white; font-weight: bold; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 10px rgba(255,0,0,0.4), 0 0 5px rgba(255,255,255,0.5); z-index: 10001;">✕</button>

                <h2 style="font-size: 2.5rem; margin-bottom: 0.5rem; text-shadow: 0 0 15px gold; color: white;">LEADERS</h2>
                
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <button id="leaderboard-refresh-btn" style="padding: 6px 15px; background: rgba(0, 255, 255, 0.1); border: 1.5px solid #00ffff; color: #00ffff; border-radius: 15px; font-size: 0.75rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                        <span>🔄</span> REFRESH
                    </button>
                </div>

                <!-- Tabs for Rankings -->
                <div style="display: flex; gap: 8px; margin-bottom: 10px; width: 100%; max-width: 450px;">
                    <button id="tab-stars" style="flex: 1; padding: 8px 5px; border-radius: 20px; border: 2px solid #ffd700; background: #ffd700; color: black; font-weight: bold; cursor: pointer; font-size: 0.7rem;">STARS</button>
                    <button id="tab-missions" style="flex: 1; padding: 8px 5px; border-radius: 20px; border: 2px solid white; background: rgba(255,255,255,0.1); color: white; font-weight: bold; cursor: pointer; font-size: 0.7rem;">MISSIONS</button>
                    <button id="tab-abyss" style="flex: 1; padding: 8px 5px; border-radius: 20px; border: 2px solid white; background: rgba(255,255,255,0.1); color: white; font-weight: bold; cursor: pointer; font-size: 0.7rem;">ABYSS</button>
                    <button id="tab-pending" style="flex: 1; padding: 8px 5px; border-radius: 20px; border: 2px solid white; background: rgba(255,255,255,0.1); color: white; font-weight: bold; cursor: pointer; font-size: 0.7rem; position: relative;">
                        PENDING
                        <span id="pending-count-badge" style="display: none; position: absolute; top: -5px; right: -5px; background: #ff4444; color: white; font-size: 0.6rem; padding: 2px 6px; border-radius: 10px; border: 1px solid white;">0</span>
                    </button>
                    <button id="tab-personal" style="flex: 1; padding: 8px 5px; border-radius: 20px; border: 2px solid white; background: rgba(255,255,255,0.1); color: white; font-weight: bold; cursor: pointer; font-size: 0.7rem;">RECORDS</button>
                </div>

                <!-- Global / Friends Filter -->
                <div id="leaderboard-filter-container" style="display: flex; gap: 10px; margin-bottom: 10px; background: rgba(0,0,0,0.3); padding: 5px; border-radius: 25px; border: 1px solid rgba(255,255,255,0.1);">
                    <button id="filter-global" style="padding: 5px 20px; border-radius: 20px; border: none; background: #00ffff; color: #001432; font-weight: bold; cursor: pointer; font-size: 0.8rem; transition: all 0.2s;">GLOBAL</button>
                    <button id="filter-friends" style="padding: 5px 20px; border-radius: 20px; border: none; background: transparent; color: white; font-weight: bold; cursor: pointer; font-size: 0.8rem; transition: all 0.2s;">FRIENDS</button>
                </div>

                <!-- Search Bar (New) -->
                <div style="width: 100%; max-width: 450px; margin-bottom: 15px; position: relative;">
                    <input id="leaderboard-search-input" type="text" placeholder="Find Diver by name..." style="
                        width: 100%; padding: 12px 45px 12px 20px; border-radius: 25px; border: 1px solid rgba(255,255,255,0.2);
                        background: rgba(255,255,255,0.15); color: white; outline: none; font-family: inherit;
                        backdrop-filter: blur(5px); font-size: 0.9rem;
                    ">
                    <span style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); font-size: 1.2rem; pointer-events: none; opacity: 0.7;">🔍</span>
                </div>

                <div id="leaderboard-list" style="width: 100%; max-width: 450px; flex: 1; overflow-y: auto; background: rgba(0, 40, 100, 0.3); border-radius: 30px; border: 1px solid rgba(255,255,255,0.1); padding: 15px; display: flex; flex-direction: column; gap: 10px;">
                    <div style="text-align: center; padding: 40px; color: #add8e6; font-style: italic;">Loading legends...</div>
                </div>

                <div id="player-profile-section" style="width: 100%; max-width: 450px; margin-top: 20px; padding: 15px; background: rgba(255,215,0,0.1); border-radius: 20px; border: 1px solid #ffd700; display: flex; align-items: center; gap: 15px;">
                    <div style="flex: 1;">
                        <div style="font-size: 0.7rem; color: #ffd700; text-transform: uppercase;">Your Diver Name</div>
                        <input id="player-name-input" type="text" maxlength="15" style="background: none; border: none; border-bottom: 1px solid rgba(255,215,0,0.5); color: white; font-size: 1.2rem; font-weight: bold; width: 100%; outline: none; padding: 5px 0;" value="${dbManager.playerName}">
                    </div>
                    <button id="update-name-btn" style="padding: 8px 15px; background: #ffd700; border: none; color: black; border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">SAVE</button>
                </div>

                <button id="leader-back-btn" style="margin-top: 20px; padding: 0.8rem 3rem; background: rgba(255,255,255,0.1); border: 2px solid white; color: white; cursor: pointer; border-radius: 25px; font-weight: bold;">BACK</button>
            </div>
        `;
        this.leaderboardView.querySelector('#leader-back-btn').addEventListener('click', () => this.showView('menu'));
        this.attachFeedback(this.leaderboardView.querySelector('#leader-back-btn'));
        ['#tab-stars', '#tab-missions', '#tab-abyss', '#tab-pending', '#tab-personal', '#filter-global', '#filter-friends', '#update-name-btn'].forEach(id => {
            this.attachFeedback(this.leaderboardView.querySelector(id));
        });
        
        const starsTabBtn = this.leaderboardView.querySelector('#tab-stars');
        const missionsTabBtn = this.leaderboardView.querySelector('#tab-missions');
        const abyssTabBtn = this.leaderboardView.querySelector('#tab-abyss');
        const pendingTabBtn = this.leaderboardView.querySelector('#tab-pending');
        const personalTabBtn = this.leaderboardView.querySelector('#tab-personal');
        
        const filterGlobalBtn = this.leaderboardView.querySelector('#filter-global');
        const filterFriendsBtn = this.leaderboardView.querySelector('#filter-friends');
        const searchInput = this.leaderboardView.querySelector('#leaderboard-search-input');
        const filterContainer = this.leaderboardView.querySelector('#leaderboard-filter-container');

        this.leaderboardSearchTerm = '';

        searchInput.oninput = (e) => {
            this.leaderboardSearchTerm = e.target.value.toLowerCase().trim();
            if (this.cachedLeaders) {
                this.renderLeaderboard(this.cachedLeaders, this.leaderboardTab === 'stars' ? 'stars' : this.leaderboardTab);
            }
        };

        const updateFilterUI = () => {
            const isGlobal = this.leaderboardFilter === 'global';
            filterGlobalBtn.style.background = isGlobal ? '#00ffff' : 'transparent';
            filterGlobalBtn.style.color = isGlobal ? '#001432' : 'white';
            filterFriendsBtn.style.background = isGlobal ? 'transparent' : '#00ffff';
            filterFriendsBtn.style.color = isGlobal ? 'white' : '#001432';
            
            if (this.cachedLeaders) {
                this.renderLeaderboard(this.cachedLeaders, this.leaderboardTab === 'stars' ? 'stars' : this.leaderboardTab);
            }
        };

        filterGlobalBtn.onclick = () => {
            this.leaderboardFilter = 'global';
            updateFilterUI();
        };

        filterFriendsBtn.onclick = () => {
            this.leaderboardFilter = 'friends';
            updateFilterUI();
        };
        
        const resetTabs = () => {
            [starsTabBtn, missionsTabBtn, abyssTabBtn, pendingTabBtn, personalTabBtn].forEach(btn => {
                btn.style.background = 'rgba(255,255,255,0.1)';
                btn.style.color = 'white';
                btn.style.borderColor = 'white';
            });
            // Hide filter and search when not in standard tabs
            filterContainer.style.display = 'flex';
            searchInput.parentElement.style.display = 'block';
        };

        starsTabBtn.onclick = () => {
            this.leaderboardTab = 'stars';
            resetTabs();
            starsTabBtn.style.background = '#ffd700';
            starsTabBtn.style.color = 'black';
            starsTabBtn.style.borderColor = '#ffd700';
            this.updateLeaderboardSubscription('stars');
        };

        missionsTabBtn.onclick = () => {
            this.leaderboardTab = 'missionsCompleted';
            resetTabs();
            missionsTabBtn.style.background = '#ffd700';
            missionsTabBtn.style.color = 'black';
            missionsTabBtn.style.borderColor = '#ffd700';
            this.updateLeaderboardSubscription('missionsCompleted');
        };

        abyssTabBtn.onclick = () => {
            this.leaderboardTab = 'abyssDepth';
            resetTabs();
            abyssTabBtn.style.background = '#ffd700';
            abyssTabBtn.style.color = 'black';
            abyssTabBtn.style.borderColor = '#ffd700';
            this.updateLeaderboardSubscription('abyssDepth');
        };

        pendingTabBtn.onclick = () => {
            this.leaderboardTab = 'pending';
            resetTabs();
            pendingTabBtn.style.background = '#ffd700';
            pendingTabBtn.style.color = 'black';
            pendingTabBtn.style.borderColor = '#ffd700';
            filterContainer.style.display = 'none';
            searchInput.parentElement.style.display = 'none';
            this.renderPendingRequests();
        };

        personalTabBtn.onclick = () => {
            this.leaderboardTab = 'personal';
            resetTabs();
            personalTabBtn.style.background = '#ffd700';
            personalTabBtn.style.color = 'black';
            personalTabBtn.style.borderColor = '#ffd700';
            filterContainer.style.display = 'none';
            searchInput.parentElement.style.display = 'none';
            
            const saved = localStorage.getItem('aquaMatchSave');
            let stats = {};
            if (saved) {
                try { stats = JSON.parse(saved).levelStats || {}; } catch(e){}
            }
            this.renderPersonalBests(stats);
        };

        const refreshBtn = this.leaderboardView.querySelector('#leaderboard-refresh-btn');
        if (refreshBtn) {
            this.attachFeedback(refreshBtn);
            refreshBtn.onclick = () => {
                this.updateLeaderboardSubscription(this.leaderboardTab === 'stars' ? 'stars' : this.leaderboardTab);
                this.showComboMessage("SYNCING...");
            };
        }

        this.leaderboardTab = 'stars';
        this.leaderboardView.querySelector('#update-name-btn').addEventListener('click', () => {
            const newName = this.leaderboardView.querySelector('#player-name-input').value.trim();
            if (newName) {
                dbManager.setPlayerName(newName);
                this.showComboMessage("PROFILE UPDATED!");
            }
        });

        // Initialize Leaderboard Subscription
        this.updateLeaderboardSubscription('stars');

        // Aquarium View (Encyclopedia)
        this.aquariumView = this.createView('aquarium');
        this.aquariumView.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;">
                <!-- Red Close button in top-right -->
                <button class="interactive-btn close-x-btn" data-close-target="menu" style="position: absolute; top: 15px; right: 15px; width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #ff4444, #cc0000); border: 2px solid white; color: white; font-weight: bold; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 10px rgba(255,0,0,0.4), 0 0 5px rgba(255,255,255,0.5); z-index: 10001;">✕</button>

                <h2 style="margin-bottom: 1.5rem; text-shadow: 0 0 10px #00aaff; color: white;">FISH ENCYCLOPEDIA</h2>
                <div id="fish-list" style="width: 90%; max-width: 450px; display: flex; flex-direction: column; gap: 15px; max-height: 60vh; overflow-y: auto; padding: 10px;"></div>
                <button id="aq-back-btn" style="margin-top: 2rem; padding: 0.8rem 3rem; background: rgba(255,255,255,0.1); border: 2px solid white; color: white; cursor: pointer; border-radius: 25px; font-weight: bold;">BACK</button>
            </div>
        `;
        this.aquariumView.querySelector('#aq-back-btn').addEventListener('click', () => this.showView('menu'));
        
        this.levelsView = this.createView('levels');
        this.levelsView.style.padding = '0';
        this.levelsView.style.background = 'transparent';
        this.levelsView.innerHTML = `
            <!-- Level Map Header -->
            <div id="map-header" style="
                position: absolute; top: 0; left: 0; width: 100%; height: 110px;
                z-index: 500; display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
                pointer-events: none; padding-top: 15px;
                background: linear-gradient(180deg, rgba(0, 30, 80, 0.8) 0%, transparent 100%);
                text-shadow: 0 2px 10px rgba(0,0,0,0.9);
            ">
                <!-- Redundant stars/pearls removed to favor Top HUD -->
                <div id="map-level-counter" style="margin-top: 60px; font-size: 0.95rem; color: #add8e6; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; pointer-events: auto;">
                    Total Levels: <span id="total-levels-count" style="color: white;">500</span> | Current: Level <span id="current-progress-level" style="color: #00ffaa;">1</span>
                </div>
            </div>

            <!-- Milestone Tracker (New) -->
            <div id="milestone-tracker" style="
                position: absolute; top: 120px; left: 15px; width: 140px;
                background: rgba(0, 20, 50, 0.7); backdrop-filter: blur(10px);
                border-radius: 15px; border: 1px solid rgba(0, 255, 255, 0.3);
                padding: 10px; z-index: 500; display: flex; flex-direction: column; gap: 8px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.5); pointer-events: auto;
            ">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="font-size: 0.6rem; color: #add8e6; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Current Depth</div>
                    <div id="tracker-depth-val" style="font-size: 0.7rem; color: #00ffaa; font-weight: bold;">10m</div>
                </div>
                <div id="tracker-biome-name" style="font-size: 0.85rem; color: white; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Sunlit Shallows</div>
                
                <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                    <div id="tracker-biome-progress" style="width: 0%; height: 100%; background: #00ffaa; box-shadow: 0 0 5px #00ffaa; transition: width 0.5s ease-out;"></div>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                    <span id="tracker-level-info" style="font-size: 0.7rem; color: #00ffff; font-weight: bold;">Lvl 1/50</span>
                    <span id="tracker-percent-info" style="font-size: 0.65rem; color: #fff; opacity: 0.8;">0%</span>
                </div>

                <div style="height: 1px; background: rgba(255,255,255,0.1); margin: 4px 0;"></div>

                <div style="font-size: 0.6rem; color: #ffd700; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Next Unlock</div>
                <div id="tracker-next-milestone" style="display: flex; align-items: center; gap: 6px;">
                    <div id="tracker-milestone-icon" style="width: 24px; height: 24px; background: rgba(0,0,0,0.3); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <img src="assets/damselfish-sprite.webp" style="width: 18px; height: auto;">
                    </div>
                    <span id="tracker-milestone-level" style="font-size: 0.75rem; color: white; font-weight: bold;">Lvl 5</span>
                </div>
            </div>

            <div id="map-scroll-container" style="width: 100%; height: 100%; overflow-y: auto; overflow-x: hidden; position: relative; scroll-behavior: smooth;">
                <div id="map-path-container" style="width: 100%; min-height: 115000px; position: relative; padding: 150px 0;">
                    <svg id="map-svg" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1;">
                        <path id="map-path-line" d="" fill="none" stroke="rgba(0, 255, 255, 0.15)" stroke-width="12" stroke-dasharray="20,15" />
                        <path id="map-progress-line" d="" fill="none" stroke="#00ffff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 8px #00ffff) drop-shadow(0 0 15px #00aaff);" />
                    </svg>
                    <div id="level-nodes-container" style="position: relative; z-index: 2; width: 100%; height: 100%;"></div>
                </div>
            </div>

            <!-- Progress Bar Overlay Deleted -->

            <button id="back-btn" class="interactive-btn" style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); padding: 0.8rem 3rem; background: rgba(255,255,255,0.15); border: 2px solid white; color: white; cursor: pointer; border-radius: 25px; font-weight: bold; z-index: 500; backdrop-filter: blur(5px); box-shadow: 0 5px 20px rgba(0,0,0,0.3); transition: transform 0.2s;">BACK</button>
        `;
        this.levelsView.querySelector('#back-btn').addEventListener('click', () => this.showView('menu'));

        // Level Summary Popup (Before Level Start)
        this.levelSummaryView = this.createView('levelSummary');
        this.levelSummaryView.innerHTML = `
            <div id="level-summary-panel" style="
                background: linear-gradient(180deg, #004d4d 0%, #002626 100%);
                padding: 35px; border-radius: 45px; border: 4px solid #00ffff; 
                display: flex; flex-direction: column; align-items: center; 
                box-shadow: 0 15px 60px rgba(0,0,0,0.9);
                width: 85%; max-width: 380px; backdrop-filter: blur(20px);
                animation: modal-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                position: relative;
                pointer-events: auto;
                z-index: 9999;
                opacity: 1 !important;
            ">
                <button id="summary-close" class="interactive-btn close-x-btn" data-close-target="levels" style="position: absolute; right: 15px; top: 15px; width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #ff4444, #cc0000); border: 2px solid white; color: white; font-weight: bold; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 10px rgba(255,0,0,0.4), 0 0 5px rgba(255,255,255,0.5); z-index: 10001;">✕</button>
                
                <h3 style="font-size: 1rem; color: #00ffff; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 5px; font-weight: bold;">LEVEL</h3>
                <h2 id="summary-level-number" style="font-size: 3.5rem; color: #fff; margin-bottom: 15px; text-shadow: 0 0 15px #00ffff;">1</h2>

                <div id="summary-stars" style="display: flex; gap: 10px; margin-bottom: 25px;">
                    <span class="summary-star" style="font-size: 2.5rem; color: rgba(255,255,255,0.15);">★</span>
                    <span class="summary-star" style="font-size: 3.5rem; color: rgba(255,255,255,0.15); margin-top: -10px;">★</span>
                    <span class="summary-star" style="font-size: 2.5rem; color: rgba(255,255,255,0.15);">★</span>
                </div>

                <div style="width: 100%; background: rgba(0, 0, 0, 0.5); border-radius: 25px; padding: 20px; margin-bottom: 30px; border: 2px solid rgba(0,255,255,0.3);">
                    <div style="text-align: center; font-size: 0.8rem; color: #00ffff; text-transform: uppercase; margin-bottom: 15px; letter-spacing: 2px; font-weight: bold;">Mission Objectives</div>
                    <div id="summary-objectives" style="display: flex; justify-content: space-around; align-items: center;">
                        <!-- Objectives injected here -->
                    </div>
                </div>

                <div id="best-score-container" style="margin-bottom: 25px; text-align: center; opacity: 1;">
                    <span style="font-size: 0.7rem; text-transform: uppercase; color: #add8e6; display: block; margin-bottom: 2px; font-weight: bold;">Personal Best</span>
                    <span id="summary-best-score" style="font-size: 1.8rem; font-weight: bold; color: #ffd700; text-shadow: 0 0 10px rgba(255,215,0,0.4);">0</span>
                </div>

                <button id="summary-play-btn" class="interactive-btn" style="
                    width: 100%; padding: 1.2rem; 
                    background: linear-gradient(180deg, #00ffaa, #00cc88); 
                    border: 3px solid white; color: black; font-weight: 900; 
                    cursor: pointer; border-radius: 50px; font-size: 1.8rem; 
                    font-family: inherit; box-shadow: 0 8px 25px rgba(0,255,170,0.6);
                    transition: transform 0.1s;
                ">PLAY</button>
            </div>
        `;
        this.levelSummaryView.querySelector('#summary-close').addEventListener('click', () => this.showView('levels'));
        this.attachFeedback(this.levelSummaryView.querySelector('#summary-play-btn'));
        this.attachFeedback(this.levelSummaryView.querySelector('#summary-close'));
        
        // Game View (HUD container - now redundant but used for state management)
        this.gameView = this.createView('game');
        this.gameView.style.background = 'none';
        this.gameView.innerHTML = ''; // Gameplay HUD is now in persistent top/bottom bars
        
        // Success & Game Over remain as popups
        this.successView = this.createView('success');
        this.successView.innerHTML = `
            <div id="victory-panel" style="
                background: linear-gradient(180deg, rgba(0, 100, 200, 0.9) 0%, rgba(0, 40, 80, 0.95) 100%);
                padding: 30px; border-radius: 40px; border: 4px solid #00ffff; 
                display: flex; flex-direction: column; align-items: center; 
                box-shadow: 0 0 50px rgba(0, 255, 255, 0.3), inset 0 0 20px rgba(255,255,255,0.2);
                width: 85%; max-width: 400px; backdrop-filter: blur(15px);
                animation: modal-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                position: relative;
            ">
                <div style="position: absolute; top: -50px; width: 120px; height: 120px; background: url('assets/realistic-crystal-bubble-v2.webp') center/contain no-repeat; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 0 15px #00ffff); opacity: 0.6;">
                     <img src="assets/neongoldfish-sprite.webp" style="width: 80px; height: 80px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
                </div>

                <h2 style="font-size: 2.8rem; margin: 60px 0 10px 0; color: #00ffaa; text-shadow: 0 0 15px rgba(0,255,170,0.6); letter-spacing: 2px;">VICTORY!</h2>
                
                <div id="victory-stars" style="display: flex; gap: 15px; margin-bottom: 20px;">
                    <span class="victory-star" style="font-size: 3.5rem; color: rgba(255,255,255,0.1); text-shadow: none; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); transform: scale(0.5); opacity: 0;">★</span>
                    <span class="victory-star" style="font-size: 4.5rem; color: rgba(255,255,255,0.1); text-shadow: none; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); transform: scale(0.5); opacity: 0; margin-top: -10px;">★</span>
                    <span class="victory-star" style="font-size: 3.5rem; color: rgba(255,255,255,0.1); text-shadow: none; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); transform: scale(0.5); opacity: 0;">★</span>
                </div>

                <div id="victory-discoveries-container"></div>

                <div style="width: 100%; background: rgba(255,255,255,0.05); border-radius: 20px; padding: 20px; margin-bottom: 25px; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 1.1rem; color: #add8e6;">
                        <span>Level Score</span>
                        <span id="base-score-val" style="font-weight: bold; color: white;">0</span>
                    </div>
                    <div id="bonus-moves-row" style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 1.1rem; color: #ffd700; opacity: 0; transition: opacity 0.5s;">
                        <span>Moves Bonus (<span id="bonus-moves-count">0</span>)</span>
                        <span id="bonus-score-val" style="font-weight: bold;">+0</span>
                    </div>
                    <div id="max-combo-row" style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 1.1rem; color: #00ffaa; opacity: 0; transition: opacity 0.5s;">
                        <span>Best Combo</span>
                        <span id="max-combo-val" style="font-weight: bold;">x0</span>
                    </div>
                    <div style="height: 2px; background: rgba(255,255,255,0.1); margin: 10px 0;"></div>
                    <div style="display: flex; justify-content: space-between; font-size: 1.6rem; font-weight: bold; position: relative;">
                        <span>TOTAL</span>
                        <div style="text-align: right;">
                            <span id="total-score-val" style="color: #00ffaa; text-shadow: 0 0 10px rgba(0,255,170,0.4);">0</span>
                            <div id="new-high-score-badge" style="display: none; font-size: 0.7rem; color: #ffd700; text-transform: uppercase; letter-spacing: 1px; animation: modal-pop 0.3s forwards;">New High Score!</div>
                        </div>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
                    <div style="display: flex; gap: 15px; width: 100%;">
                        <button id="victory-levels-btn" style="flex: 1; padding: 1rem; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3); color: white; cursor: pointer; border-radius: 50px; font-weight: bold; font-family: inherit; transition: background 0.2s;">MAP</button>
                        <button id="victory-next-btn" style="flex: 2; padding: 1rem; background: linear-gradient(180deg, #00ffaa, #00cc88); border: 2px solid white; color: black; font-weight: bold; cursor: pointer; border-radius: 50px; font-size: 1.3rem; font-family: inherit; box-shadow: 0 5px 15px rgba(0,255,170,0.3); transform: scale(1); transition: transform 0.2s;">NEXT LEVEL</button>
                    </div>
                    <button id="victory-share-btn" class="interactive-btn" style="width: 100%; padding: 1rem; background: rgba(255, 215, 0, 0.2); border: 2px solid #ffd700; color: #ffd700; font-weight: bold; cursor: pointer; border-radius: 50px; font-size: 1.1rem; box-shadow: 0 4px 15px rgba(0,0,0,0.3); transform: scale(0); transition: transform 0.3s;">SHARE ACHIEVEMENT</button>
                </div>
            </div>
        `;

        this.gameOverView = this.createView('gameOver');
        this.gameOverView.innerHTML = `
            <div style="background: linear-gradient(180deg, #3a0007 0%, #1a0003 100%); padding: 35px; border-radius: 40px; border: 4px solid #ff4444; display: flex; flex-direction: column; align-items: center; box-shadow: 0 0 50px rgba(255,0,0,0.5), inset 0 0 20px rgba(255,0,0,0.2); width: 85%; max-width: 400px; backdrop-filter: blur(15px); animation: modal-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-sizing: border-box; pointer-events: auto;">
                <div style="width: 90px; height: 90px; background: rgba(255,255,255,0.05); border-radius: 50%; border: 2px solid #ff4444; display: flex; align-items: center; justify-content: center; margin-bottom: 15px; box-shadow: 0 0 20px rgba(255, 68, 68, 0.3);">
                    <span style="font-size: 3rem; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.5));">💀</span>
                </div>
                
                <h2 style="font-size: 2.2rem; margin: 0 0 10px 0; color: #ff4444; text-shadow: 0 0 15px rgba(255,68,68,0.6); letter-spacing: 2px; font-weight: 900; text-align: center;">OUT OF MOVES</h2>
                
                <div style="width: 100%; background: rgba(255,255,255,0.05); border-radius: 20px; padding: 15px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.1); text-align: center; box-sizing: border-box;">
                    <div style="font-size: 0.8rem; color: #add8e6; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; font-weight: bold;">Consolation Prize</div>
                    <div style="font-size: 1.6rem; color: #ffd700; font-weight: 900; text-shadow: 0 0 8px rgba(255,215,0,0.4); display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <span>⚪</span> <span id="game-over-reward-amount">15</span> <span style="font-size: 1rem; color: #fff;">Pearls</span>
                    </div>
                </div>

                <button id="double-coins-btn" class="interactive-btn" style="
                    width: 100%; padding: 1.1rem; 
                    background: linear-gradient(180deg, #ffd700, #ffaa00); 
                    border: 3px solid white; color: black; font-weight: 900; 
                    cursor: pointer; border-radius: 50px; font-size: 1.2rem; 
                    font-family: inherit; box-shadow: 0 6px 20px rgba(255,215,0,0.5);
                    display: flex; align-items: center; justify-content: center; gap: 10px;
                    margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1.5px;
                    transition: transform 0.1s;
                    animation: btn-glow 1.5s infinite alternate;
                ">
                    <span>🎥</span> DOUBLE COINS (+15 ⚪)
                </button>

                <div style="display: flex; gap: 15px; width: 100%;">
                    <button id="go-levels-btn" class="interactive-btn" style="flex: 1; padding: 1rem; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3); color: white; cursor: pointer; border-radius: 50px; font-weight: bold; font-family: inherit; transition: background 0.2s;">MAP</button>
                    <button id="retry-btn" class="interactive-btn" style="flex: 2; padding: 1rem; background: linear-gradient(180deg, #ff6b6b, #cc0000); border: 2px solid white; color: white; font-weight: bold; cursor: pointer; border-radius: 50px; font-size: 1.3rem; font-family: inherit; box-shadow: 0 5px 15px rgba(255,107,107,0.3); transition: transform 0.1s;">RETRY</button>
                </div>
            </div>
        `;

        // Event Listeners for Popups
        this.gameOverView.querySelector('#retry-btn').addEventListener('click', () => {
             window.dispatchEvent(new CustomEvent('retry-level'));
             this.showView('game');
        });
        this.gameOverView.querySelector('#go-levels-btn').addEventListener('click', () => this.showView('levels'));
        
        this.gameOverView.querySelector('#double-coins-btn').addEventListener('click', () => {
             window.dispatchEvent(new CustomEvent('request-double-coins-ad'));
        });

        this.successView.querySelector('#victory-next-btn').addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('next-level'));
            this.showView('game');
        });
        this.successView.querySelector('#victory-levels-btn').addEventListener('click', () => this.showView('levels'));
        this.successView.querySelector('#victory-share-btn').addEventListener('click', () => {
            const score = document.getElementById('total-score-val').innerText;
            const level = document.getElementById('level-indicator').innerText;
            this.simulateShare(`I just cleared Level ${level} with ${score} points in Aqua Match! 🌊🐠 The reefs are looking beautiful. Can you dive deeper? #AquaMatch #NexApp`);
        });
        
        // Missions View
        this.missionsView = this.createView('missions');
        this.missionsView.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; padding: 40px 20px; background: radial-gradient(circle at center, rgba(0, 60, 120, 0.95) 0%, rgba(0, 20, 40, 0.98) 100%); backdrop-filter: blur(20px); position: relative;">
                <!-- Red Close button in top-right -->
                <button class="interactive-btn close-x-btn" data-close-target="menu" style="position: absolute; top: 15px; right: 15px; width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #ff4444, #cc0000); border: 2px solid white; color: white; font-weight: bold; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 10px rgba(255,0,0,0.4), 0 0 5px rgba(255,255,255,0.5); z-index: 10001;">✕</button>

                <div style="position: relative; margin-bottom: 30px; text-align: center;">
                    <h2 style="font-size: 2.8rem; margin: 0; text-shadow: 0 0 20px #00ffff, 0 0 10px white; color: white; letter-spacing: 2px;">DAILY MISSIONS</h2>
                    <div style="width: 100%; height: 3px; background: linear-gradient(90deg, transparent, #00ffff, transparent); margin-top: 5px;"></div>
                </div>
                
                <div id="missions-list" style="width: 100%; max-width: 450px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; padding: 10px; scrollbar-width: none;">
                    <!-- Missions will be injected here -->
                </div>

                <div style="margin-top: 20px; width: 100%; max-width: 450px; display: flex; justify-content: center; gap: 15px;">
                    <button id="missions-back-btn" class="interactive-btn" style="flex: 1; padding: 1rem; background: rgba(255,255,255,0.1); border: 2px solid white; color: white; cursor: pointer; border-radius: 50px; font-weight: bold; font-size: 1.1rem; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">BACK</button>
                    <button id="missions-leader-btn" class="interactive-btn" style="flex: 1; padding: 1rem; background: rgba(255, 215, 0, 0.1); border: 2px solid #ffd700; color: #ffd700; cursor: pointer; border-radius: 50px; font-weight: bold; font-size: 1.1rem; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">RANKINGS</button>
                </div>
            </div>
        `;
        this.missionsView.querySelector('#missions-back-btn').addEventListener('click', () => this.showView('menu'));
        this.attachFeedback(this.missionsView.querySelector('#missions-back-btn'));
        this.attachFeedback(this.missionsView.querySelector('#missions-leader-btn'));
        this.missionsView.querySelector('#missions-leader-btn').addEventListener('click', () => {
            this.showView('leaderboard');
            // Auto-switch to missions tab
            const missionsTabBtn = this.leaderboardView.querySelector('#tab-missions');
            if (missionsTabBtn) missionsTabBtn.click();
        });

        // Pearl Bank View
        this.pearlBankView = this.createView('pearlBank');
        this.pearlBankView.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; padding: 40px 20px; background: rgba(0, 20, 50, 0.85); backdrop-filter: blur(15px); position: relative;">
                <!-- Red Close button in top-right -->
                <button class="interactive-btn close-x-btn" data-close-target="prev" style="position: absolute; top: 15px; right: 15px; width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #ff4444, #cc0000); border: 2px solid white; color: white; font-weight: bold; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 10px rgba(255,0,0,0.4), 0 0 5px rgba(255,255,255,0.5); z-index: 10001;">✕</button>

                <h2 style="font-size: 2.5rem; margin-bottom: 0.5rem; text-shadow: 0 0 15px #00ffff; color: white;">PEARL BANK</h2>
                <p style="color: #add8e6; font-size: 0.9rem; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 2px;">Secure In-App Purchases</p>
                
                <div id="pearl-packs-list" style="width: 100%; max-width: 500px; flex: 1; overflow-y: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; padding: 10px;">
                    <!-- Packs will be injected here -->
                </div>

                <button id="bank-back-btn" style="margin-top: 20px; padding: 0.8rem 3rem; background: rgba(255,255,255,0.1); border: 2px solid white; color: white; cursor: pointer; border-radius: 25px; font-weight: bold;">BACK</button>
            </div>
        `;
        this.pearlBankView.querySelector('#bank-back-btn').addEventListener('click', () => {
            const prev = this.prevView || 'menu';
            this.showView(prev);
        });

        this.topBar.querySelector('#pearl-hud').addEventListener('click', () => {
            this.showBoosterShop();
        });

        window.addEventListener('show-combo-message', (e) => {
            this.showComboMessage(e.detail);
        });

        // Map Pearl Icon Listener
        const mapPearlBtn = this.levelsView.querySelector('#map-pearl-btn');
        if (mapPearlBtn) {
            mapPearlBtn.addEventListener('click', () => {
                this.showBoosterShop();
            });
        }
    }
    
    showBoosterShop() {
        this.modalOverlay.style.display = 'flex';
        this.modalOverlay.style.pointerEvents = 'auto'; // Re-enable interaction
        this.modalOverlay.style.zIndex = '200000'; // Highest priority
        
        const currentPearls = parseInt(document.getElementById('hud-pearl-count')?.innerText || '0');
        const isInGame = this.currentView === 'game';

        this.modalOverlay.innerHTML = `
            <div id="booster-shop-modal" style="
                background: linear-gradient(180deg, rgba(0, 50, 150, 0.9) 0%, rgba(0, 120, 180, 0.95) 100%);
                padding: 30px; border-radius: 40px; border: 4px solid #00ffff; 
                display: flex; flex-direction: column; align-items: center; 
                box-shadow: 0 0 50px rgba(0, 255, 255, 0.3), inset 0 0 20px rgba(255,255,255,0.2);
                width: 90%; max-width: 420px; backdrop-filter: blur(15px);
                animation: modal-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                text-align: center;
                position: relative;
            ">
                <div style="position: absolute; top: -35px; background: #ffd700; color: #000; padding: 8px 30px; border-radius: 25px; font-weight: bold; font-size: 1.4rem; box-shadow: 0 5px 20px rgba(0,0,0,0.4); border: 3px solid white; letter-spacing: 1px;">
                    ${isInGame ? 'INSTANT BOOSTERS' : 'BOOSTER SHOP'}
                </div>
                <button id="shop-close-x" style="position: absolute; right: 20px; top: 15px; background: none; border: none; color: white; font-size: 1.8rem; cursor: pointer; opacity: 0.8; transition: opacity 0.2s;">✕</button>
                
                <div style="margin: 30px 0 25px 0; color: #00ffff; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 3px; font-weight: bold; text-shadow: 0 0 10px rgba(0,255,255,0.5);">
                    ${isInGame ? 'Tactical Edge' : 'Booster Inventory'}
                </div>
                
                <div id="booster-items-container" style="display: flex; flex-direction: column; gap: 15px; width: 100%; max-height: 450px; overflow-y: auto; padding-right: 5px;">
                    <!-- SONAR PULSE (NEW) -->
                    <div class="shop-item interactive-btn" data-id="sonar_pulse" data-price="${isInGame ? 25 : 600}" style="display: flex; align-items: center; gap: 15px; background: rgba(0,255,255,0.1); padding: 15px; border-radius: 25px; border: 2px solid rgba(0,255,255,0.5); cursor: pointer; transition: all 0.2s;">
                        <div style="font-size: 2.2rem; width: 45px; text-align: center; filter: drop-shadow(0 0 10px #00ffff);">🔊</div>
                        <div style="flex: 1; text-align: left;">
                            <div style="font-weight: bold; color: white; font-size: 1.1rem;">Sonar Pulse</div>
                            <div style="font-size: 0.75rem; color: #add8e6;">Clear all board obstacles</div>
                        </div>
                        <div style="background: #ffd700; color: black; padding: 6px 15px; border-radius: 18px; font-weight: bold; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
                            <span>⚪</span> ${isInGame ? 25 : 600}
                        </div>
                    </div>

                    <!-- Hammer -->
                    <div class="shop-item interactive-btn" data-id="hammer" data-price="${isInGame ? 10 : 100}" style="display: flex; align-items: center; gap: 15px; background: rgba(255,255,255,0.1); padding: 15px; border-radius: 25px; border: 2px solid rgba(0,255,255,0.3); cursor: pointer; transition: all 0.2s;">
                        <img src="assets/pearl-powerup-sprite-webp.webp" style="width: 45px; height: 45px; filter: hue-rotate(90deg) drop-shadow(0 0 10px cyan);">
                        <div style="flex: 1; text-align: left;">
                            <div style="font-weight: bold; color: white; font-size: 1.1rem;">Hammer</div>
                            <div style="font-size: 0.75rem; color: #add8e6;">Clear one single bubble</div>
                        </div>
                        <div style="background: #ffd700; color: black; padding: 6px 15px; border-radius: 18px; font-weight: bold; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
                            <span>⚪</span> ${isInGame ? 10 : 100}
                        </div>
                    </div>

                    ${isInGame ? `
                    <!-- Extra Moves -->
                    <div class="shop-item interactive-btn" data-id="extra-moves" data-price="25" style="display: flex; align-items: center; gap: 15px; background: rgba(255,255,255,0.1); padding: 15px; border-radius: 25px; border: 2px solid rgba(0,255,255,0.3); cursor: pointer; transition: all 0.2s;">
                        <div style="font-size: 2.2rem; width: 45px; text-align: center; filter: drop-shadow(0 0 10px #00ffaa);">➕</div>
                        <div style="flex: 1; text-align: left;">
                            <div style="font-weight: bold; color: white; font-size: 1.1rem;">Extra Moves</div>
                            <div style="font-size: 0.75rem; color: #add8e6;">Get +5 moves immediately</div>
                        </div>
                        <div style="background: #ffd700; color: black; padding: 6px 15px; border-radius: 18px; font-weight: bold; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
                            <span>⚪</span> 25
                        </div>
                    </div>

                    <!-- HAZARD DEFLECTOR (NEW) -->
                    <div class="shop-item interactive-btn" data-id="hazard_deflector" data-price="35" style="display: flex; align-items: center; gap: 15px; background: rgba(255,255,255,0.1); padding: 15px; border-radius: 25px; border: 2px solid rgba(0,255,255,0.3); cursor: pointer; transition: all 0.2s;">
                        <div style="font-size: 2.2rem; width: 45px; text-align: center; filter: drop-shadow(0 0 10px #ffaa00);">🛡️</div>
                        <div style="flex: 1; text-align: left;">
                            <div style="font-weight: bold; color: white; font-size: 1.1rem;">Deflector</div>
                            <div style="font-size: 0.75rem; color: #add8e6;">Block next 3 hazards</div>
                        </div>
                        <div style="background: #ffd700; color: black; padding: 6px 15px; border-radius: 18px; font-weight: bold; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
                            <span>⚪</span> 35
                        </div>
                    </div>

                    <!-- Fish Swap -->
                    <div class="shop-item interactive-btn" data-id="fish-swap" data-price="15" style="display: flex; align-items: center; gap: 15px; background: rgba(255,255,255,0.1); padding: 15px; border-radius: 25px; border: 2px solid rgba(0,255,255,0.3); cursor: pointer; transition: all 0.2s;">
                        <div style="font-size: 2.2rem; width: 45px; text-align: center; filter: drop-shadow(0 0 10px #00ffff);">🔄</div>
                        <div style="flex: 1; text-align: left;">
                            <div style="font-weight: bold; color: white; font-size: 1.1rem;">Free Swap</div>
                            <div style="font-size: 0.75rem; color: #add8e6;">Swap any two fish!</div>
                        </div>
                        <div style="background: #ffd700; color: black; padding: 6px 15px; border-radius: 18px; font-weight: bold; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
                            <span>⚪</span> 15
                        </div>
                    </div>

                    <!-- Clear Row -->
                    <div class="shop-item interactive-btn" data-id="clear-row" data-price="20" style="display: flex; align-items: center; gap: 15px; background: rgba(255,255,255,0.1); padding: 15px; border-radius: 25px; border: 2px solid rgba(0,255,255,0.3); cursor: pointer; transition: all 0.2s;">
                        <div style="font-size: 2.2rem; width: 45px; text-align: center; filter: drop-shadow(0 0 10px #ff4400);">🚀</div>
                        <div style="flex: 1; text-align: left;">
                            <div style="font-weight: bold; color: white; font-size: 1.1rem;">Clear Row</div>
                            <div style="font-size: 0.75rem; color: #add8e6;">Instant rocket across row</div>
                        </div>
                        <div style="background: #ffd700; color: black; padding: 6px 15px; border-radius: 18px; font-weight: bold; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
                            <span>⚪</span> 20
                        </div>
                    </div>

                    <!-- Clear Column -->
                    <div class="shop-item interactive-btn" data-id="clear-column" data-price="20" style="display: flex; align-items: center; gap: 15px; background: rgba(255,255,255,0.1); padding: 15px; border-radius: 25px; border: 2px solid rgba(0,255,255,0.3); cursor: pointer; transition: all 0.2s;">
                        <div style="font-size: 2.2rem; width: 45px; text-align: center; filter: drop-shadow(0 0 10px #00ffaa); transform: rotate(90deg);">🚀</div>
                        <div style="flex: 1; text-align: left;">
                            <div style="font-weight: bold; color: white; font-size: 1.1rem;">Clear Column</div>
                            <div style="font-size: 0.75rem; color: #add8e6;">Instant rocket down column</div>
                        </div>
                        <div style="background: #ffd700; color: black; padding: 6px 15px; border-radius: 18px; font-weight: bold; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
                            <span>⚪</span> 20
                        </div>
                    </div>
                    ` : `
                    <!-- Color Bomb -->
                    <div class="shop-item interactive-btn" data-id="colorBomb" data-price="250" style="display: flex; align-items: center; gap: 15px; background: rgba(255,255,255,0.1); padding: 15px; border-radius: 25px; border: 2px solid rgba(0,255,255,0.3); cursor: pointer; transition: all 0.2s;">
                        <img src="assets/rainbow-fish-sprite.webp" style="width: 45px; height: 45px; filter: drop-shadow(0 0 10px magenta);">
                        <div style="flex: 1; text-align: left;">
                            <div style="font-weight: bold; color: white; font-size: 1.1rem;">Color Bomb</div>
                            <div style="font-size: 0.75rem; color: #add8e6;">Clear all of one color</div>
                        </div>
                        <div style="background: #ffd700; color: black; padding: 6px 15px; border-radius: 18px; font-weight: bold; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
                            <span>⚪</span> 250
                        </div>
                    </div>

                    <!-- Shuffle -->
                    <div class="shop-item interactive-btn" data-id="shuffle" data-price="150" style="display: flex; align-items: center; gap: 15px; background: rgba(255,255,255,0.1); padding: 15px; border-radius: 25px; border: 2px solid rgba(0,255,255,0.3); cursor: pointer; transition: all 0.2s;">
                        <div style="font-size: 2.2rem; width: 45px; text-align: center; filter: drop-shadow(0 0 10px #00ffff);">🔀</div>
                        <div style="flex: 1; text-align: left;">
                            <div style="font-weight: bold; color: white; font-size: 1.1rem;">Shuffle</div>
                            <div style="font-size: 0.75rem; color: #add8e6;">Mix up the entire board</div>
                        </div>
                        <div style="background: #ffd700; color: black; padding: 6px 15px; border-radius: 18px; font-weight: bold; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
                            <span>⚪</span> 150
                        </div>
                    </div>
                    `}
                </div>

                <div style="margin-top: 25px; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 20px; width: 100%; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; flex-direction: column; align-items: flex-start;">
                        <span style="font-size: 0.75rem; color: #add8e6; text-transform: uppercase;">Your Balance</span>
                        <span id="shop-modal-pearl-count" style="font-size: 1.4rem; font-weight: bold; color: #00ffff; display: flex; align-items: center; gap: 8px;">⚪ ${currentPearls}</span>
                    </div>
                    <button id="shop-claim-daily" style="background: linear-gradient(135deg, #00ffaa, #0088ff); border: none; color: white; padding: 10px 20px; border-radius: 15px; font-weight: bold; cursor: pointer; font-size: 0.85rem; box-shadow: 0 4px 10px rgba(0,255,170,0.3);">DAILY GIFT</button>
                </div>

                <!-- Free Pearls Ad Button -->
                <div style="margin-top: 15px; width: 100%;">
                    <button id="shop-free-pearls-btn" class="interactive-btn" style="
                        width: 100%; padding: 12px; border-radius: 20px; border: 2px solid #00ffaa; 
                        background: rgba(0, 255, 170, 0.1); color: #00ffaa; font-weight: bold; 
                        cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;
                        transition: all 0.2s;
                    ">
                        <span>📺</span> FREE PEARLS (AD) <span style="background: #00ffaa; color: #001432; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem;">+25</span>
                    </button>
                </div>

                <button id="shop-close-btn" class="interactive-btn" style="margin-top: 20px; width: 100%; padding: 1.2rem; background: rgba(255,255,255,0.1); border: 2px solid white; color: white; font-weight: bold; cursor: pointer; border-radius: 50px; font-size: 1.2rem; text-transform: uppercase; transition: background 0.2s;">Maybe Later</button>
            </div>
        `;

        const close = () => {
            this.modalOverlay.style.display = 'none';
            this.modalOverlay.style.pointerEvents = 'none';
        };
        this.modalOverlay.querySelector('#shop-close-x').onclick = close;
        this.modalOverlay.querySelector('#shop-close-btn').onclick = close;
        
        this.modalOverlay.querySelector('#shop-claim-daily').onclick = () => {
            close();
            this.showDailyGiftModal();
        };

        this.modalOverlay.querySelector('#shop-free-pearls-btn').onclick = () => {
            this.showFreePearlsAdSimulation();
        };

        this.modalOverlay.querySelectorAll('.shop-item').forEach(item => {
            item.onclick = () => {
                const id = item.dataset.id;
                const price = parseInt(item.dataset.price);
                const currentBalance = parseInt(document.getElementById('hud-pearl-count')?.innerText || '0');
                
                if (currentBalance >= price) {
                    if (isInGame) {
                        window.dispatchEvent(new CustomEvent('purchase-instant-booster', { 
                            detail: { type: id, price: price } 
                        }));
                    } else {
                        window.dispatchEvent(new CustomEvent('buy-booster', { 
                            detail: { id: id, price: price, amount: 1, name: id } 
                        }));
                    }
                    close(); // Close after successful purchase
                } else {
                    this.showNotEnoughPearlsPopup();
                }
            };
        });
    }

    showNotEnoughPearlsPopup() {
        const originalContent = this.modalOverlay.innerHTML;
        const shopModal = this.modalOverlay.querySelector('#booster-shop-modal');
        
        const popup = document.createElement('div');
        popup.id = 'not-enough-pearls-popup';
        popup.style.cssText = `
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85); border-radius: 40px; z-index: 100;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            padding: 30px; animation: modal-pop 0.3s ease-out;
        `;
        
        popup.innerHTML = `
            <div style="font-size: 4rem; margin-bottom: 10px;">⚪💨</div>
            <h2 style="color: white; margin-bottom: 15px;">Not enough pearls!</h2>
            <p style="color: #add8e6; margin-bottom: 25px; font-size: 1.1rem;">Watch a short video to get <span style="color: #00ffaa;">+25 Pearls</span> for free?</p>
            
            <div style="display: flex; flex-direction: column; gap: 15px; width: 100%;">
                <button id="insufficient-watch-ad" style="width: 100%; padding: 1.2rem; background: linear-gradient(135deg, #00ffaa, #0088ff); border: none; color: white; font-weight: bold; cursor: pointer; border-radius: 50px; font-size: 1.2rem; box-shadow: 0 8px 20px rgba(0,255,170,0.3);">WATCH VIDEO</button>
                <button id="insufficient-back" style="width: 100%; padding: 1rem; background: rgba(255,255,255,0.1); border: 2px solid white; color: white; font-weight: bold; cursor: pointer; border-radius: 50px;">BACK TO SHOP</button>
            </div>
        `;
        
        shopModal.appendChild(popup);
        
        popup.querySelector('#insufficient-back').onclick = () => popup.remove();
        popup.querySelector('#insufficient-watch-ad').onclick = () => {
            popup.remove();
            this.showFreePearlsAdSimulation();
        };
    }

    showFreePearlsAdSimulation() {
        const shopModal = this.modalOverlay.querySelector('#booster-shop-modal');
        const oldContent = shopModal.innerHTML;
        
        // Mute music during ad
        if (window.gameAudioManager) window.gameAudioManager.muteMusic();

        shopModal.innerHTML = `
            <div style="padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 400px;">
                <h2 style="font-size: 1.5rem; color: #00ffaa; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 2px;">SPONSORED VIDEO</h2>
                <p style="color: #add8e6; margin-bottom: 25px; font-size: 0.9rem;">Earning <span style="color: #00ffaa;">+25 Pearls</span>...</p>
                
                <div style="width: 100%; height: 200px; background: rgba(0,0,0,0.6); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin-bottom: 25px; border: 3px solid rgba(0,255,170,0.3); position: relative; overflow: hidden;">
                    <!-- Simple animated "video" -->
                    <div style="position: absolute; width: 100%; height: 100%; background: linear-gradient(45deg, #001432, #003264);"></div>
                    <img src="assets/neongoldfish-sprite.webp" style="width: 100px; height: 100px; animation: player-swim 2s infinite; z-index: 1;">
                    <div style="position: absolute; top: 10px; right: 15px; background: rgba(0,0,0,0.5); padding: 5px 12px; border-radius: 10px; font-size: 0.7rem; color: white; z-index: 2;">AD</div>
                </div>

                <div style="width: 100%; height: 12px; background: rgba(255,255,255,0.1); border-radius: 6px; overflow: hidden; margin-bottom: 15px; border: 1px solid rgba(255,255,255,0.1);">
                    <div id="free-pearl-ad-progress" style="width: 0%; height: 100%; background: linear-gradient(90deg, #00ffaa, #0088ff); transition: width 0.1s linear;"></div>
                </div>
                <p style="font-size: 1rem; color: white; font-weight: bold;">Reward in <span id="free-pearl-ad-timer" style="color: #00ffaa;">5</span>s</p>
            </div>
        `;

        const progressEl = shopModal.querySelector('#free-pearl-ad-progress');
        const timerEl = shopModal.querySelector('#free-pearl-ad-timer');
        let timeLeft = 5;
        const totalTime = 5;
        
        const interval = setInterval(() => {
            timeLeft -= 0.1;
            if (timeLeft <= 0) {
                clearInterval(interval);
                window.dispatchEvent(new CustomEvent('ad-reward-claimed', { detail: { type: 'pearls', count: 25 } }));
                this.modalOverlay.style.display = 'none';
                this.modalOverlay.style.pointerEvents = 'none';
            } else {
                if (timerEl) timerEl.innerText = Math.ceil(timeLeft);
                if (progressEl) progressEl.style.width = `${((totalTime - timeLeft) / totalTime) * 100}%`;
            }
        }, 100);
    }

    createView(id) {
        const view = document.createElement('div');
        view.id = `view-${id}`;
        view.style.cssText = `
            position: absolute; width: 100%; height: 100%;
            display: none; flex-direction: column; align-items: center; justify-content: center;
            background: transparent;
            pointer-events: none;
            overflow: hidden;
            z-index: 1000;
        `;
        
        this.root.appendChild(view);
        return view;
    }

    playLevelCompleteAnimation() {
        const fishObj = document.getElementById('top-mini-objective');
        if (!fishObj) return;

        // Clear any previous animation class
        fishObj.classList.remove('fish-complete-anim');
        // Force reflow
        void fishObj.offsetWidth;
        // Add completion animation
        fishObj.classList.add('fish-complete-anim');

        // Add extra sparkles for celebration
        for (let i = 0; i < 12; i++) {
            setTimeout(() => {
                const sparkle = document.createElement('div');
                sparkle.style.cssText = `
                    position: absolute;
                    width: 6px; height: 6px;
                    background: white;
                    border-radius: 50%;
                    box-shadow: 0 0 10px #00ffff, 0 0 5px white;
                    pointer-events: none;
                    z-index: 100002;
                    top: ${20 + (Math.random() - 0.5) * 40}px;
                    left: ${Math.random() * 100}%;
                `;
                fishObj.appendChild(sparkle);
                
                sparkle.animate([
                    { transform: 'translate(0,0) scale(0)', opacity: 0 },
                    { transform: `translate(${(Math.random()-0.5)*100}px, ${(Math.random()-0.5)*100}px) scale(1.5)`, opacity: 1 },
                    { transform: `translate(${(Math.random()-0.5)*150}px, ${(Math.random()-0.5)*150}px) scale(0)`, opacity: 0 }
                ], {
                    duration: 1000 + Math.random() * 500,
                    easing: 'ease-out'
                }).onfinish = () => sparkle.remove();
            }, i * 100);
        }
    }
    
    showDiscoveryModal(fish) {
        this.modalOverlay.style.display = 'flex';
        this.modalOverlay.style.pointerEvents = 'auto';
        this.modalOverlay.style.zIndex = '9500';
        
        this.modalOverlay.innerHTML = `
            <div id="discovery-modal" style="
                background: linear-gradient(180deg, rgba(0, 50, 150, 0.9) 0%, rgba(0, 20, 50, 0.98) 100%);
                padding: 40px; border-radius: 45px; border: 4px solid #ffd700; 
                display: flex; flex-direction: column; align-items: center; 
                box-shadow: 0 0 50px rgba(255, 215, 0, 0.4), inset 0 0 20px rgba(255,255,255,0.1);
                width: 90%; max-width: 400px; backdrop-filter: blur(15px);
                animation: modal-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                text-align: center;
                position: relative;
            ">
                <div style="font-size: 0.8rem; color: #ffd700; text-transform: uppercase; letter-spacing: 4px; font-weight: bold; margin-bottom: 10px;">New Discovery!</div>
                <h2 style="font-size: 2.2rem; color: #fff; margin-bottom: 25px; text-shadow: 0 0 15px #ffd700;">LEGENDARY FISH</h2>
                
                <div style="width: 180px; height: 180px; background: radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%); display: flex; align-items: center; justify-content: center; margin-bottom: 20px; position: relative;">
                    <div style="position: absolute; width: 100%; height: 100%; border: 2px dashed rgba(255,215,0,0.5); border-radius: 50%; animation: rotate 10s linear infinite;"></div>
                    <img src="${fish.sprite}" style="width: 140px; height: auto; filter: drop-shadow(0 0 20px #ffd700); animation: chest-float 3s ease-in-out infinite;">
                </div>

                <h3 style="font-size: 1.8rem; color: #00ffaa; margin-bottom: 10px;">${fish.name}</h3>
                <p style="color: #add8e6; font-size: 1rem; line-height: 1.4; margin-bottom: 30px;">${fish.description}</p>
                
                <div style="display: flex; gap: 15px; width: 100%;">
                    <button id="share-discovery-btn" style="flex: 1; padding: 1.2rem; background: #ffd700; border: none; color: black; font-weight: bold; cursor: pointer; border-radius: 50px; font-size: 1.1rem; box-shadow: 0 8px 20px rgba(255,215,0,0.3); display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <span>📤</span> SHARE
                    </button>
                    <button id="close-discovery-btn" style="flex: 1; padding: 1.2rem; background: rgba(255,255,255,0.1); border: 2px solid white; color: white; font-weight: bold; cursor: pointer; border-radius: 50px; font-size: 1.1rem;">AWESOME</button>
                </div>
            </div>
        `;

        const close = () => {
            this.modalOverlay.style.display = 'none';
            this.modalOverlay.style.pointerEvents = 'none';
        };
        this.modalOverlay.querySelector('#close-discovery-btn').onclick = close;
        this.modalOverlay.querySelector('#share-discovery-btn').onclick = () => {
            this.simulateShare(`I just discovered the legendary ${fish.name} in my Aqua Match sanctuary! 🌟🐬 Truly a wonder of the deep. #AquaMatch #RareFind`);
        };
    }

    showDepthRecordModal(depth) {
        this.modalOverlay.style.display = 'flex';
        this.modalOverlay.style.pointerEvents = 'auto';
        this.modalOverlay.style.zIndex = '9500';
        
        this.modalOverlay.innerHTML = `
            <div id="depth-record-modal" style="
                background: linear-gradient(180deg, rgba(0, 20, 50, 0.95) 0%, rgba(0, 0, 0, 0.98) 100%);
                padding: 40px; border-radius: 45px; border: 4px solid #00ffff; 
                display: flex; flex-direction: column; align-items: center; 
                box-shadow: 0 0 50px rgba(0, 255, 255, 0.4), inset 0 0 20px rgba(255,255,255,0.1);
                width: 90%; max-width: 400px; backdrop-filter: blur(15px);
                animation: modal-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                text-align: center;
                position: relative;
            ">
                <div style="font-size: 0.8rem; color: #00ffff; text-transform: uppercase; letter-spacing: 4px; font-weight: bold; margin-bottom: 10px;">New Record!</div>
                <h2 style="font-size: 2.2rem; color: #fff; margin-bottom: 25px; text-shadow: 0 0 15px #00ffff;">MAXIMUM DEPTH</h2>
                
                <div style="font-size: 5rem; margin-bottom: 20px; filter: drop-shadow(0 0 20px #00ffff); animation: chest-float 3s ease-in-out infinite;">🌊</div>

                <div style="font-size: 4rem; font-weight: bold; color: #fff; margin-bottom: 5px; text-shadow: 0 0 20px #00ffff;">${depth}m</div>
                <p style="color: #add8e6; font-size: 1.1rem; margin-bottom: 35px; text-transform: uppercase; letter-spacing: 2px;">Into the Hadal Void</p>
                
                <div style="display: flex; gap: 15px; width: 100%;">
                    <button id="share-depth-btn" style="flex: 1; padding: 1.2rem; background: #00ffff; border: none; color: black; font-weight: bold; cursor: pointer; border-radius: 50px; font-size: 1.1rem; box-shadow: 0 8px 20px rgba(0,255,255,0.3); display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <span>📤</span> SHARE
                    </button>
                    <button id="close-depth-btn" style="flex: 1; padding: 1.2rem; background: rgba(255,255,255,0.1); border: 2px solid white; color: white; font-weight: bold; cursor: pointer; border-radius: 50px; font-size: 1.1rem;">KEEP DIVING</button>
                </div>
            </div>
        `;

        const close = () => {
            this.modalOverlay.style.display = 'none';
            this.modalOverlay.style.pointerEvents = 'none';
        };
        this.modalOverlay.querySelector('#close-depth-btn').onclick = close;
        this.modalOverlay.querySelector('#share-depth-btn').onclick = () => {
            this.simulateShare(`DEEP SEA RECORD! I reached ${depth}m in the Abyssal Sprint! ⚓🔱 The Hadal Void is no match for me. #AquaMatch #AbyssRecord #CrazyGames`);
        };
    }

    simulateShare(text) {
        if (navigator.share) {
            navigator.share({
                title: 'Aqua Match',
                text: text,
                url: window.location.href
            }).catch(err => console.log('Share failed:', err));
        } else {
            // Fallback for browsers that don't support Web Share API
            const shareOverlay = document.createElement('div');
            shareOverlay.style.cssText = `
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.9); z-index: 5000; display: flex; flex-direction: column;
                align-items: center; justify-content: center; padding: 30px; text-align: center;
                animation: modal-pop 0.3s ease-out;
            `;
            shareOverlay.innerHTML = `
                <div style="font-size: 3rem; margin-bottom: 20px;">📋</div>
                <h3 style="color: white; margin-bottom: 15px;">Copy to clipboard</h3>
                <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 15px; border: 1px solid rgba(255,255,255,0.2); color: #add8e6; font-size: 0.9rem; margin-bottom: 25px; width: 100%; word-break: break-word;">${text}</div>
                <button id="copy-share-btn" style="width: 100%; padding: 1rem; background: #00ffaa; border: none; color: black; font-weight: bold; border-radius: 50px; cursor: pointer; margin-bottom: 15px;">COPY & CLOSE</button>
            `;
            this.root.appendChild(shareOverlay);
            shareOverlay.querySelector('#copy-share-btn').onclick = () => {
                navigator.clipboard.writeText(text);
                shareOverlay.remove();
            };
        }
    }

    renderTournament(tournamentData, playerDepth = 0) {
        const list = document.getElementById('tournament-list');
        const depthEl = document.getElementById('player-tournament-depth');
        const timerEl = document.getElementById('tournament-timer');
        
        if (!list) return;

        // Update player's current depth display
        if (depthEl) depthEl.innerText = `${playerDepth}m`;

        // Update timer display
        if (timerEl && tournamentData.endTime) {
            const now = Date.now();
            const diff = tournamentData.endTime - now;
            if (diff > 0) {
                const hours = Math.floor(diff / 3600000);
                const mins = Math.floor((diff % 3600000) / 60000);
                const secs = Math.floor((diff % 60000) / 1000);
                timerEl.innerText = `Ends in: ${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            } else {
                timerEl.innerText = "Event Ended!";
                timerEl.style.borderColor = "#888";
                timerEl.style.color = "#888";
                timerEl.style.background = "rgba(0,0,0,0.2)";
            }
        }

        list.innerHTML = '';
        
        // Combine real player with simulated ones for a full leaderboard
        const me = { name: dbManager.playerName || "You", depth: playerDepth, isMe: true };
        const combined = [...tournamentData.leaderboard, me].sort((a, b) => b.depth - a.depth);

        combined.forEach((entry, index) => {
            const card = document.createElement('div');
            const isMe = entry.isMe;
            card.style.cssText = `
                display: flex; align-items: center; gap: 15px; padding: 12px 20px;
                background: ${isMe ? 'rgba(255,100,0,0.2)' : 'rgba(255,255,255,0.05)'};
                border: 1px solid ${isMe ? '#ff6400' : 'rgba(255,255,255,0.1)'};
                border-radius: 20px;
            `;

            const rankColor = index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#fff';

            card.innerHTML = `
                <div style="font-weight: 900; color: ${rankColor}; font-size: 1.2rem; min-width: 35px;">#${index + 1}</div>
                <div style="flex: 1;">
                    <div style="font-weight: bold; color: white;">${entry.name}</div>
                    <div style="font-size: 0.7rem; color: #add8e6; text-transform: uppercase;">Diver</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 1.2rem; font-weight: 900; color: #ff6400;">${entry.depth}m</div>
                </div>
            `;
            list.appendChild(card);
        });
    }

    renderVault(vaultData, currentStats) {
        const list = document.getElementById('vault-list');
        const completionBar = document.getElementById('vault-completion-bar');
        const completionPercent = document.getElementById('vault-completion-percent');
        
        if (!list) return;

        list.innerHTML = '';
        let completedCount = 0;

        ABYSSAL_VAULT_ACHIEVEMENTS.forEach(ach => {
            const status = vaultData[ach.id] || { progress: 0, claimed: false };
            
            // Re-calculate progress based on current actual stats
            let actualProgress = 0;
            if (ach.type === 'collection_size') actualProgress = currentStats.collectionSize;
            else if (ach.type === 'legendary_count') actualProgress = currentStats.legendaryCount;
            else if (ach.type === 'max_depth') actualProgress = currentStats.maxDepth;
            else if (ach.type === 'hybrid_count') actualProgress = currentStats.hybridCount;

            const isCompleted = actualProgress >= ach.target;
            if (isCompleted) completedCount++;

            const card = document.createElement('div');
            card.style.cssText = `
                display: flex; align-items: center; gap: 15px; padding: 20px;
                background: ${isCompleted ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255,255,255,0.05)'};
                border: 2px solid ${isCompleted ? '#ffd700' : 'rgba(255,255,255,0.1)'};
                border-radius: 25px;
                position: relative;
                overflow: hidden;
            `;

            const percent = Math.min(100, Math.floor((actualProgress / ach.target) * 100));

            card.innerHTML = `
                <div style="width: 50px; height: 50px; background: rgba(0,0,0,0.3); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; filter: ${isCompleted ? 'none' : 'grayscale(1)'}">
                    ${isCompleted ? '🏆' : '🔒'}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: bold; color: ${isCompleted ? '#ffd700' : 'white'}; font-size: 1.1rem;">${ach.name}</div>
                    <div style="font-size: 0.75rem; color: #add8e6; margin-bottom: 8px;">${ach.description}</div>
                    <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                        <div style="width: ${percent}%; height: 100%; background: ${isCompleted ? '#ffd700' : '#00ffff'}; transition: width 0.5s;"></div>
                    </div>
                </div>
                <div style="text-align: right; min-width: 80px;">
                    ${status.claimed ? `
                        <div style="font-size: 0.7rem; color: #00ffaa; font-weight: bold; text-transform: uppercase;">Claimed</div>
                    ` : isCompleted ? `
                        <button class="interactive-btn" onclick="window.dispatchEvent(new CustomEvent('claim-vault-reward', { detail: { id: '${ach.id}' } }))" style="background: #ffd700; border: none; color: black; padding: 6px 12px; border-radius: 12px; font-weight: bold; font-size: 0.8rem; cursor: pointer;">CLAIM</button>
                    ` : `
                        <div style="font-size: 0.8rem; color: white; font-weight: bold;">${actualProgress}/${ach.target}</div>
                    `}
                    <div style="font-size: 0.65rem; color: #ffd700; margin-top: 4px;">⚪ ${ach.reward}</div>
                </div>
            `;
            list.appendChild(card);
        });

        const totalPercent = Math.floor((completedCount / ABYSSAL_VAULT_ACHIEVEMENTS.length) * 100);
        if (completionBar) completionBar.style.width = `${totalPercent}%`;
        if (completionPercent) completionPercent.innerText = `${totalPercent}%`;
    }

    showView(viewName) {
        if (viewName === 'levels') {
            window.dispatchEvent(new CustomEvent('request-emergency-levels'));
            return;
        }
        if (this.currentView === viewName) return;
        
        const oldViewName = this.currentView;
        if (viewName === 'tournament') {
            window.dispatchEvent(new CustomEvent('render-tournament'));
        }

        if (viewName === 'vault') {
            window.dispatchEvent(new CustomEvent('render-vault'));
        }

        this.currentView = viewName;
        
        ['menu', 'levels', 'game', 'success', 'aquarium', 'aquariumMode', 'store', 'gameOver', 'levelSummary', 'leaderboard', 'missions', 'pearlBank', 'tournament', 'vault'].forEach(v => {
            const el = document.getElementById(`view-${v}`);
            if (el) {
                if (v === viewName) {
                    el.style.display = 'flex';
                    el.classList.add('view-active');
                    el.style.pointerEvents = 'auto';
                    el.style.zIndex = '1000';
                    el.style.opacity = '1';
                } else {
                    el.style.display = 'none';
                    el.classList.remove('view-active');
                    el.style.pointerEvents = 'none';
                    el.style.opacity = '0';
                }
            }
        });
        
        window.dispatchEvent(new CustomEvent('view-changed', { detail: viewName }));
        
        const isHUDVisible = (viewName === 'game' || viewName === 'levels');
        if (this.topBar) this.topBar.style.display = isHUDVisible ? 'flex' : 'none';
        if (this.bottomBar) this.bottomBar.style.display = isHUDVisible ? 'flex' : 'none';
        
        const topMiniObjContainer = document.getElementById('top-mini-objective');
        if (topMiniObjContainer) {
            topMiniObjContainer.style.display = (viewName === 'game') ? 'flex' : 'none';
        }
        
        const topGiftBtn = document.getElementById('top-gift-btn');
        if (topGiftBtn) {
            topGiftBtn.style.display = (viewName === 'levels') ? 'flex' : 'none';
        }
        
        // Dynamic visibility of fullscreen control
        const isControlsAccessible = (viewName === 'game' || viewName === 'levels' || viewName === 'menu');
        const bRightFS = document.getElementById('bottom-right-fullscreen-btn');
        if (bRightFS) bRightFS.style.display = isControlsAccessible ? 'flex' : 'none';

        if (this.reefLayer) {
            this.reefLayer.style.display = isHUDVisible ? 'flex' : 'none';
            this.reefLayer.style.opacity = isHUDVisible ? '1' : '0';
            this.reefLayer.style.transition = 'opacity 0.5s';
        }

        if (viewName === 'store') {
            window.dispatchEvent(new CustomEvent('render-store'));
        }

        if (viewName === 'missions') {
            window.dispatchEvent(new CustomEvent('render-missions'));
        }

        if (viewName === 'pearlBank') {
            window.dispatchEvent(new CustomEvent('render-pearl-bank'));
        }

        if (viewName === 'levels') {
            const totalStarsSection = document.getElementById('total-stars-section');
            const scoreSection = document.getElementById('hud-score-section');
            const levelSection = document.getElementById('hud-level-section');
            const objectivesContainer = document.getElementById('objectives-container');
            const movesContainer = document.getElementById('moves-container');

            if (totalStarsSection) totalStarsSection.style.display = 'flex';
            if (scoreSection) scoreSection.style.display = 'none';
            if (levelSection) levelSection.style.display = 'none';
            if (objectivesContainer) objectivesContainer.style.display = 'none';
            if (movesContainer) movesContainer.style.display = 'none';
            
            window.dispatchEvent(new CustomEvent('render-map'));
        } else if (viewName === 'game') {
            const totalStarsSection = document.getElementById('total-stars-section');
            const scoreSection = document.getElementById('hud-score-section');
            const levelSection = document.getElementById('hud-level-section');
            const objectivesContainer = document.getElementById('objectives-container');
            const movesContainer = document.getElementById('moves-container');

            if (totalStarsSection) totalStarsSection.style.display = 'none';
            if (scoreSection) scoreSection.style.display = 'flex';
            if (levelSection) levelSection.style.display = 'flex';
            if (objectivesContainer) objectivesContainer.style.display = 'flex';
            if (movesContainer) movesContainer.style.display = 'flex';
        }

        if (viewName === 'aquarium') {
            window.dispatchEvent(new CustomEvent('render-aquarium'));
        }
    }

    setZenMode(active) {
        const elementsToHide = [this.topBar, this.bottomBar, document.getElementById('aquarium-hud'), this.aquariumModeView.querySelector('div:last-child')];
        elementsToHide.forEach(el => {
            if (el) el.style.visibility = active ? 'hidden' : 'visible';
        });

        if (active) {
            const exitHint = document.createElement('div');
            exitHint.id = 'zen-exit-hint';
            exitHint.style.cssText = `
                position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%);
                color: rgba(255,255,255,0.4); font-size: 0.8rem; font-weight: bold;
                text-transform: uppercase; letter-spacing: 2px; pointer-events: none;
                animation: modal-pop 1s forwards;
            `;
            exitHint.innerText = 'Tap to exit Zen Mode';
            this.root.appendChild(exitHint);
            setTimeout(() => { if (exitHint.parentElement) exitHint.style.opacity = '0'; exitHint.style.transition = 'opacity 2s'; }, 3000);
        } else {
            const hint = document.getElementById('zen-exit-hint');
            if (hint) hint.remove();
        }
    }

    syncMuteState(isMuted) {
        const soundBtn = document.getElementById('sound-toggle-btn');
        if (soundBtn) {
            soundBtn.style.background = isMuted ? '#ff6b6b' : '#00ffaa';
            soundBtn.style.color = isMuted ? 'white' : 'black';
            soundBtn.innerText = isMuted ? 'OFF' : 'ON';
        }
        const inlineMuteIcon = document.getElementById('inline-mute-icon');
        if (inlineMuteIcon) {
            inlineMuteIcon.innerText = isMuted ? '🔇' : '🔊';
        }
    }

    showSimulatedAdOverlay(onFinished) {
        this.modalOverlay.style.display = 'flex';
        this.modalOverlay.style.pointerEvents = 'auto';
        this.modalOverlay.style.zIndex = '200000'; // Higher priority overlay
        
        this.modalOverlay.innerHTML = `
            <div id="simulated-ad-panel" style="
                background: linear-gradient(180deg, #120c1f 0%, #03020a 100%);
                padding: 40px; border-radius: 40px; border: 4px solid #ff4444; 
                display: flex; flex-direction: column; align-items: center; 
                box-shadow: 0 0 50px rgba(255, 68, 68, 0.4), inset 0 0 20px rgba(255,255,255,0.1);
                width: 85%; max-width: 380px; backdrop-filter: blur(20px);
                animation: modal-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                text-align: center;
                position: relative;
            ">
                <div style="font-size: 0.8rem; color: #ff4444; text-transform: uppercase; letter-spacing: 4px; font-weight: bold; margin-bottom: 10px;">CrazyGames SDK</div>
                <h2 style="font-size: 2.2rem; color: #fff; margin-bottom: 15px; text-shadow: 0 0 15px rgba(255,68,68,0.6);">AD PLAYBACK</h2>
                
                <div style="width: 150px; height: 150px; background: radial-gradient(circle, rgba(255,68,68,0.2) 0%, transparent 70%); display: flex; align-items: center; justify-content: center; margin-bottom: 25px; position: relative;">
                    <div style="position: absolute; width: 100%; height: 100%; border: 2px dashed rgba(255,68,68,0.5); border-radius: 50%; animation: rotate 8s linear infinite;"></div>
                    <span style="font-size: 5rem; animation: chest-float 3s ease-in-out infinite;">📺</span>
                </div>

                <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.1);">
                    <div id="ad-simulation-progress" style="width: 0%; height: 100%; background: #ff4444; box-shadow: 0 0 8px #ff4444; transition: width 0.1s linear;"></div>
                </div>

                <div style="font-size: 1.1rem; color: white; font-weight: bold; margin-bottom: 5px;">SPONSORED MID-ROLL</div>
                <p style="color: #add8e6; font-size: 0.85rem; line-height: 1.4; margin: 0;">Audio is muted & gameplay paused.<br>Resuming in <span id="ad-simulation-timer" style="color: #ff4444; font-weight: bold;">3</span>s...</p>
            </div>
        `;

        const progressEl = this.modalOverlay.querySelector('#ad-simulation-progress');
        const timerEl = this.modalOverlay.querySelector('#ad-simulation-timer');
        let timeLeft = 3;
        const totalTime = 3;

        const interval = setInterval(() => {
            timeLeft -= 0.1;
            if (timeLeft <= 0) {
                clearInterval(interval);
                this.modalOverlay.style.display = 'none';
                this.modalOverlay.style.pointerEvents = 'none';
                onFinished();
            } else {
                if (timerEl) timerEl.innerText = Math.ceil(timeLeft);
                if (progressEl) progressEl.style.width = `${((totalTime - timeLeft) / totalTime) * 100}%`;
            }
        }, 100);
    }

    showGrandFinale() {
        this.modalOverlay.style.display = 'flex';
        this.modalOverlay.style.pointerEvents = 'auto';
        this.modalOverlay.style.zIndex = '300000';
        
        this.modalOverlay.innerHTML = `
            <div id="grand-finale-panel" style="
                background: linear-gradient(180deg, #001e4b 0%, #000 100%);
                padding: 45px; border-radius: 50px; border: 5px solid #ffd700; 
                display: flex; flex-direction: column; align-items: center; 
                box-shadow: 0 0 80px rgba(255, 215, 0, 0.6), inset 0 0 30px rgba(255,255,255,0.2);
                width: 90%; max-width: 450px; backdrop-filter: blur(25px);
                animation: modal-pop 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                text-align: center; position: relative;
            ">
                <div style="font-size: 0.9rem; color: #ffd700; text-transform: uppercase; letter-spacing: 6px; font-weight: bold; margin-bottom: 15px;">Universal Ascent</div>
                <h2 style="font-size: 2.8rem; color: #fff; margin-bottom: 25px; text-shadow: 0 0 20px #ffd700; line-height: 1.1;">ABYSSAL MASTER</h2>
                
                <div style="width: 220px; height: 220px; background: radial-gradient(circle, rgba(255,215,0,0.4) 0%, transparent 70%); display: flex; align-items: center; justify-content: center; margin-bottom: 30px; position: relative;">
                    <div style="position: absolute; width: 100%; height: 100%; border: 3px dashed #ffd700; border-radius: 50%; animation: rotate 15s linear infinite;"></div>
                    <img src="assets/infinite-star-ray-webp.webp" style="width: 180px; height: auto; filter: drop-shadow(0 0 30px #ffd700); animation: chest-float 4s ease-in-out infinite;">
                </div>

                <h3 style="font-size: 1.5rem; color: #00ffaa; margin-bottom: 15px;">The Infinite Star-Ray Found!</h3>
                <p style="color: #add8e6; font-size: 1.1rem; line-height: 1.6; margin-bottom: 35px;">
                    You have descended 1000 levels into the Hadal Void and restored the Great Reef. 
                    The oceans are in harmony, and you have become a Legendary Abyssal Guardian.
                </p>
                
                <div style="display: flex; flex-direction: column; gap: 15px; width: 100%;">
                    <button id="finale-share-btn" style="width: 100%; padding: 1.4rem; background: #ffd700; border: none; color: black; font-weight: 900; cursor: pointer; border-radius: 50px; font-size: 1.3rem; box-shadow: 0 10px 25px rgba(255,215,0,0.4); display: flex; align-items: center; justify-content: center; gap: 10px;">
                        <span>🔱</span> SHARE YOUR LEGACY
                    </button>
                    <button id="finale-menu-btn" style="width: 100%; padding: 1.2rem; background: rgba(255,255,255,0.1); border: 2px solid white; color: white; font-weight: bold; cursor: pointer; border-radius: 50px; font-size: 1.1rem;">RETURN TO SANCTUARY</button>
                </div>
            </div>
        `;

        const close = () => {
            this.modalOverlay.style.display = 'none';
            this.modalOverlay.style.pointerEvents = 'none';
            this.showView('menu');
        };
        
        this.modalOverlay.querySelector('#finale-menu-btn').onclick = close;
        this.modalOverlay.querySelector('#finale-share-btn').onclick = () => {
            this.simulateShare("I AM THE ABYSSAL MASTER! 🔱⚓ 1000 levels conquered and the Infinite Star-Ray found. The Great Reef is restored! #AquaMatch #Legendary #DeepSeaDescent");
        };
        
        window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'chest-open' }));
        if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100, 50, 200]);
    }

    renderLevelMap(unlockedLevel, levelStats, totalStars, onStart) {
        const container = document.getElementById('level-nodes-container');
        const pathLine = document.getElementById('map-path-line');
        const progressLine = document.getElementById('map-progress-line');
        const scrollContainer = document.getElementById('map-scroll-container');
        const totalStarsDisplay = document.getElementById('total-stars-count');
        const pathContainer = document.getElementById('map-path-container');
        
        // Progress UI Elements
        const currentLevelText = document.getElementById('current-progress-level');
        const totalLevelsText = document.getElementById('total-levels-count');
        const progressBarFill = document.getElementById('map-progress-bar-fill');
        const progressPercentText = document.getElementById('map-progress-percent');
        
        const prevTotalStars = this.lastTotalStars || 0;
        this.lastTotalStars = totalStars;
        
        if (totalStarsDisplay) totalStarsDisplay.innerText = `${totalStars}/1250`;
        
        const totalLevels = LEVEL_COUNT;
        
        if (currentLevelText) currentLevelText.innerText = unlockedLevel;
        if (totalLevelsText) totalLevelsText.innerText = totalLevels;
        
        const progressPercentage = Math.min(100, Math.floor(((unlockedLevel - 1) / totalLevels) * 100));
        if (progressBarFill) progressBarFill.style.width = `${progressPercentage}%`;
        if (progressPercentText) progressPercentText.innerText = `${progressPercentage}%`;

        // Update Milestone Tracker
        const biomeSize = 50;
        const currentBiomeIdx = Math.floor((unlockedLevel - 1) / biomeSize);
        const biomeProgress = ((unlockedLevel - 1) % biomeSize) / biomeSize;
        const biomes = [
            { name: 'Sunlit Shallows', color: '#00aaff', bg: 'assets/biome-sunlit-shallows.webp' },
            { name: 'Coral Garden', color: '#ff66aa', bg: 'assets/biome-coral-garden.webp' },
            { name: 'Kelp Forest', color: '#00ffaa', bg: 'assets/biome-kelp-forest.webp' },
            { name: 'Midnight Zone', color: '#0055ff', bg: 'assets/biome-midnight-zone.webp' },
            { name: 'Abyssal Plain', color: '#add8e6', bg: 'assets/biome-abyssal-plain.webp' },
            { name: 'Volcanic Vents', color: '#ff4400', bg: 'assets/biome-volcanic-vents.webp' },
            { name: 'Arctic Trench', color: '#ffffff', bg: 'assets/biome-arctic-trench.webp' },
            { name: 'Bioluminescent Cave', color: '#ff00ff', bg: 'assets/biome-bioluminescent-grotto.webp' },
            { name: 'Ancient Shipwreck', color: '#cd7f32', bg: 'assets/biome-ancient-shipwreck.webp' },
            { name: 'The Hadal Void', color: '#111111', bg: 'assets/biome-hadal-void.webp' }
        ];
        
        const biomeNameEl = document.getElementById('tracker-biome-name');
        const biomeProgressEl = document.getElementById('tracker-biome-progress');
        const levelInfoEl = document.getElementById('tracker-level-info');
        const percentInfoEl = document.getElementById('tracker-percent-info');
        const depthValEl = document.getElementById('tracker-depth-val');
        const milestoneLevelEl = document.getElementById('tracker-milestone-level');
        const milestoneIconEl = document.getElementById('tracker-milestone-icon');

        if (biomeNameEl) biomeNameEl.innerText = biomes[Math.min(currentBiomeIdx, biomes.length - 1)].name;
        if (biomeProgressEl) biomeProgressEl.style.width = `${biomeProgress * 100}%`;
        if (levelInfoEl) levelInfoEl.innerText = `Lvl ${(unlockedLevel - 1) % biomeSize + 1}/${biomeSize}`;
        if (percentInfoEl) percentInfoEl.innerText = `${Math.floor(biomeProgress * 100)}%`;
        if (depthValEl) depthValEl.innerText = `${unlockedLevel * 10}m`;
        
        // Find next milestone (every 5 levels)
        const nextMilestoneLevel = Math.ceil(unlockedLevel / 5) * 5;
        if (milestoneLevelEl) milestoneLevelEl.innerText = `Lvl ${nextMilestoneLevel}`;
        
        // Update milestone icon based on the fish species for that level
        if (milestoneIconEl) {
            const fishSpecies = Object.keys(window.gameFISH_TYPES).filter(k => !k.includes('POWERUP'));
            const speciesId = fishSpecies[(nextMilestoneLevel - 1) % fishSpecies.length];
            const fishSprite = window.gameFISH_TYPES[speciesId].sprite;
            milestoneIconEl.innerHTML = `<img src="${fishSprite}" style="width: 18px; height: auto; filter: drop-shadow(0 0 2px white);">`;
        }
        
        container.innerHTML = '';
        this.mapNodes = []; 
        
        const oldDecor = pathContainer.querySelectorAll('.map-decoration, .map-bubble, .fish-school-container, .biome-bg-layer');
        oldDecor.forEach(d => d.remove());

        this.parallaxLayers = [];

        const biomeHeight = 11000;
        for (let b = 0; b < biomes.length; b++) {
            this.addBiomeEffects(pathContainer, b, b * biomeHeight, biomes[b]);

            const title = document.createElement('div');
            title.style.cssText = `
                position: absolute; left: 50%; transform: translateX(-50%);
                top: ${b * biomeHeight + 500}px; z-index: 5;
                font-size: 4rem; font-weight: bold; color: white;
                text-shadow: 0 0 25px ${biomes[b].color}, 0 0 10px white; opacity: 0.9;
                text-transform: uppercase; letter-spacing: 15px; white-space: nowrap;
                pointer-events: none;
            `;
            title.innerText = biomes[b].name;
            container.appendChild(title);

            // Add a transition gradient between biomes
            const transition = document.createElement('div');
            transition.style.cssText = `
                position: absolute; left: 0; width: 100%; height: 1000px;
                top: ${(b + 1) * biomeHeight - 500}px; z-index: 1;
                background: linear-gradient(to bottom, transparent, rgba(0,20,50,0.8), transparent);
                pointer-events: none;
            `;
            container.appendChild(transition);
        }

        const width = window.innerWidth;
        const points = [];
        const getReq = (idx) => idx === 0 ? 0 : Math.floor(idx * 2.5);

        // Keep track of which nodes are newly unlocked
        const newlyUnlockedIndices = [];

        const patternUnlockLevels = [15, 30, 45, 60, 75];
        const patternNames = ['Cross', 'Diamond', 'Donut', 'Hourglass', 'Heart'];

        for (let i = 0; i < totalLevels; i++) {
            const levelNum = i + 1;
            const req = getReq(i);
            const isUnlocked = totalStars >= req;
            const wasLockedBefore = prevTotalStars < req;
            const stats = levelStats[i] || { score: 0, stars: 0 };
            
            if (isUnlocked && wasLockedBefore && i > 0) {
                newlyUnlockedIndices.push(i);
            }

            const x = (Math.sin(i * 0.4) * (width * 0.3)) + (width * 0.5); 
            const y = i * 220 + 200; 
            points.push({x, y});

            // Add Pattern Unlock Marker
            if (patternUnlockLevels.includes(levelNum)) {
                const marker = document.createElement('div');
                marker.className = 'map-decoration';
                marker.style.cssText = `
                    position: absolute; left: ${x + 80}px; top: ${y - 40}px;
                    background: linear-gradient(135deg, #ffd700, #ff8800);
                    padding: 8px 15px; border-radius: 15px; border: 2px solid white;
                    color: black; font-weight: 900; font-size: 0.7rem;
                    box-shadow: 0 0 15px rgba(255,215,0,0.6);
                    z-index: 5; transform: rotate(10deg);
                    pointer-events: none; white-space: nowrap;
                    animation: marker-float 3s ease-in-out infinite;
                `;
                const pName = patternNames[patternUnlockLevels.indexOf(levelNum)];
                marker.innerHTML = `NEW GRID:<br>${pName.toUpperCase()}`;
                container.appendChild(marker);
            }

            const node = document.createElement('div');
            node.className = 'level-node interactive-btn';
            
            // Apply new unlock animation if applicable
            if (isUnlocked && wasLockedBefore && i > 0) {
                node.classList.add('new-unlock-anim');
            }

            node.style.cssText = `
                position: absolute; left: ${x}px; top: ${y}px;
                width: 100px; height: 140px;
                transform: translate(-50%, -50%) scale(0.6);
                display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
                cursor: ${isUnlocked ? 'pointer' : 'default'};
                z-index: 10;
            `;

            const bubble = document.createElement('div');
            bubble.className = 'level-bubble';

            const fishSpecies = Object.keys(window.gameFISH_TYPES).filter(k => !k.includes('POWERUP'));
            const speciesId = fishSpecies[i % fishSpecies.length];
            const fishSprite = window.gameFISH_TYPES[speciesId].sprite;

            bubble.style.cssText = `
                width: 90px; height: 90px;
                background: url('assets/realistic-crystal-bubble-v2.webp') center/contain no-repeat;
                display: flex; align-items: center; justify-content: center;
                font-size: 2rem; font-weight: 900;
                color: ${isUnlocked ? 'white' : 'rgba(150,150,150,0.8)'};
                filter: ${isUnlocked ? 'drop-shadow(0 0 15px rgba(0,255,255,0.7))' : 'grayscale(1) brightness(0.3)'};
                text-shadow: 0 3px 12px black;
                position: relative;
            `;
            bubble.innerText = (i + 1);
            
            if (!isUnlocked || (isUnlocked && wasLockedBefore && i > 0)) {
                const lock = document.createElement('div');
                lock.style.cssText = `
                    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                    font-size: 2.2rem; opacity: 1;
                    background: rgba(0, 0, 0, 0.4); border-radius: 50%;
                    width: 50px; height: 50px; display: flex; align-items: center; justify-content: center;
                    border: 2px solid rgba(255,255,255,0.2);
                    box-shadow: 0 4px 10px rgba(0,0,0,0.5);
                    pointer-events: none;
                `;
                lock.innerText = '🔒';
                
                if (isUnlocked && wasLockedBefore) {
                    lock.classList.add('lock-breaking');
                }
                
                bubble.appendChild(lock);

                if (!isUnlocked) {
                    const reqTag = document.createElement('div');
                    reqTag.style.cssText = `
                        position: absolute; bottom: -25px; background: rgba(0,0,0,0.8);
                        padding: 4px 12px; border-radius: 15px; font-size: 0.8rem; color: #ffd700;
                        white-space: nowrap; border: 2px solid rgba(255,215,0,0.5); font-weight: bold;
                    `;
                    reqTag.innerHTML = `★ ${req}`;
                    bubble.appendChild(reqTag);
                }
            }
            
            const starsContainer = document.createElement('div');
            starsContainer.style.cssText = `
                display: flex; gap: 5px; margin-top: 12px; font-size: 1.2rem;
                color: #ffd700; filter: drop-shadow(0 0 8px rgba(255,215,0,0.5));
                opacity: ${isUnlocked ? 1 : 0};
                background: rgba(0,0,0,0.5); padding: 4px 12px; border-radius: 18px;
                border: 1px solid rgba(255,255,255,0.2);
            `;
            
            for (let s = 0; s < 3; s++) {
                const star = document.createElement('span');
                star.innerText = '★';
                star.style.color = s < stats.stars ? '#ffd700' : 'rgba(255,255,255,0.15)';
                starsContainer.appendChild(star);
            }
            
            if (isUnlocked) {
                // Ensure immediate visual and functional response with redundant events
                const handleNodeInteraction = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onStart(i);
                };
                node.onpointerdown = handleNodeInteraction;
                node.onclick = handleNodeInteraction;
            } else {
                // Locked Node Feedback
                const handleLockedInteraction = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    
                    // Trigger shake animation on the bubble
                    bubble.classList.remove('node-locked-active');
                    void bubble.offsetWidth; // Trigger reflow
                    bubble.classList.add('node-locked-active');
                    
                    // Optional: Add a subtle haptic hint if supported
                    if (navigator.vibrate) navigator.vibrate(50);
                    
                    // Remove class after animation
                    setTimeout(() => {
                        bubble.classList.remove('node-locked-active');
                    }, 400);
                };
                node.onpointerdown = handleLockedInteraction;
                node.onclick = handleLockedInteraction;
            }
            
            node.appendChild(bubble);
            node.appendChild(starsContainer);
            container.appendChild(node);
            this.mapNodes.push({ element: node, y: y });
        }

        // Add Abyss Mode Entry if level 500 is unlocked
        if (unlockedLevel >= 500) {
            const abyssY = totalLevels * 220 + 400;
            const abyssNode = document.createElement('div');
            abyssNode.style.cssText = `
                position: absolute; left: 50%; top: ${abyssY}px;
                width: 250px; height: 100px;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #330066, #110022);
                border: 4px solid #00ffff; border-radius: 50px;
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                cursor: pointer; z-index: 20;
                box-shadow: 0 0 30px #6600cc, inset 0 0 20px #00ffff;
                animation: current-level-pulse 2s infinite alternate;
            `;
            
            abyssNode.innerHTML = `
                <div style="font-size: 0.8rem; color: #00ffff; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">End-Game Mode</div>
                <div style="font-size: 1.6rem; color: white; font-weight: bold; letter-spacing: 4px;">THE ABYSS</div>
            `;
            
            abyssNode.onclick = () => {
                const currentAbyssLevel = (localStorage.getItem('abyss_level') || 500);
                onStart(parseInt(currentAbyssLevel));
            };
            
            container.appendChild(abyssNode);
            this.mapNodes.push({ element: abyssNode, y: abyssY });
            
            // Adjust path to abyss
            const lastPoint = points[points.length - 1];
            const segment = ` C ${lastPoint.x} ${lastPoint.y + 110}, ${width/2} ${abyssY - 110}, ${width/2} ${abyssY}`;
            pathLine.setAttribute('d', pathLine.getAttribute('d') + segment);
            if (progressLine) progressLine.setAttribute('d', progressLine.getAttribute('d') + segment);
        }
        
        let d = `M ${points[0].x} ${points[0].y}`;
        let progressD = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            const cp1x = points[i-1].x;
            const cp1y = points[i-1].y + 110;
            const cp2x = points[i].x;
            const cp2y = points[i].y - 110;
            const segment = ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${points[i].x} ${points[i].y}`;
            d += segment;
            if (totalStars >= getReq(i)) progressD += segment;
        }
        pathLine.setAttribute('d', d);
        if (progressLine) progressLine.setAttribute('d', progressD);

        // Player Avatar
        let playerAvatar = document.querySelector('.player-avatar');
        if (!playerAvatar) {
            playerAvatar = document.createElement('img');
            playerAvatar.src = 'assets/neongoldfish-sprite.webp';
            playerAvatar.className = 'player-avatar';
            container.appendChild(playerAvatar);
        }

        let currentIdx = 0;
        for (let i = 0; i < totalLevels; i++) {
            if (totalStars >= getReq(i)) currentIdx = i;
        }
        
        const currentPos = points[currentIdx];
        playerAvatar.style.left = `${currentPos.x}px`;
        playerAvatar.style.top = `${currentPos.y}px`;

        // DYNAMIC ZOOM SYSTEM
        const updateDynamicZoom = () => {
            if (this.currentView !== 'levels') return;
            const scrollTop = scrollContainer.scrollTop;
            const centerY = scrollTop + window.innerHeight / 2;
            const viewportHeight = window.innerHeight;

            // Handle Parallax
            if (this.parallaxLayers) {
                this.parallaxLayers.forEach(layer => {
                    const offset = scrollTop * layer.speed;
                    layer.element.style.transform = `translateY(${offset}px)`;
                });
            }
            
            this.mapNodes.forEach(node => {
                const distance = Math.abs(node.y - centerY);
                const normalizedDist = Math.min(1, distance / (viewportHeight * 0.7));
                
                // 5 levels closest to center get greatly magnified
                let scale = 1.8 * (1 - Math.pow(normalizedDist, 0.6));
                scale = Math.max(0.35, scale); // Infinite receding perspective
                
                const opacity = Math.max(0.4, 1 - normalizedDist * 0.5);
                
                if (!node.element.matches(':hover')) {
                    node.element.style.transform = `translate(-50%, -50%) scale(${scale})`;
                    node.element.style.opacity = opacity;
                    node.element.style.filter = distance < viewportHeight * 0.3 ? 'none' : `blur(${normalizedDist * 4}px)`;
                    node.element.style.zIndex = Math.floor(100 * (1 - normalizedDist));
                }
            });
            
            this.zoomAnimFrame = requestAnimationFrame(updateDynamicZoom);
        };

        if (this.zoomAnimFrame) cancelAnimationFrame(this.zoomAnimFrame);
        updateDynamicZoom();

        // Auto scroll to current level
        setTimeout(() => {
            scrollContainer.scrollTop = currentPos.y - window.innerHeight / 2;
        }, 100);

        // Map Animations & Styles Injection (Ensuring no duplicates)
        if (!document.getElementById('map-animations-v2')) {
            const style = document.createElement('style');
            style.id = 'map-animations-v2';
            style.innerHTML = `
                @keyframes current-level-pulse {
                    from { transform: scale(1); filter: drop-shadow(0 0 15px rgba(0,255,255,0.7)); }
                    to { transform: scale(1.15); filter: drop-shadow(0 0 30px rgba(0,255,255,1)); }
                }
                @keyframes player-swim {
                    0%, 100% { transform: translate(-50%, -60%) rotate(-10deg); }
                    50% { transform: translate(-50%, -40%) rotate(10deg); }
                }
                @keyframes marker-float {
                    0%, 100% { transform: rotate(10deg) translateY(0); }
                    50% { transform: rotate(10deg) translateY(-10px); }
                }
                .player-avatar {
                    position: absolute; width: 90px; height: 90px; z-index: 200; pointer-events: none;
                    filter: drop-shadow(0 0 20px #00ffff) drop-shadow(0 0 5px white);
                    animation: player-swim 2.5s ease-in-out infinite;
                    transition: left 1.5s cubic-bezier(0.4, 0, 0.2, 1), top 1.5s cubic-bezier(0.4, 0, 0.2, 1);
                }
            `;
            document.head.appendChild(style);
        }
    }

    showLevelSummary(config, stats, onPlay) {
        const levelNum = this.levelSummaryView.querySelector('#summary-level-number');
        const starEls = this.levelSummaryView.querySelectorAll('.summary-star');
        const objectivesList = this.levelSummaryView.querySelector('#summary-objectives');
        const bestScoreEl = this.levelSummaryView.querySelector('#summary-best-score');
        const playBtn = this.levelSummaryView.querySelector('#summary-play-btn');

        // Explicitly show the view container immediately to ensure it's in the DOM properly for edits
        this.showView('levelSummary');

        levelNum.innerText = config.level;
        bestScoreEl.innerText = stats.score.toLocaleString();

        // Stars
        starEls.forEach((star, i) => {
            star.style.color = i < stats.stars ? '#ffd700' : 'rgba(255,255,255,0.1)';
            star.style.textShadow = i < stats.stars ? '0 0 15px gold' : 'none';
        });

        // Objectives
        objectivesList.innerHTML = '';
        config.objectives.forEach(obj => {
            const item = document.createElement('div');
            item.style.cssText = `display: flex; flex-direction: column; align-items: center; gap: 5px;`;
            
            if (obj.type === 'score') {
                item.innerHTML = `
                    <span style="font-size: 1.5rem; color: #ffd700;">★</span>
                    <span style="font-size: 0.9rem; font-weight: bold; color: #fff;">${obj.target.toLocaleString()}</span>
                `;
            } else if (obj.type === 'collect') {
                item.innerHTML = `
                    <img src="${obj.icon}" style="width: 40px; height: 40px; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.3));">
                    <span style="font-size: 0.9rem; font-weight: bold; color: #fff;">${obj.target}</span>
                `;
            }
            objectivesList.appendChild(item);
        });

        playBtn.onclick = () => {
            if (window.gameLives <= 0) {
                this.showOutOfLivesModal();
                return;
            }
            onPlay();
            this.showView('game');
        };

        this.showView('levelSummary');
    }

    updateLeaderboardSubscription(sortBy) {
        if (this.leaderboardUnsubscribe) this.leaderboardUnsubscribe();
        this.leaderboardUnsubscribe = dbManager.subscribeToLeaderboard((data) => {
            this.cachedLeaders = data;
            
            // Handle pending count badge
            const me = data.find(p => p.id === dbManager.userId);
            const pendingCountBadge = document.getElementById('pending-count-badge');
            if (me && me.incomingRequests && me.incomingRequests.length > 0) {
                if (pendingCountBadge) {
                    pendingCountBadge.style.display = 'block';
                    pendingCountBadge.innerText = me.incomingRequests.length;
                }
                dbManager.incomingRequests = me.incomingRequests;
                localStorage.setItem('aqua_match_incoming_requests', JSON.stringify(me.incomingRequests));
            } else if (pendingCountBadge) {
                pendingCountBadge.style.display = 'none';
            }

            if (this.leaderboardTab === 'pending') {
                this.renderPendingRequests();
            } else {
                this.renderLeaderboard(data, sortBy);
            }
        }, sortBy);
    }

    renderPendingRequests() {
        const list = document.getElementById('leaderboard-list');
        if (!list) return;
        list.innerHTML = '';

        const requests = dbManager.incomingRequests || [];
        if (requests.length === 0) {
            list.innerHTML = '<div style="text-align: center; padding: 40px; color: #add8e6; font-style: italic;">No pending friend requests.</div>';
            return;
        }

        // Find players for these IDs from cache
        requests.forEach(senderId => {
            const player = (this.cachedLeaders || []).find(p => p.id === senderId);
            if (!player) return;

            const entry = document.createElement('div');
            entry.style.cssText = `
                display: flex; align-items: center; gap: 12px; padding: 12px 15px;
                background: rgba(255,255,255,0.05);
                border-radius: 15px; border: 1px solid #00ffff;
            `;

            entry.innerHTML = `
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: bold; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${player.name || 'Anonymous'}</div>
                    <div style="font-size: 0.7rem; color: #00ffff; text-transform: uppercase;">Wants to be your friend!</div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="accept-btn" style="padding: 8px 15px; background: #00ffaa; border: none; color: black; border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">ACCEPT</button>
                    <button class="decline-btn" style="padding: 8px 15px; background: rgba(255,255,255,0.1); border: 1px solid white; color: white; border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 0.75rem;">DECLINE</button>
                </div>
            `;

            entry.querySelector('.accept-btn').onclick = () => {
                dbManager.acceptRequest(senderId);
                this.renderPendingRequests();
            };
            entry.querySelector('.decline-btn').onclick = () => {
                dbManager.declineRequest(senderId);
                this.renderPendingRequests();
            };

            list.appendChild(entry);
        });
    }

    renderLeaderboard(players, sortBy = 'stars') {
        this.cachedLeaders = players; // Save for tab switching
        if (this.leaderboardTab === 'personal') return;

        const list = document.getElementById('leaderboard-list');
        if (!list) return;

        list.innerHTML = '';
        
        let filteredPlayers = players;
        
        // Apply Global/Friends Filter
        if (this.leaderboardFilter === 'friends') {
            filteredPlayers = players.filter(p => p.id === dbManager.userId || dbManager.friends.includes(p.id));
        }

        // Apply Search Filter (New)
        if (this.leaderboardSearchTerm) {
            filteredPlayers = filteredPlayers.filter(p => 
                (p.name || '').toLowerCase().includes(this.leaderboardSearchTerm)
            );
        }

        filteredPlayers.slice(0, 50).forEach((player, index) => {
            const isMe = player.id === dbManager.userId;
            const isFriend = dbManager.friends.includes(player.id);
            const entry = document.createElement('div');
            entry.style.cssText = `
                display: flex; align-items: center; gap: 12px; padding: 12px 15px;
                background: ${isMe ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.05)'};
                border-radius: 15px; border: 1px solid ${isMe ? '#ffd700' : 'rgba(255,255,255,0.1)'};
                transition: transform 0.2s;
                position: relative;
            `;

            const rankColor = index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#add8e6';
            
            const metricHTML = sortBy === 'abyssDepth' 
                ? `<div style="font-weight: bold; color: #00ffff; font-size: 1.1rem;">🌊 ${player.abyssDepth || 0}m</div>`
                : sortBy === 'missionsCompleted'
                    ? `<div style="font-weight: bold; color: #00ffaa; font-size: 1.1rem;">📜 ${player.missionsCompleted || 0} Pts</div>`
                    : `<div style="font-weight: bold; color: #ffd700; font-size: 1.1rem;">★ ${player.stars || 0}</div>`;

            const friendBtnHTML = isMe ? '' : `
                <button class="friend-toggle-btn" style="
                    background: none; border: none; font-size: 1.2rem; cursor: pointer; padding: 5px;
                    filter: ${isFriend ? 'none' : 'grayscale(1) opacity(0.5)'};
                    transition: all 0.2s;
                " title="${isFriend ? 'Remove Friend' : 'Add Friend'}">
                    ${isFriend ? '💙' : '🤍'}
                </button>
            `;

            entry.innerHTML = `
                <div style="font-size: 1.2rem; font-weight: bold; color: ${rankColor}; min-width: 30px;">#${index + 1}</div>
                <div style="flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px;">
                    <div style="min-width: 0;">
                        <div style="font-weight: bold; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${player.name || 'Anonymous'}</div>
                        <div style="font-size: 0.7rem; color: #add8e6; text-transform: uppercase;">Diver ${isFriend ? '(Friend)' : ''}</div>
                    </div>
                    ${friendBtnHTML}
                </div>
                <div style="text-align: right;">
                    ${metricHTML}
                    ${sortBy !== 'missionsCompleted' ? `<div style="font-size: 0.7rem; color: #00ffaa; font-weight: bold;">📜 ${player.missionsCompleted || 0}</div>` : ''}
                    <div style="font-size: 0.7rem; color: rgba(255,255,255,0.5);">${(player.totalScore || 0).toLocaleString()}</div>
                </div>
            `;

            if (!isMe) {
                const fBtn = entry.querySelector('.friend-toggle-btn');
                fBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (isFriend) {
                        dbManager.removeFriend(player.id);
                    } else {
                        dbManager.addFriend(player.id);
                    }
                    this.renderLeaderboard(players, sortBy);
                };
            }

            list.appendChild(entry);
        });

        if (filteredPlayers.length === 0) {
            let msg = "No legends yet. Be the first!";
            if (this.leaderboardFilter === 'friends') msg = "You haven't added any friends yet!";
            if (this.leaderboardSearchTerm) msg = `No Diver found matching "${this.leaderboardSearchTerm}"`;
            
            list.innerHTML = `<div style="text-align: center; padding: 40px; color: #add8e6; font-style: italic;">${msg}</div>`;
        }
    }

    renderPersonalBests(stats) {
        const list = document.getElementById('leaderboard-list');
        if (!list) return;

        list.innerHTML = '';
        const levelIndices = Object.keys(stats).map(Number).sort((a, b) => a - b);

        if (levelIndices.length === 0) {
            list.innerHTML = '<div style="text-align: center; padding: 40px; color: #add8e6; font-style: italic;">No level records yet. Start diving!</div>';
            return;
        }

        levelIndices.forEach(idx => {
            const stat = stats[idx];
            const entry = document.createElement('div');
            entry.style.cssText = `
                display: flex; align-items: center; gap: 12px; padding: 12px 15px;
                background: rgba(255,255,255,0.05);
                border-radius: 15px; border: 1px solid rgba(0,255,170,0.3);
            `;

            entry.innerHTML = `
                <div style="font-size: 1.2rem; font-weight: bold; color: #00ffaa; min-width: 30px;">Lvl ${idx + 1}</div>
                <div style="flex: 1;">
                    <div style="font-weight: bold; color: white;">Best Score</div>
                    <div style="font-size: 0.7rem; color: #add8e6; text-transform: uppercase;">Personal Record</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: bold; color: #ffd700; font-size: 1.1rem;">★ ${stat.stars || 0}</div>
                    <div style="font-size: 0.7rem; color: rgba(255,255,255,0.5);">${(stat.score || 0).toLocaleString()}</div>
                </div>
            `;
            list.appendChild(entry);
        });
    }

    updatePearls(pearls) {
        const storePearlCount = document.getElementById('store-pearl-count');
        const hudPearlCount = document.getElementById('hud-pearl-count');
        const mapPearlCount = document.getElementById('map-pearl-count');
        
        if (storePearlCount) storePearlCount.innerText = pearls;
        if (hudPearlCount) hudPearlCount.innerText = pearls;
        if (mapPearlCount) mapPearlCount.innerText = pearls;

        // Also update the shop modal balance if it's currently visible
        const shopBalance = document.getElementById('shop-modal-pearl-count');
        if (shopBalance) {
            shopBalance.innerHTML = `⚪ ${pearls}`;
        }
    }

    animateRisingBubbles(sourceElement) {
        if (!sourceElement) return;
        const rect = sourceElement.getBoundingClientRect();
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;

        const bubbleCount = 15;
        for (let i = 0; i < bubbleCount; i++) {
            setTimeout(() => {
                const bubble = document.createElement('div');
                bubble.className = 'reward-bubble-particle';
                bubble.style.left = `${startX}px`;
                bubble.style.top = `${startY}px`;
                
                // Random drift
                const randX = (Math.random() - 0.5) * 60;
                bubble.style.setProperty('--rand-x', `${randX}px`);
                
                // Random size variation
                const size = 10 + Math.random() * 15;
                bubble.style.width = `${size}px`;
                bubble.style.height = `${size}px`;

                document.body.appendChild(bubble);
                
                bubble.onanimationend = () => bubble.remove();
            }, i * 40);
        }
    }

    animatePearlCollection(sourceElement) {
        if (!sourceElement) return;
        const rect = sourceElement.getBoundingClientRect();
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;

        const targetEl = document.getElementById('pearl-hud') || document.getElementById('map-pearl-btn');
        if (!targetEl) return;
        const targetRect = targetEl.getBoundingClientRect();
        const targetX = targetRect.left + targetRect.width / 2;
        const targetY = targetRect.top + targetRect.height / 2;

        const particleCount = 10;
        for (let i = 0; i < particleCount; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.className = 'pearl-particle';
                particle.style.left = `${startX}px`;
                particle.style.top = `${startY}px`;
                particle.style.setProperty('--target-x', `${targetX}px`);
                particle.style.setProperty('--target-y', `${targetY}px`);
                
                // Add some random spread
                const spreadX = (Math.random() - 0.5) * 100;
                const spreadY = (Math.random() - 0.5) * 100;
                particle.style.transform = `translate(${spreadX}px, ${spreadY}px)`;

                document.body.appendChild(particle);
                
                particle.onanimationend = () => {
                    particle.remove();
                    if (i === particleCount - 1) {
                        targetEl.classList.remove('hud-bounce-anim');
                        void targetEl.offsetWidth; // trigger reflow
                        targetEl.classList.add('hud-bounce-anim');
                        window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'pop' }));
                    }
                };
            }, i * 50);
        }
    }

    renderMissions(missionsState) {
        const list = document.getElementById('missions-list');
        if (!list) return;
        list.innerHTML = '';

        // If no state provided, use placeholder data from config
        const states = (missionsState && Object.keys(missionsState).length > 0) 
            ? Object.values(missionsState) 
            : DAILY_MISSIONS.map(m => ({ id: m.id, progress: 0, claimed: false }));

        states.forEach(mission => {
            const config = DAILY_MISSIONS.find(m => m.id === mission.id);
            if (!config) return;

            const isComplete = mission.progress >= config.target;
            const isClaimed = mission.claimed;
            const progressPercent = Math.min(100, (mission.progress / config.target) * 100);

            const card = document.createElement('div');
            card.style.cssText = `
                background: rgba(255,255,255,0.1); border-radius: 20px; padding: 15px;
                display: flex; flex-direction: column; gap: 10px;
                border: 1px solid ${isComplete && !isClaimed ? '#00ffaa' : 'rgba(255,255,255,0.2)'};
                opacity: ${isClaimed ? 0.6 : 1};
                position: relative;
            `;

            const rewardHTML = config.reward === 'hammer' 
                ? `<div style="display: flex; align-items: center; gap: 5px;"><img src="assets/pearl-powerup-sprite-webp.webp" style="width: 24px; height: 24px; filter: hue-rotate(90deg);"> <span style="font-weight: bold; color: #ffd700;">x${config.rewardAmount}</span></div>`
                : `<div style="font-weight: bold; color: #ffd700;">⚪ ${config.reward}</div>`;

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <div style="font-weight: bold; font-size: 1.1rem; color: ${isComplete && !isClaimed ? '#00ffaa' : 'white'};">${config.label}</div>
                        <div style="font-size: 0.8rem; color: #add8e6;">${config.description}</div>
                    </div>
                    <div style="text-align: right;">
                        ${rewardHTML}
                    </div>
                </div>
                
                <div style="width: 100%; height: 10px; background: rgba(0,0,0,0.3); border-radius: 5px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="width: ${progressPercent}%; height: 100%; background: linear-gradient(90deg, #0088ff, #00ffaa); transition: width 0.5s ease-out;"></div>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.75rem; color: #add8e6;">${mission.progress} / ${config.target}</span>
                    ${isClaimed 
                        ? '<span style="color: #ffd700; font-weight: bold; font-size: 0.9rem;">CLAIMED</span>'
                        : isComplete 
                            ? `<button class="claim-mission-btn" data-id="${mission.id}" style="padding: 8px 20px; border-radius: 20px; border: 2px solid white; background: linear-gradient(180deg, #00ffaa, #00cc88); color: black; font-weight: bold; cursor: pointer; box-shadow: 0 4px 10px rgba(0,255,170,0.3); transition: transform 0.1s;">CLAIM</button>`
                            : '<span style="font-size: 0.8rem; color: #aaa; text-transform: uppercase; font-weight: bold;">In Progress</span>'
                    }
                </div>
            `;

            const claimBtn = card.querySelector('.claim-mission-btn');
            if (claimBtn) {
                claimBtn.onclick = (e) => {
                    this.animateRisingBubbles(e.target);
                    if (config.reward !== 'hammer') {
                        this.animatePearlCollection(e.target);
                    }
                    window.dispatchEvent(new CustomEvent('claim-mission', { detail: { id: mission.id } }));
                };
            }

            list.appendChild(card);
        });
    }

    renderPearlBank(packs, currentPearls = 0) {
        const list = document.getElementById('pearl-packs-list');
        if (!list) return;
        list.innerHTML = '';

        // 1. Pearls (IAP)
        const pearlHeader = document.createElement('div');
        pearlHeader.style.cssText = `grid-column: 1 / -1; color: #00ffff; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; border-bottom: 1px solid rgba(0,255,255,0.3); padding-bottom: 5px; margin: 10px 0;`;
        pearlHeader.innerText = "Pearls (IAP)";
        list.appendChild(pearlHeader);

        packs.forEach(pack => {
            const card = document.createElement('div');
            card.className = 'interactive-btn';
            card.style.cssText = `
                background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%); 
                border-radius: 25px; padding: 20px;
                display: flex; flex-direction: column; align-items: center; gap: 10px; 
                border: 2px solid rgba(0,255,255,0.3);
                position: relative; cursor: pointer;
            `;
            
            if (pack.bonus) {
                const bonusTag = document.createElement('div');
                bonusTag.style.cssText = `
                    position: absolute; top: -10px; right: -10px; background: #ffd700; color: black;
                    font-size: 0.6rem; font-weight: bold; padding: 4px 8px; border-radius: 10px;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.3); transform: rotate(15deg);
                `;
                bonusTag.innerText = pack.bonus;
                card.appendChild(bonusTag);
            }

            card.innerHTML += `
                <div style="font-size: 3rem; filter: drop-shadow(0 0 10px #00ffff);">${pack.icon}</div>
                <div style="font-weight: bold; color: white; font-size: 1.2rem;">${pack.amount}</div>
                <div style="font-size: 0.8rem; color: #add8e6; text-transform: uppercase; font-weight: bold;">${pack.name}</div>
                <button style="margin-top: 10px; width: 100%; padding: 8px; border-radius: 15px; border: none; background: #00ffff; color: #001432; font-weight: bold; cursor: pointer;">
                    ${pack.price}
                </button>
            `;

            card.onclick = () => {
                this.showCustomConfirm(
                    "Secure Purchase",
                    `Simulate secure purchase of ${pack.name} for ${pack.price}?`,
                    () => {
                        window.dispatchEvent(new CustomEvent('purchase-pearls', { detail: pack }));
                    }
                );
            };

            list.appendChild(card);
        });

        // 2. Boosters (Pearls)
        import('./config.js').then(module => {
            if (!module.BOOSTER_PACKS) return;
            
            const boosterHeader = document.createElement('div');
            boosterHeader.style.cssText = `grid-column: 1 / -1; color: #ffd700; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; border-bottom: 1px solid rgba(255,215,0,0.3); padding-bottom: 5px; margin: 20px 0 10px 0;`;
            boosterHeader.innerText = "Boosters (Pearls)";
            list.appendChild(boosterHeader);

            module.BOOSTER_PACKS.forEach(pack => {
                const hasEnough = currentPearls >= pack.price;
                const card = document.createElement('div');
                card.className = 'interactive-btn';
                card.style.cssText = `
                    background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%); 
                    border-radius: 25px; padding: 20px;
                    display: flex; flex-direction: column; align-items: center; gap: 10px; 
                    border: 2px solid ${hasEnough ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.1)'};
                    position: relative; cursor: ${hasEnough ? 'pointer' : 'default'};
                    opacity: ${hasEnough ? 1 : 0.7};
                `;

                const isEmoji = !pack.icon.includes('/') && !pack.icon.includes('.');
                let style = `width: 60px; height: 60px; filter: drop-shadow(0 0 10px #ffd700);`;
                if (pack.id === 'hammer') style += ' filter: hue-rotate(90deg);';
                if (pack.id === 'rocketV') style += ' transform: rotate(90deg);';
                
                const iconHTML = isEmoji 
                    ? `<div style="font-size: 3rem; filter: drop-shadow(0 0 10px #ffd700); ${pack.id === 'rocketV' ? 'transform: rotate(90deg);' : ''}">${pack.icon}</div>`
                    : `<img src="${pack.icon}" style="${style}">`;

                card.innerHTML = `
                    ${iconHTML}
                    <div style="font-weight: bold; color: white; font-size: 1.2rem;">+${pack.amount} ${pack.name}</div>
                    <div style="font-size: 0.7rem; color: #add8e6; text-transform: uppercase; font-weight: bold; text-align: center; height: 30px;">${pack.description}</div>
                    <button style="
                        margin-top: 10px; width: 100%; padding: 8px; border-radius: 15px; border: none; 
                        background: ${hasEnough ? '#ffd700' : '#555'}; 
                        color: black; 
                        font-weight: bold; cursor: ${hasEnough ? 'pointer' : 'default'}; 
                        display: flex; align-items: center; justify-content: center; gap: 5px;
                    ">
                        <span>⚪</span> ${pack.price}
                    </button>
                `;

                if (hasEnough) {
                    card.onclick = () => {
                        window.dispatchEvent(new CustomEvent('buy-booster', { detail: pack }));
                    };
                }

                list.appendChild(card);
            });

            // 3. Utility Gadgets (NEW)
            if (module.UTILITY_GADGETS) {
                const gadgetHeader = document.createElement('div');
                gadgetHeader.style.cssText = `grid-column: 1 / -1; color: #00ffff; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; border-bottom: 1px solid rgba(0,255,255,0.3); padding-bottom: 5px; margin: 20px 0 10px 0;`;
                gadgetHeader.innerText = "Abyssal Gadgets";
                list.appendChild(gadgetHeader);

                module.UTILITY_GADGETS.forEach(gadget => {
                    const hasEnough = currentPearls >= gadget.price;
                    const card = document.createElement('div');
                    card.className = 'interactive-btn';
                    card.style.cssText = `
                        background: linear-gradient(135deg, rgba(0,255,255,0.05) 0%, rgba(0,0,0,0.3) 100%); 
                        border-radius: 25px; padding: 20px;
                        display: flex; flex-direction: column; align-items: center; gap: 10px; 
                        border: 2px solid ${hasEnough ? 'rgba(0,255,255,0.4)' : 'rgba(255,255,255,0.1)'};
                        position: relative; cursor: ${hasEnough ? 'pointer' : 'default'};
                        opacity: ${hasEnough ? 1 : 0.7};
                    `;

                    card.innerHTML = `
                        <div style="font-size: 3rem; filter: drop-shadow(0 0 10px #00ffff);">${gadget.icon}</div>
                        <div style="font-weight: bold; color: white; font-size: 1.1rem; text-align: center;">${gadget.name}</div>
                        <div style="font-size: 0.7rem; color: #add8e6; text-transform: uppercase; font-weight: bold; text-align: center; height: 35px; line-height: 1.2;">${gadget.description}</div>
                        <button style="
                            margin-top: 10px; width: 100%; padding: 8px; border-radius: 15px; border: none; 
                            background: ${hasEnough ? '#00ffff' : '#555'}; 
                            color: black; 
                            font-weight: bold; cursor: ${hasEnough ? 'pointer' : 'default'}; 
                            display: flex; align-items: center; justify-content: center; gap: 5px;
                        ">
                            <span>⚪</span> ${gadget.price}
                        </button>
                    `;

                    if (hasEnough) {
                        card.onclick = () => {
                            window.dispatchEvent(new CustomEvent('buy-gadget', { detail: gadget }));
                        };
                    }

                    list.appendChild(card);
                });
            }

            // 4. Energy (Pearls)
            const lifeHeader = document.createElement('div');
            lifeHeader.style.cssText = `grid-column: 1 / -1; color: #ff6666; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; border-bottom: 1px solid rgba(255,100,100,0.3); padding-bottom: 5px; margin: 20px 0 10px 0;`;
            lifeHeader.innerText = "Energy (Pearls)";
            list.appendChild(lifeHeader);

            LIFE_PACKS.forEach(pack => {
                const hasEnough = currentPearls >= pack.price;
                const card = document.createElement('div');
                card.className = 'interactive-btn';
                card.style.cssText = `
                    background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%); 
                    border-radius: 25px; padding: 20px;
                    display: flex; flex-direction: column; align-items: center; gap: 10px; 
                    border: 2px solid ${hasEnough ? 'rgba(255,100,100,0.4)' : 'rgba(255,255,255,0.1)'};
                    position: relative; cursor: ${hasEnough ? 'pointer' : 'default'};
                    opacity: ${hasEnough ? 1 : 0.7};
                `;

                card.innerHTML = `
                    <div style="font-size: 3rem; filter: drop-shadow(0 0 10px #ff6666);">${pack.icon}</div>
                    <div style="font-weight: bold; color: white; font-size: 1.2rem;">+${pack.amount} LIVES</div>
                    <div style="font-size: 0.8rem; color: #ffcccc; text-transform: uppercase; font-weight: bold; text-align: center;">${pack.name}</div>
                    <button class="buy-life-btn" style="
                        margin-top: 10px; width: 100%; padding: 8px; border-radius: 15px; border: none; 
                        background: ${hasEnough ? '#ff6666' : '#555'}; 
                        color: ${hasEnough ? 'white' : '#aaa'}; 
                        font-weight: bold; cursor: ${hasEnough ? 'pointer' : 'default'}; 
                        display: flex; align-items: center; justify-content: center; gap: 5px;
                    ">
                        <span>⚪</span> ${pack.price}
                    </button>
                `;

                if (hasEnough) {
                    card.onclick = () => {
                        window.dispatchEvent(new CustomEvent('buy-lives', { detail: pack }));
                    };
                }

                list.appendChild(card);
            });
        });
    }

    showOutOfLivesModal() {
        this.modalOverlay.style.display = 'flex';
        this.modalOverlay.style.pointerEvents = 'auto';
        this.modalOverlay.innerHTML = `
            <div id="out-of-lives-modal" style="
                background: linear-gradient(180deg, rgba(0, 80, 200, 0.95) 0%, rgba(0, 40, 80, 0.98) 100%);
                padding: 40px; border-radius: 45px; border: 4px solid #fff; 
                display: flex; flex-direction: column; align-items: center; 
                box-shadow: 0 15px 50px rgba(0,0,0,0.6);
                width: 85%; max-width: 380px; backdrop-filter: blur(15px);
                animation: modal-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                text-align: center;
            ">
                <img src="assets/heart-icon.webp" style="width: 100px; height: 100px; margin-bottom: 20px; filter: drop-shadow(0 0 15px rgba(255,255,255,0.5));">
                
                <h2 style="font-size: 1.8rem; margin-bottom: 1rem; color: white; text-shadow: 0 2px 8px rgba(0,0,0,0.3);">Out of Lives?</h2>
                <p style="font-size: 1.1rem; color: #add8e6; margin-bottom: 2.5rem; font-weight: bold;">Watch a short video to get <span style="color: #ff4444;">+5 Hearts</span>!</p>
                
                <div style="display: flex; flex-direction: column; gap: 15px; width: 100%;">
                    <button id="ad-for-life-btn" style="width: 100%; padding: 1.2rem; background: linear-gradient(135deg, #00ffaa, #0088ff); border: none; color: white; font-weight: bold; cursor: pointer; border-radius: 50px; font-size: 1.4rem; box-shadow: 0 8px 20px rgba(0,255,170,0.3); display: flex; align-items: center; justify-content: center; gap: 10px;">
                        <span>📺</span> WATCH VIDEO
                    </button>
                    <button id="no-thanks-btn" style="width: 100%; padding: 0.8rem; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.5); color: white; font-weight: bold; cursor: pointer; border-radius: 50px; font-size: 1.1rem;">NO THANKS</button>
                </div>
            </div>
        `;

        this.modalOverlay.querySelector('#ad-for-life-btn').onclick = () => {
            this.showAdSimulation();
        };

        this.modalOverlay.querySelector('#no-thanks-btn').onclick = () => {
            this.modalOverlay.style.display = 'none';
            this.modalOverlay.style.pointerEvents = 'none';
        };
    }

    showAdSimulation() {
        const adPanel = this.modalOverlay.querySelector('#out-of-lives-modal');
        
        // Mute music during ad
        if (window.gameAudioManager) window.gameAudioManager.muteMusic();

        adPanel.innerHTML = `
            <div style="padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
                <h2 style="font-size: 1.5rem; color: white; margin-bottom: 20px;">WATCHING VIDEO...</h2>
                <div style="width: 100%; height: 200px; background: rgba(0,0,0,0.5); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; border: 2px dashed rgba(255,255,255,0.3);">
                    <img src="assets/neongoldfish-sprite.webp" style="width: 80px; height: 80px; animation: player-swim 2s infinite;">
                </div>
                <div style="width: 100%; height: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; overflow: hidden;">
                    <div id="ad-progress" style="width: 0%; height: 100%; background: #00ffaa; transition: width 0.1s linear;"></div>
                </div>
                <p style="margin-top: 10px; font-size: 0.8rem; color: #add8e6;">Reward in <span id="ad-timer">3</span>s</p>
            </div>
        `;

        const progressEl = adPanel.querySelector('#ad-progress');
        const timerEl = adPanel.querySelector('#ad-timer');
        let timeLeft = 3;
        
        const interval = setInterval(() => {
            timeLeft -= 0.1;
            if (timeLeft <= 0) {
                clearInterval(interval);
                window.dispatchEvent(new CustomEvent('ad-reward-claimed', { detail: { type: 'lives', count: 5 } }));
                this.modalOverlay.style.display = 'none';
                this.modalOverlay.style.pointerEvents = 'none';
            } else {
                if (timerEl) timerEl.innerText = Math.ceil(timeLeft);
                if (progressEl) progressEl.style.width = `${((3 - timeLeft) / 3) * 100}%`;
            }
        }, 100);
    }

    renderStore(pearls, purchasedDecorIds, purchasedHabitatIds = [], activeHabitatId = 'clear_water') {
        const list = document.getElementById('store-list');
        const pearlCount = document.getElementById('store-pearl-count');
        if (!list || !pearlCount) return;
        
        pearlCount.innerText = pearls;
        list.innerHTML = '';
        
        import('./config.js').then(module => {
            const items = this.storeTab === 'decor' ? module.STORE_ITEMS : module.HABITAT_UPGRADES;
            
            items.forEach(item => {
                const isHabitat = item.type === 'habitat';
                const count = isHabitat ? 0 : purchasedDecorIds.filter(id => id === item.id).length;
                const isPurchased = isHabitat ? purchasedHabitatIds.includes(item.id) : false;
                const isActive = isHabitat && activeHabitatId === item.id;

                const card = document.createElement('div');
                card.style.cssText = `
                    background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%); 
                    border-radius: 25px; padding: 15px;
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                    border: 2px solid ${isActive ? '#00ffaa' : isPurchased ? 'rgba(0, 255, 255, 0.4)' : 'rgba(255,255,255,0.1)'};
                    text-align: center; position: relative;
                    transition: transform 0.2s, box-shadow 0.2s;
                `;
                
                const hueRotate = item.hue ? `hue-rotate(${item.hue}deg)` : '';
                const imgStyle = isHabitat ? 'width: 100%; height: 60px; object-fit: cover; border-radius: 10px;' : `width: 60px; height: auto; ${hueRotate}`;

                card.innerHTML = `
                    <div style="width: 100%; height: 80px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.3); border-radius: 15px; overflow: hidden; margin-bottom: 5px;">
                        <img src="${item.sprite}" style="${imgStyle}">
                    </div>
                    <div style="font-weight: bold; font-size: 1rem; color: #fff; text-shadow: 0 1px 4px rgba(0,0,0,0.5);">${item.name}</div>
                    <div style="font-size: 0.65rem; color: #add8e6; height: 32px; line-height: 1.2; display: flex; align-items: center; justify-content: center; padding: 0 5px;">${item.description}</div>
                    
                    ${!isPurchased || !isHabitat ? `
                        <div style="display: flex; align-items: center; gap: 5px; font-weight: bold; color: #ffd700; margin-top: 5px;">
                            <span style="font-size: 1rem;">⚪</span>
                            <span>${item.price}</span>
                        </div>
                    ` : ''}

                    <button class="buy-btn" style="
                        width: 100%; padding: 10px; border-radius: 15px; border: none; margin-top: 8px;
                        background: ${isActive ? 'rgba(255,255,255,0.1)' : (isPurchased || pearls >= item.price) ? 'linear-gradient(135deg, #00ffaa, #00aaff)' : '#444'};
                        color: ${isActive ? '#00ffaa' : (isPurchased || pearls >= item.price) ? 'black' : '#888'};
                        font-weight: 900; cursor: ${isActive ? 'default' : (isPurchased || pearls >= item.price) ? 'pointer' : 'default'};
                        font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px;
                        box-shadow: ${(!isActive && (isPurchased || pearls >= item.price)) ? '0 4px 10px rgba(0,255,170,0.3)' : 'none'};
                    ">
                        ${isActive ? 'ACTIVE' : isPurchased ? 'APPLY' : pearls >= item.price ? 'BUY' : 'NEED PEARLS'}
                    </button>
                    
                    ${!isHabitat ? `<div style="font-size: 0.6rem; color: #ffd700; margin-top: 4px; font-weight: bold; opacity: 0.8;">Owned: ${count}</div>` : ''}
                `;
                
                const btn = card.querySelector('.buy-btn');
                if (!isActive) {
                    if (isPurchased) {
                        btn.onclick = () => {
                            window.dispatchEvent(new CustomEvent('apply-habitat', { detail: { id: item.id } }));
                            window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'pop' }));
                        };
                    } else if (pearls >= item.price) {
                        btn.onclick = () => {
                            this.showCustomConfirm(
                                "Unlock Item",
                                `Purchase ${item.name} for ${item.price} pearls?`,
                                () => {
                                    window.dispatchEvent(new CustomEvent('buy-item', { detail: item }));
                                    window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'chest-open' }));
                                }
                            );
                        };
                    }
                }

                list.appendChild(card);
            });
        });
    }

    showPedigree(traits, speciesName) {
        if (!traits.pedigree) return;

        const overlay = document.createElement('div');
        overlay.className = 'temporary-ui-overlay';
        overlay.style.cssText = `
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85); z-index: 10000;
            display: flex; align-items: center; justify-content: center;
            backdrop-filter: blur(12px); font-family: inherit;
            pointer-events: auto;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            width: 90%; max-width: 400px; 
            background: linear-gradient(180deg, rgba(0, 40, 100, 0.98) 0%, rgba(0, 10, 30, 1) 100%);
            padding: 0; border-radius: 35px; text-align: center; color: white;
            box-shadow: 0 0 50px rgba(0, 255, 255, 0.2), inset 0 0 20px rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.15);
            overflow: hidden;
            animation: modal-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        `;

        const renderContent = (activeTab) => {
            const p = traits.pedigree;
            const fatherName = window.gameFISH_TYPES[p.father]?.name || "Unknown";
            const motherName = window.gameFISH_TYPES[p.mother]?.name || "Unknown";
            const generation = p.generation || 1;

            let tabContent = '';
            if (activeTab === 'lineage') {
                tabContent = `
                    <div style="display: flex; flex-direction: column; gap: 20px; background: rgba(0,255,255,0.03); padding: 25px; border-radius: 25px; border: 1px solid rgba(0,255,255,0.1);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="text-align: left;">
                                <div style="font-size: 0.65rem; color: #00ffff; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Patrilineal Root</div>
                                <div style="font-size: 1.1rem; color: #fff; font-weight: 500;">${fatherName}</div>
                            </div>
                            <div style="font-size: 1.8rem; filter: drop-shadow(0 0 10px rgba(0,255,255,0.3));">🧬</div>
                        </div>
                        <div style="height: 1px; background: linear-gradient(90deg, transparent, rgba(0,255,255,0.2), transparent);"></div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="text-align: left;">
                                <div style="font-size: 0.65rem; color: #00ffff; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Matrilineal Root</div>
                                <div style="font-size: 1.1rem; color: #fff; font-weight: 500;">${motherName}</div>
                            </div>
                            <div style="font-size: 1.8rem; filter: drop-shadow(0 0 10px rgba(0,255,255,0.3));">🧬</div>
                        </div>
                    </div>
                `;
            } else {
                const gTraits = traits.geneticTraits || [];
                tabContent = `
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        ${gTraits.length > 0 ? gTraits.map(tKey => {
                            const t = GENETIC_TRAITS[tKey];
                            return `
                                <div style="display: flex; align-items: center; gap: 15px; background: rgba(0,255,255,0.08); padding: 15px; border-radius: 20px; border: 1px solid rgba(0,255,255,0.2); text-align: left;">
                                    <div style="font-size: 2rem;">${t.icon}</div>
                                    <div style="flex: 1;">
                                        <div style="font-weight: bold; color: #00ffff; font-size: 0.9rem;">${t.name}</div>
                                        <div style="font-size: 0.75rem; color: #add8e6;">${t.description}</div>
                                    </div>
                                </div>
                            `;
                        }).join('') : `
                            <div style="padding: 40px 20px; color: rgba(255,255,255,0.4); font-size: 0.9rem; font-style: italic;">
                                No dominant genetic puzzle traits detected in this specimen.
                            </div>
                        `}
                        
                        <div style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;">
                            ${traits.isHybrid ? `<div class="trait-badge" style="background: linear-gradient(135deg, #ff00ff, #aa00ff); color: white; padding: 6px 15px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;">Hybrid Pulse</div>` : ''}
                            ${traits.isGlowing ? `<div class="trait-badge" style="background: linear-gradient(135deg, #00ffaa, #0088ff); color: black; padding: 6px 15px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;">Bio-Lume</div>` : ''}
                            <div class="trait-badge" style="background: rgba(255,255,255,0.1); color: white; padding: 6px 15px; border-radius: 12px; font-size: 0.75rem;">Speed x${traits.speedMult.toFixed(1)}</div>
                            <div class="trait-badge" style="background: rgba(255,255,255,0.1); color: white; padding: 6px 15px; border-radius: 12px; font-size: 0.75rem;">Size x${traits.sizeMult.toFixed(1)}</div>
                        </div>
                    </div>
                `;
            }

            modal.innerHTML = `
                <div style="padding: 30px 25px 20px 25px;">
                    <div style="font-size: 0.75rem; color: #00ffff; font-weight: bold; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 8px; opacity: 0.8;">Specimen Pedigree</div>
                    <div style="font-size: 2rem; font-weight: 900; margin-bottom: 5px; text-shadow: 0 0 15px rgba(0,170,255,0.5); letter-spacing: -0.5px;">${speciesName}</div>
                    <div style="font-size: 0.85rem; color: #add8e6; margin-bottom: 25px; font-weight: 300;">Genetic Generation <span style="color: #00ffff; font-weight: bold;">#0${generation}</span></div>

                    <div style="display: flex; background: rgba(255,255,255,0.05); border-radius: 15px; padding: 5px; margin-bottom: 25px;">
                        <button id="tab-lineage" style="flex: 1; padding: 10px; border: none; border-radius: 12px; background: ${activeTab === 'lineage' ? 'rgba(255,255,255,0.15)' : 'transparent'}; color: ${activeTab === 'lineage' ? '#fff' : 'rgba(255,255,255,0.5)'}; font-weight: bold; font-size: 0.85rem; cursor: pointer; transition: all 0.2s;">LINEAGE</button>
                        <button id="tab-traits" style="flex: 1; padding: 10px; border: none; border-radius: 12px; background: ${activeTab === 'traits' ? 'rgba(255,255,255,0.15)' : 'transparent'}; color: ${activeTab === 'traits' ? '#fff' : 'rgba(255,255,255,0.5)'}; font-weight: bold; font-size: 0.85rem; cursor: pointer; transition: all 0.2s;">PUZZLE TRAITS</button>
                    </div>

                    <div id="pedigree-tab-content" style="min-height: 200px; animation: fade-in 0.3s ease;">
                        ${tabContent}
                    </div>
                </div>

                <div style="padding: 20px 25px 25px 25px; background: rgba(0,0,0,0.2);">
                    <button id="close-pedigree-btn" class="interactive-btn" style="
                        width: 100%; padding: 18px; background: linear-gradient(135deg, #00ffff, #00aaff); color: #001e4b; 
                        font-weight: 900; border-radius: 20px; border: none; cursor: pointer;
                        font-size: 1rem; text-transform: uppercase; letter-spacing: 1px;
                        box-shadow: 0 5px 15px rgba(0,255,255,0.3);
                    ">DISMISS ANALYSIS</button>
                </div>
            `;

            // Re-attach listeners after re-render
            document.getElementById('tab-lineage').onclick = () => renderContent('lineage');
            document.getElementById('tab-traits').onclick = () => renderContent('traits');
            document.getElementById('close-pedigree-btn').onclick = () => {
                window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'pop' }));
                overlay.remove();
            };
        };

        renderContent('lineage');
        overlay.appendChild(modal);
        this.root.appendChild(overlay);
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    }

    renderAquarium(fishData, collectedIds) {
        const list = document.getElementById('fish-list');
        list.innerHTML = '';
        
        // Filter out powerups for the encyclopedia
        const cleanFishData = Object.values(fishData).filter(f => !f.id.includes('POWERUP'));

        cleanFishData.forEach(fish => {
            const isCollected = collectedIds.has(fish.id);
            const card = document.createElement('div');
            
            const rarityColors = {
                'Common': '#add8e6',
                'Uncommon': '#00ffaa',
                'Rare': '#00aaff',
                'Epic': '#ffd700',
                'Legendary': '#ff00ff'
            };

            const color = isCollected ? (rarityColors[fish.rarity] || '#fff') : '#555';

            card.style.cssText = `
                background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%); 
                border-radius: 25px; padding: 15px;
                display: flex; align-items: center; gap: 20px; 
                border: 2px solid ${isCollected ? color : 'rgba(255,255,255,0.1)'};
                opacity: ${isCollected ? 1 : 0.6};
                box-shadow: ${isCollected ? `0 8px 20px rgba(0,0,0,0.3), inset 0 0 15px ${color}33` : 'none'};
                transition: transform 0.2s;
            `;
            
            card.innerHTML = `
                <div style="
                    width: 90px; height: 90px; background: rgba(0,0,0,0.3); border-radius: 20px; 
                    overflow: hidden; display: flex; align-items: center; justify-content: center;
                    border: 1px solid ${isCollected ? color : 'transparent'};
                ">
                    <img src="${fish.sprite}" style="width: 80%; height: auto; ${isCollected ? '' : 'filter: brightness(0) invert(0.1);'}">
                </div>
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="font-weight: bold; color: ${isCollected ? 'white' : '#888'}; font-size: 1.3rem; letter-spacing: 1px;">
                            ${isCollected ? fish.name : '???'}
                        </div>
                        ${isCollected ? `<span style="font-size: 0.6rem; background: ${color}; color: black; padding: 2px 8px; border-radius: 10px; font-weight: bold; text-transform: uppercase;">${fish.rarity}</span>` : ''}
                    </div>
                    <div style="font-size: 0.75rem; color: ${color}; font-weight: bold; margin-bottom: 5px; opacity: 0.8;">
                        ${isCollected ? 'Species Discovered' : 'Undiscovered'}
                    </div>
                    ${isCollected ? `<div style="font-size: 0.85rem; line-height: 1.4; color: #add8e6; font-style: italic;">"${fish.description}"</div>` : ''}
                </div>
            `;
            
            if (isCollected) {
                card.onmouseenter = () => card.style.transform = 'scale(1.02)';
                card.onmouseleave = () => card.style.transform = 'scale(1)';
            }

            list.appendChild(card);
        });
    }
    
    showSettingsModal() {
        this.modalOverlay.style.display = 'flex';
        this.modalOverlay.style.pointerEvents = 'auto';
        const isMuted = localStorage.getItem('aqua_match_muted') === 'true';
        const initialMusicVol = window.gameAudioManager ? window.gameAudioManager.musicVolume : 100;
        const initialSfxVol = window.gameAudioManager ? window.gameAudioManager.sfxVolume : 100;
        
        this.modalOverlay.innerHTML = `
            <div id="settings-modal" style="
                background: linear-gradient(180deg, #143c6e 0%, #05142d 100%);
                padding: 20px 25px; border-radius: 35px; border: 3px solid #00ffff; 
                display: flex; flex-direction: column; align-items: center; 
                box-shadow: 0 10px 40px rgba(0,0,0,0.6), 0 0 20px rgba(0,255,255,0.25); 
                width: 88%; max-width: 330px;
                max-height: 80vh;
                overflow-y: auto;
                animation: modal-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                text-align: center; backdrop-filter: blur(15px);
                position: relative;
                box-sizing: border-box;
                scrollbar-width: none;
            ">
                <style>
                    #settings-modal::-webkit-scrollbar {
                        display: none;
                    }
                </style>
                <button id="settings-close-x" class="interactive-btn close-x-btn" style="position: absolute; top: 12px; right: 12px; width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg, #ff4444, #cc0000); border: 2px solid white; color: white; font-weight: bold; font-size: 1rem; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 10px rgba(255,0,0,0.4), 0 0 5px rgba(255,255,255,0.5); z-index: 10002;">✕</button>
                <h2 style="font-size: 1.6rem; margin: 5px 0 15px 0; color: white; text-shadow: 0 0 10px #00ffff; letter-spacing: 2px; font-weight: 900;">SETTINGS</h2>
                
                <div style="display: flex; flex-direction: column; gap: 8px; width: 100%; margin-bottom: 15px;">
                    <!-- Leaderboard -->
                    <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.06); padding: 8px 15px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.15); box-sizing: border-box;">
                        <span style="font-size: 0.85rem; font-weight: bold; color: #add8e6; letter-spacing: 0.5px;">RANKING</span>
                        <button id="settings-leaderboard-btn" class="interactive-btn" style="
                            padding: 5px 15px; border-radius: 15px; border: 1.5px solid #ffd700; 
                            background: rgba(255, 215, 0, 0.15); color: #ffd700; font-weight: bold; cursor: pointer;
                            font-size: 0.75rem; letter-spacing: 0.5px;
                        ">VIEW</button>
                    </div>

                    <!-- Sound Master Toggle -->
                    <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.06); padding: 8px 15px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.15); box-sizing: border-box;">
                        <span style="font-size: 0.85rem; font-weight: bold; color: #add8e6; letter-spacing: 0.5px;">AUDIO MUTE</span>
                        <button id="sound-toggle-btn" class="interactive-btn" style="
                            padding: 5px 15px; border-radius: 15px; border: 1.5px solid ${isMuted ? '#ff4444' : '#00ffaa'}; 
                            background: ${isMuted ? 'rgba(255,68,68,0.15)' : 'rgba(0,255,170,0.15)'}; color: ${isMuted ? '#ff6b6b' : '#00ffaa'};
                            font-weight: bold; cursor: pointer; min-width: 65px; text-align: center;
                            font-size: 0.75rem; letter-spacing: 0.5px; transition: all 0.2s;
                        ">
                            ${isMuted ? 'MUTED' : 'ACTIVE'}
                        </button>
                    </div>

                    <!-- Independent Music Volume Slider -->
                    <div style="display: flex; flex-direction: column; gap: 4px; background: rgba(255,255,255,0.06); padding: 8px 15px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.15); text-align: left; box-sizing: border-box;">
                        <div style="display: flex; justify-content: space-between; font-weight: bold; color: #add8e6; font-size: 0.75rem; letter-spacing: 0.5px;">
                            <span>MUSIC VOLUME</span>
                            <span id="music-vol-val" style="color: #00ffff; font-family: monospace;">${initialMusicVol}%</span>
                        </div>
                        <input type="range" id="music-vol-slider" min="0" max="100" value="${initialMusicVol}" style="width: 100%; cursor: pointer; height: 4px; margin: 4px 0; accent-color: #00ffff;">
                    </div>

                    <!-- Independent SFX Volume Slider -->
                    <div style="display: flex; flex-direction: column; gap: 4px; background: rgba(255,255,255,0.06); padding: 8px 15px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.15); text-align: left; box-sizing: border-box;">
                        <div style="display: flex; justify-content: space-between; font-weight: bold; color: #add8e6; font-size: 0.75rem; letter-spacing: 0.5px;">
                            <span>SFX VOLUME</span>
                            <span id="sfx-vol-val" style="color: #00ffff; font-family: monospace;">${initialSfxVol}%</span>
                        </div>
                        <input type="range" id="sfx-vol-slider" min="0" max="100" value="${initialSfxVol}" style="width: 100%; cursor: pointer; height: 4px; margin: 4px 0; accent-color: #00ffff;">
                    </div>

                    <!-- CrazyGames SDK Simulated Mid-roll -->
                    <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.06); padding: 8px 15px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.15); box-sizing: border-box;">
                        <span style="font-size: 0.85rem; font-weight: bold; color: #add8e6; letter-spacing: 0.5px;">MID-ROLL AD</span>
                        <button id="test-ad-btn" class="interactive-btn" style="
                            padding: 5px 15px; border-radius: 15px; border: 1.5px solid #00ffff; 
                            background: rgba(0, 255, 255, 0.15); color: #00ffff; font-weight: bold; cursor: pointer;
                            font-size: 0.75rem; letter-spacing: 0.5px;
                        ">TEST</button>
                    </div>

                    <!-- Reset Data -->
                    <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.06); padding: 8px 15px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.15); box-sizing: border-box;">
                        <span style="font-size: 0.85rem; font-weight: bold; color: #add8e6; letter-spacing: 0.5px;">GAME DATA</span>
                        <button id="reset-data-btn" class="interactive-btn" style="
                            padding: 5px 15px; border-radius: 15px; border: 1.5px solid #ff4444; 
                            background: rgba(255,68,68,0.1); color: #ff6b6b; font-weight: bold; cursor: pointer;
                            font-size: 0.75rem; letter-spacing: 0.5px;
                        ">RESET</button>
                    </div>
                </div>

                <button id="settings-close-btn" class="interactive-btn" style="
                    width: 100%; padding: 0.75rem; 
                    background: linear-gradient(180deg, #00ffaa, #00cc88); 
                    border: 2px solid white; color: black; font-weight: 900; 
                    cursor: pointer; border-radius: 50px; font-size: 1.1rem; 
                    font-family: inherit; box-shadow: 0 4px 15px rgba(0,255,170,0.4);
                    letter-spacing: 1px;
                ">CLOSE</button>
            </div>
        `;

        const soundBtn = this.modalOverlay.querySelector('#sound-toggle-btn');
        const musicSlider = this.modalOverlay.querySelector('#music-vol-slider');
        const sfxSlider = this.modalOverlay.querySelector('#sfx-vol-slider');
        const musicVal = this.modalOverlay.querySelector('#music-vol-val');
        const sfxVal = this.modalOverlay.querySelector('#sfx-vol-val');
        
        this.modalOverlay.querySelector('#settings-close-x').addEventListener('click', () => {
            this.modalOverlay.style.display = 'none';
        });

        this.modalOverlay.querySelector('#settings-leaderboard-btn').addEventListener('click', () => {
            this.modalOverlay.style.display = 'none';
            this.showView('leaderboard');
        });

        this.modalOverlay.querySelector('#test-ad-btn').addEventListener('click', () => {
            this.modalOverlay.style.display = 'none';
            window.dispatchEvent(new CustomEvent('test-midroll-ad'));
        });

        soundBtn.addEventListener('click', () => {
            const newState = window.gameAudioManager.toggleMute();
            this.syncMuteState(newState);
        });

        if (musicSlider) {
            musicSlider.addEventListener('input', (e) => {
                const vol = parseInt(e.target.value);
                if (musicVal) musicVal.innerText = `${vol}%`;
                if (window.gameAudioManager) window.gameAudioManager.setMusicVolume(vol);
            });
        }

        if (sfxSlider) {
            sfxSlider.addEventListener('input', (e) => {
                const vol = parseInt(e.target.value);
                if (sfxVal) sfxVal.innerText = `${vol}%`;
                if (window.gameAudioManager) window.gameAudioManager.setSfxVolume(vol);
            });
        }

        this.modalOverlay.querySelector('#reset-data-btn').addEventListener('click', () => {
            this.showCustomConfirm(
                "Reset Progress",
                "Reset all game progress? This cannot be undone.",
                () => {
                    localStorage.clear();
                    window.location.reload();
                }
            );
        });

        this.modalOverlay.querySelector('#settings-close-btn').addEventListener('click', () => {
            this.modalOverlay.style.display = 'none';
        });
    }

    showDailyGiftModal() {
        this.showDailyRewardCalendar();
    }

    showGiftModal(onClaim) {
        const overlay = document.createElement('div');
        overlay.className = 'temporary-ui-overlay';
        overlay.style.cssText = `
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85); z-index: 10000;
            display: flex; align-items: center; justify-content: center;
            backdrop-filter: blur(8px); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            pointer-events: auto;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            width: 320px; background: linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d);
            padding: 30px; border-radius: 25px; text-align: center; color: white;
            box-shadow: 0 0 50px rgba(253, 187, 45, 0.3), inset 0 0 20px rgba(255,255,255,0.2);
            border: 3px solid rgba(255,255,255,0.3); position: relative;
            animation: modalPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        `;

        const friendNames = ["DeepSeaDiver77", "CoralQueen", "BubbleHunter", "PearlPrincess", "Aquaman_Real"];
        const friend = friendNames[Math.floor(Math.random() * friendNames.length)];

        modal.innerHTML = `
            <div style="font-size: 1.2rem; margin-bottom: 10px; opacity: 0.9;">PEARL CARE-PACKAGE!</div>
            <div style="font-size: 0.9rem; margin-bottom: 20px; font-style: italic;">"Sent with love from your friend <b>${friend}</b>"</div>
            <div style="font-size: 5rem; margin: 20px 0; filter: drop-shadow(0 0 15px white);">🎁</div>
            <div style="font-size: 1.5rem; font-weight: bold; margin-bottom: 5px;">50 PEARLS</div>
            <div style="font-size: 0.8rem; margin-bottom: 25px; opacity: 0.8;">Use these to expand your sanctuary!</div>
            <button id="claim-gift-btn" class="menu-btn" style="width: 100%; background: white; color: #b21f1f; font-weight: bold;">CLAIM GIFT</button>
        `;

        overlay.appendChild(modal);
        this.root.appendChild(overlay);

        document.getElementById('claim-gift-btn').onclick = () => {
            onClaim(50);
            overlay.remove();
        };
    }

    showDailyRewardCalendar() {
        const now = Date.now();
        const nextClaimTime = this.lastGiftTime + (24 * 60 * 60 * 1000);
        const canClaim = !this.isGiftClaimed || now >= nextClaimTime;

        this.modalOverlay.style.display = 'flex';
        this.modalOverlay.style.pointerEvents = 'auto';
        this.modalOverlay.innerHTML = `
            <div id="reward-calendar-modal" style="
                background: rgba(0, 100, 150, 0.4);
                padding: 30px; border-radius: 40px; 
                border: 3px solid #00ffff; 
                display: flex; flex-direction: column; align-items: center; 
                box-shadow: 0 0 40px rgba(0, 255, 255, 0.4), inset 0 0 20px rgba(255,255,255,0.1);
                width: 90%; max-width: 450px; backdrop-filter: blur(15px);
                animation: modal-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                position: relative;
            ">
                <h2 style="font-size: 2.2rem; color: white; margin-bottom: 5px; text-shadow: 0 2px 8px rgba(0, 85, 255, 0.8); letter-spacing: 2px;">DAILY REWARDS</h2>
                <p style="color: #add8e6; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 25px; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">Claim your consecutive bonus!</p>
                
                <div id="calendar-grid" style="
                    display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; width: 100%; margin-bottom: 20px;
                ">
                    <!-- Days 1-6 -->
                </div>

                <!-- Day 7 Mega Reward -->
                <div id="day-7-container" style="width: 100%; margin-bottom: 25px;"></div>

                <button id="calendar-claim-btn" style="
                    width: 100%; padding: 1.2rem; 
                    background: ${canClaim ? 'linear-gradient(180deg, #00ffaa, #00cc88)' : 'rgba(160, 220, 255, 0.15)'};
                    border: 2px solid white; color: ${canClaim ? 'black' : 'rgba(255,255,255,0.8)'};
                    font-weight: bold; cursor: ${canClaim ? 'pointer' : 'default'};
                    border-radius: 50px; font-size: 1.4rem; font-family: inherit;
                    box-shadow: ${canClaim ? '0 8px 20px rgba(0,255,170,0.3)' : '0 0 15px rgba(255,255,255,0.2)'};
                    backdrop-filter: blur(4px);
                    text-shadow: ${canClaim ? 'none' : '0 1px 4px rgba(0,0,0,0.3)'};
                    transition: transform 0.2s, background 0.2s;
                ">${canClaim ? 'CLAIM REWARD' : 'COME BACK TOMORROW'}</button>
                
                <button id="calendar-close-btn" style="margin-top: 15px; background: none; border: none; color: #add8e6; cursor: pointer; text-decoration: underline; font-size: 0.9rem; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">Maybe later</button>
            </div>
        `;

        const grid = this.modalOverlay.querySelector('#calendar-grid');
        const day7Container = this.modalOverlay.querySelector('#day-7-container');
        const claimBtn = this.modalOverlay.querySelector('#calendar-claim-btn');

        DAILY_REWARDS.forEach((reward, i) => {
            const isDay7 = reward.day === 7;
            const isPast = reward.day < this.dailyStreak;
            const isCurrent = reward.day === this.dailyStreak && canClaim;
            const isClaimed = reward.day === this.dailyStreak && !canClaim;
            
            const dayCard = document.createElement('div');
            
            // Common styles for cards with glass effect and bubbles
            const baseCardStyle = `
                border-radius: 20px;
                position: relative; overflow: hidden;
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                backdrop-filter: blur(5px);
                transition: transform 0.2s;
            `;

            if (isDay7) {
                dayCard.style.cssText = baseCardStyle + `
                    background: ${isCurrent ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.05)'};
                    border: 2px solid ${isCurrent ? '#ffd700' : isPast ? '#00ffaa' : 'rgba(255,255,255,0.2)'};
                    padding: 15px; flex-direction: row; justify-content: space-between;
                `;

                const isEmoji = !reward.icon.includes('/');
                const iconHTML = isEmoji 
                    ? `<span style="font-size: 2.5rem; filter: drop-shadow(0 0 10px white);">${reward.icon}</span>`
                    : `<img src="${reward.icon}" style="width: 50px; height: 50px; filter: drop-shadow(0 0 10px white);">`;

                dayCard.innerHTML = `
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-size: 0.7rem; font-weight: bold; color: #ffd700; text-shadow: 0 1px 2px black;">DAY 7 JACKPOT</span>
                        <span style="font-size: 1.1rem; font-weight: bold; color: white; text-shadow: 0 1px 3px rgba(0,85,255,0.8);">MEGA REWARD</span>
                    </div>
                    <div style="position: relative;">
                        <div style="position: absolute; width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 50%; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: -1; filter: blur(5px);"></div>
                        ${iconHTML}
                    </div>
                    ${isPast ? '<div style="position: absolute; top: 5px; right: 5px; font-size: 1.2rem;">✅</div>' : ''}
                `;
                day7Container.appendChild(dayCard);
            } else {
                dayCard.style.cssText = baseCardStyle + `
                    background: ${isCurrent ? 'rgba(0, 255, 170, 0.15)' : 'rgba(255,255,255,0.05)'};
                    border: 2px solid ${isCurrent ? '#00ffaa' : isPast ? '#00ffaa' : 'rgba(255,255,255,0.2)'};
                    padding: 12px 5px; gap: 5px;
                `;

                const isEmoji = !reward.icon.includes('/');
                const iconHTML = isEmoji 
                    ? `<span style="font-size: 1.8rem; filter: drop-shadow(0 0 5px white);">${reward.icon}</span>`
                    : `<img src="${reward.icon}" style="width: 35px; height: 35px; filter: drop-shadow(0 0 5px white);">`;

                dayCard.innerHTML = `
                    <span style="font-size: 0.65rem; font-weight: bold; color: #add8e6; text-transform: uppercase; text-shadow: 0 1px 2px black;">Day ${reward.day}</span>
                    <div style="position: relative; z-index: 1;">
                        <div style="position: absolute; width: 30px; height: 30px; background: rgba(255,255,255,0.15); border-radius: 50%; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: -1; filter: blur(5px); animation: plant-sway 4s infinite;"></div>
                        ${iconHTML}
                    </div>
                    <span style="font-size: 0.75rem; font-weight: bold; color: white; text-shadow: 0 1px 3px rgba(0,85,255,0.8);">${reward.label}</span>
                    ${isPast ? '<div style="position: absolute; top: 5px; right: 5px; font-size: 0.9rem;">✅</div>' : ''}
                    ${isClaimed ? '<div style="position: absolute; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: bold; color: #00ffaa; text-transform: uppercase;">Claimed</div>' : ''}
                `;
                grid.appendChild(dayCard);
            }
            
            if (isCurrent) {
                dayCard.style.animation = 'current-level-pulse 2s infinite alternate';
                dayCard.style.zIndex = '10';
            }
        });

        claimBtn.onclick = () => {
            if (!canClaim) return;
            this.claimDailyReward();
        };

        this.modalOverlay.querySelector('#calendar-close-btn').onclick = () => {
            this.modalOverlay.style.display = 'none';
            this.modalOverlay.style.pointerEvents = 'none';
        };
    }

    claimDailyReward() {
        const reward = DAILY_REWARDS[this.dailyStreak - 1];
        if (!reward) return;

        const claimBtn = this.modalOverlay.querySelector('#calendar-claim-btn');
        if (claimBtn) {
            claimBtn.disabled = true;
            claimBtn.innerText = "CLAIMING...";
            this.animateRisingBubbles(claimBtn);
            if (reward.type === 'pearls' || (reward.type === 'jackpot' && reward.bonus.pearls)) {
                this.animatePearlCollection(claimBtn);
            }
        }

        window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'chest-open' }));

        // Show a little explosion effect on the button
        const burst = document.createElement('div');
        burst.style.cssText = `
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 300px; height: 300px;
            background: radial-gradient(circle, rgba(0,255,170,0.8) 0%, rgba(255,215,0,0) 70%);
            border-radius: 50%; z-index: 100;
            pointer-events: none;
            animation: sparkle-burst 0.8s ease-out forwards;
        `;
        if (claimBtn && claimBtn.parentElement) claimBtn.parentElement.appendChild(burst);

        setTimeout(() => {
            this.isGiftClaimed = true;
            this.lastGiftTime = Date.now();
            
            localStorage.setItem('aqua_match_gift_claimed', 'true');
            localStorage.setItem('aqua_match_last_gift_time', this.lastGiftTime.toString());
            
            // Dispatch rewards
            if (reward.type === 'jackpot') {
                Object.entries(reward.bonus).forEach(([type, count]) => {
                    window.dispatchEvent(new CustomEvent('reward-claimed', { 
                        detail: { type, count } 
                    }));
                });
            } else {
                window.dispatchEvent(new CustomEvent('reward-claimed', { 
                    detail: { type: reward.type, count: reward.amount } 
                }));
            }

            // Update streak for next time
            this.dailyStreak = (this.dailyStreak % 7) + 1;
            localStorage.setItem('aqua_match_daily_streak', this.dailyStreak.toString());

            this.modalOverlay.style.display = 'none';
            this.modalOverlay.style.pointerEvents = 'none';
            this.showComboMessage(`DAY ${reward.day} REWARD!`);
        }, 800);
    }

    updateLives(lives, timerStr = "FULL", progress = 0) {
        const countEl = document.getElementById('lives-count');
        const timerEl = document.getElementById('lives-timer');
        const modalTimerEl = document.getElementById('modal-lives-timer');
        const section = document.getElementById('lives-section');
        const progressEl = document.getElementById('life-refill-progress');
        const progressContainer = document.getElementById('life-refill-bar-container');
        
        if (countEl) countEl.innerText = lives;
        if (timerEl) timerEl.innerText = timerStr;
        if (modalTimerEl) modalTimerEl.innerText = timerStr;
        
        if (progressContainer) progressContainer.style.display = (lives < 25) ? 'block' : 'none';
        if (progressEl) progressEl.style.width = `${progress * 100}%`;
        
        if (section) {
            if (lives < 2) {
                section.classList.add('critical-lives');
                section.style.background = 'linear-gradient(180deg, rgba(255, 100, 100, 0.8) 0%, rgba(200, 0, 0, 0.6) 100%)';
                section.style.borderColor = '#ff4444';
            } else {
                section.classList.remove('critical-lives');
                section.style.background = 'linear-gradient(180deg, rgba(160, 220, 255, 0.7) 0%, rgba(80, 180, 255, 0.5) 100%)';
                section.style.borderColor = 'rgba(255, 255, 255, 0.8)';
            }
        }
    }

    updateShield(turns) {
        const indicator = document.getElementById('shield-indicator');
        const turnsEl = document.getElementById('shield-turns');
        const movesContainer = document.getElementById('moves-container');
        
        if (turns > 0) {
            indicator.style.display = 'flex';
            turnsEl.innerText = turns;
            movesContainer.style.background = 'linear-gradient(90deg, #fff 0%, #ffcc00 100%)';
            movesContainer.style.borderColor = '#ffaa00';
        } else {
            indicator.style.display = 'none';
            movesContainer.style.background = 'rgba(255,255,255,0.9)';
            movesContainer.style.borderColor = '#50b4ff';
        }
    }

    updateActiveBooster(type) {
        const hammer = document.getElementById('hammer-booster');
        const colorBomb = document.getElementById('color-bomb-booster');
        const rocket = document.getElementById('rocket-booster');
        const rocketV = document.getElementById('rocket-v-booster');
        const hint = document.getElementById('booster-hint');
        
        if (hammer) {
            if (type === 'hammer') {
                hammer.style.borderColor = '#00ffff';
                hammer.style.background = 'rgba(0, 255, 255, 0.2)';
                hammer.style.boxShadow = '0 0 15px cyan';
                this.showActiveHint("Select a bubble!");
            } else {
                hammer.style.borderColor = 'rgba(255,255,255,0.1)';
                hammer.style.background = 'rgba(255,255,255,0.05)';
                hammer.style.boxShadow = 'none';
            }
        }

        if (colorBomb) {
            if (type === 'colorBomb') {
                colorBomb.style.borderColor = '#ff00ff';
                colorBomb.style.background = 'rgba(255, 0, 255, 0.2)';
                colorBomb.style.boxShadow = '0 0 15px magenta';
                this.showActiveHint("Select species to sweep!");
            } else {
                colorBomb.style.borderColor = 'rgba(255,255,255,0.1)';
                colorBomb.style.background = 'rgba(255,255,255,0.05)';
                colorBomb.style.boxShadow = 'none';
            }
        }

        if (rocket) {
            if (type === 'rocket') {
                rocket.style.borderColor = '#ff4400';
                rocket.style.background = 'rgba(255, 68, 0, 0.2)';
                rocket.style.boxShadow = '0 0 15px #ff4400';
                this.showActiveHint("Select a row!");
            } else {
                rocket.style.borderColor = 'rgba(255,255,255,0.1)';
                rocket.style.background = 'rgba(255,255,255,0.05)';
                rocket.style.boxShadow = 'none';
            }
        }

        if (rocketV) {
            if (type === 'rocketV') {
                rocketV.style.borderColor = '#00ffaa';
                rocketV.style.background = 'rgba(0, 255, 170, 0.2)';
                rocketV.style.boxShadow = '0 0 15px #00ffaa';
                this.showActiveHint("Select a column!");
            } else {
                rocketV.style.borderColor = 'rgba(255,255,255,0.1)';
                rocketV.style.background = 'rgba(255,255,255,0.05)';
                rocketV.style.boxShadow = 'none';
            }
        }

        if (!type) {
            this.showActiveHint("");
        }
    }

    showActiveHint(text) {
        const hint = document.getElementById('booster-hint');
        if (hint) {
            hint.innerText = text;
            hint.style.opacity = text ? '1' : '0';
        }
    }

    updateBoosters(boosters) {
        const hammerCount = document.getElementById('hammer-count');
        const shuffleCount = document.getElementById('shuffle-count');
        const colorBombCount = document.getElementById('color-bomb-count');
        const rocketCount = document.getElementById('rocket-count');
        const rocketVCount = document.getElementById('rocket-v-count');
        if (hammerCount) hammerCount.innerText = boosters.hammer;
        if (shuffleCount) shuffleCount.innerText = boosters.shuffle;
        if (colorBombCount) colorBombCount.innerText = boosters.colorBomb || 0;
        if (rocketCount) rocketCount.innerText = boosters.rocket || 0;
        if (rocketVCount) rocketVCount.innerText = boosters.rocketV || 0;
    }

    updateHUD(level, score, objectives, moves) {
        const levelInd = document.getElementById('level-indicator');
        const movesInd = document.getElementById('moves-indicator');
        const scoreInd = document.getElementById('score-indicator');
        
        if (levelInd) levelInd.innerText = level ?? '1';
        if (movesInd) movesInd.innerText = moves ?? '0';
        if (scoreInd) scoreInd.innerText = (score ?? 0).toLocaleString();

        // Update Top Match Target Widget
        const topMiniObjIcon = document.getElementById('top-mini-objective-icon');
        const topMiniObjCount = document.getElementById('top-mini-objective-count');
        const topMiniObjContainer = document.getElementById('top-mini-objective');
        
        if (objectives) {
            // Priority: Primary species collection objective
            let collectObj = objectives.find(o => o.isPrimary && o.type === 'collect');
            
            // Fallback to any collection objective if no primary
            if (!collectObj) {
                collectObj = objectives.find(o => o.type === 'collect' || o.type === 'activate_powerup');
            }
            
            if (collectObj) {
                if (topMiniObjContainer) {
                    topMiniObjContainer.style.display = 'flex';
                    // Update border color to a vibrant gold/orange if it's the target
                    topMiniObjContainer.style.borderColor = '#ffaa00';
                    topMiniObjContainer.style.boxShadow = '0 4px 15px rgba(255, 170, 0, 0.4)';
                }
                
                const current = collectObj.current ?? 0;
                const target = collectObj.target ?? 0;
                const remaining = Math.max(0, target - current);
                
                if (topMiniObjIcon && collectObj.icon) topMiniObjIcon.src = collectObj.icon;
                
                if (topMiniObjCount) {
                    topMiniObjCount.innerText = remaining;
                    topMiniObjCount.style.color = (remaining <= 0) ? '#00ffaa' : '#ffd700';
                }
            } else {
                if (topMiniObjContainer) topMiniObjContainer.style.display = 'none';
            }
        }

        // Keep legacy container update if it happens to exist
        const container = document.getElementById('objectives-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (!objectives) return;

        objectives.forEach(obj => {
            const div = document.createElement('div');
            div.style.cssText = `display: flex; align-items: center; gap: 6px; min-width: 60px; justify-content: center;`;
            
            const current = obj.current ?? 0;
            const target = obj.target ?? 0;
            const isComplete = current >= target;

            if (obj.type === 'score') {
                div.innerHTML = `
                    <span style="font-size: 1.1rem; color: #ffd700; ${isComplete ? 'opacity: 0.5;' : ''}">★</span>
                    <span style="font-size: 0.85rem; font-weight: bold; color: ${isComplete ? '#00ffaa' : '#fff'};">${current}/${target}</span>
                `;
            } else if (obj.type === 'collect' || obj.type === 'activate_powerup') {
                div.innerHTML = `
                    <img src="${obj.icon || ''}" style="width: 22px; height: 22px; ${isComplete ? 'opacity: 0.5;' : ''}">
                    <span style="font-size: 0.85rem; font-weight: bold; color: ${isComplete ? '#00ffaa' : '#fff'};">${current}/${target}</span>
                `;
            } else if (obj.type === 'reach_combo') {
                div.innerHTML = `
                    <span style="font-size: 0.7rem; font-weight: bold; color: #00ffaa; text-transform: uppercase;">x${target}</span>
                    <span style="font-size: 0.85rem; font-weight: bold; color: ${isComplete ? '#00ffaa' : '#fff'};">${isComplete ? 'Done' : 'Combo'}</span>
                `;
            }
            container.appendChild(div);
        });
    }

    triggerStageStartSlideIn(level, objectives) {
        if (!objectives) return;

        // Ensure keyframes exist
        if (!document.getElementById('stage-slide-in-style')) {
            const style = document.createElement('style');
            style.id = 'stage-slide-in-style';
            style.textContent = `
                @keyframes stage-slide-in-out {
                    0% { transform: translate(-50%, -50%) translateX(100vw) scale(0.9); opacity: 0; }
                    8% { transform: translate(-50%, -50%) translateX(-4%) scale(1.03); opacity: 1; }
                    10% { transform: translate(-50%, -50%) translateX(0) scale(1); opacity: 1; }
                    88% { transform: translate(-50%, -50%) translateX(0) scale(1); opacity: 1; }
                    90% { transform: translate(-50%, -50%) translateX(4%) scale(1.03); opacity: 1; }
                    100% { transform: translate(-50%, -50%) translateX(-100vw) scale(0.9); opacity: 0; }
                }
                .slide-in-panel-active {
                    animation: stage-slide-in-out 3.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
                }
            `;
            document.head.appendChild(style);
        }

        // Remove any old slide-in panel first
        const oldPanel = document.getElementById('stage-start-panel');
        if (oldPanel) oldPanel.remove();

        // Create new container
        const panel = document.createElement('div');
        panel.id = 'stage-start-panel';
        panel.className = 'slide-in-panel-active';
        panel.style.cssText = `
            position: absolute;
            top: 48%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 88%;
            max-width: 360px;
            background: linear-gradient(135deg, rgba(0, 30, 60, 0.9) 0%, rgba(0, 10, 25, 0.95) 100%);
            border: 3px solid #00ffff;
            border-radius: 35px;
            box-shadow: 0 15px 50px rgba(0, 255, 255, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(15px);
            padding: 30px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 1000000;
            pointer-events: auto;
            cursor: pointer;
            user-select: none;
            text-align: center;
        `;

        // Render title & subtitle
        let objectivesHtml = '';
        objectives.forEach(obj => {
            const current = obj.current ?? 0;
            const target = obj.target ?? 0;
            
            let label = '';
            let iconOrSymbol = '';
            
            if (obj.type === 'score') {
                iconOrSymbol = `<span style="font-size: 2.2rem; color: #ffd700; filter: drop-shadow(0 0 8px rgba(255,215,0,0.6));">★</span>`;
                label = `Score ${target.toLocaleString()}`;
            } else if (obj.type === 'collect' || obj.type === 'activate_powerup') {
                iconOrSymbol = `<img src="${obj.icon || ''}" style="width: 44px; height: 44px; filter: drop-shadow(0 0 10px rgba(0,255,255,0.4));">`;
                label = `Collect ${target}`;
            } else if (obj.type === 'reach_combo') {
                iconOrSymbol = `<span style="font-size: 1.8rem; color: #00ffaa; font-weight: bold; text-transform: uppercase;">x${target}</span>`;
                label = `Combo Target`;
            }

            objectivesHtml += `
                <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; min-width: 90px;">
                    <div style="width: 65px; height: 65px; background: rgba(0,255,255,0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1.5px solid rgba(0,255,255,0.2);">
                        ${iconOrSymbol}
                    </div>
                    <span style="font-size: 0.85rem; font-weight: bold; color: white; letter-spacing: 0.5px;">${label}</span>
                </div>
            `;
        });

        panel.innerHTML = `
            <h3 style="font-size: 1.1rem; color: #00ffff; text-transform: uppercase; letter-spacing: 5px; margin: 0 0 5px 0; font-weight: bold; text-shadow: 0 0 5px rgba(0,255,255,0.5);">STAGE</h3>
            <h2 style="font-size: 3.8rem; color: #fff; margin: 0 0 20px 0; font-weight: 900; font-family: 'Orbitron', sans-serif; text-shadow: 0 0 20px rgba(255,255,255,0.4); line-height: 1;">${level}</h2>
            
            <div style="width: 100%; height: 2px; background: linear-gradient(90deg, transparent, rgba(0,255,255,0.4), transparent); margin-bottom: 25px;"></div>

            <div style="font-size: 0.75rem; color: #add8e6; text-transform: uppercase; letter-spacing: 3px; font-weight: bold; margin-bottom: 18px;">TARGET OBJECTIVES</div>
            
            <div style="display: flex; justify-content: space-around; width: 100%; gap: 15px; margin-bottom: 25px;">
                ${objectivesHtml}
            </div>

            <div style="width: 100%; height: 2px; background: linear-gradient(90deg, transparent, rgba(0,255,255,0.4), transparent); margin-bottom: 18px;"></div>
            
            <div style="font-size: 0.65rem; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 2px; font-weight: bold; animation: pulse 1.5s infinite;">TAP TO SKIP</div>
        `;

        // Dismiss immediately on tap/click
        const dismissPanel = () => {
            panel.style.animation = 'none'; // stop current animation
            void panel.offsetWidth; // trigger reflow
            panel.style.transition = 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
            panel.style.transform = 'translate(-50%, -50%) scale(0.8) translateY(100px)';
            panel.style.opacity = '0';
            panel.style.pointerEvents = 'none';
            setTimeout(() => panel.remove(), 350);
        };
        panel.addEventListener('click', dismissPanel);
        panel.addEventListener('touchstart', dismissPanel, { passive: true });

        // Add to document
        this.root.appendChild(panel);

        // Auto remove after animation completes (3.5 seconds)
        setTimeout(() => {
            if (panel.parentNode) {
                panel.remove();
            }
        }, 3500);
    }

    updateMigrationEvent(active, fishName) {
        const banner = document.getElementById('event-banner');
        const text = document.getElementById('event-text');
        if (banner && text) {
            banner.style.display = active ? 'flex' : 'none';
            if (active) {
                const name = (fishName || 'Target').toUpperCase();
                text.innerText = `${name} INBOUND!`;
                banner.style.animation = 'pulse-critical 2s infinite ease-in-out';
            } else {
                banner.style.animation = 'none';
            }
        }
    }

    updateSessionDepth(depth) {
        const objectivesContainer = document.getElementById('objectives-container');
        if (!objectivesContainer) return;

        let depthDisplay = document.getElementById('session-depth-display');
        if (!depthDisplay) {
            depthDisplay = document.createElement('div');
            depthDisplay.id = 'session-depth-display';
            depthDisplay.style.cssText = `
                display: flex; align-items: center; gap: 8px; border-left: 1px solid rgba(255,255,255,0.3);
                padding-left: 15px; margin-left: 5px; color: #00ffff; font-weight: bold;
            `;
            objectivesContainer.appendChild(depthDisplay);
        }
        const depthVal = depth ?? 0;
        depthDisplay.innerHTML = `<span style="font-size: 0.7rem; color: #add8e6; text-transform: uppercase;">Depth</span> <span style="font-size: 1.2rem;">${depthVal}m</span>`;
    }

    updateCleanliness(percent) {
        const bar = document.getElementById('clean-bar');
        const text = document.getElementById('clean-percent');
        if (bar) bar.style.width = `${percent}%`;
        if (text) text.innerText = `${Math.round(percent)}%`;
        
        if (bar) {
            if (percent < 30) {
                bar.style.background = '#ff4444';
            } else if (percent < 70) {
                bar.style.background = '#ffd700';
            } else {
                bar.style.background = '#00ffaa';
            }
        }
    }

    updateFilterStatus(hasFilter) {
        const filterEl = document.getElementById('filter-status');
        if (filterEl) {
            filterEl.style.display = hasFilter ? 'block' : 'none';
        }
    }

    updateFeederStatus(hasFeeder) {
        const feederEl = document.getElementById('feeder-status');
        if (feederEl) {
            feederEl.style.display = hasFeeder ? 'block' : 'none';
        }
    }

    updateHunger(percent) {
        const bar = document.getElementById('hunger-bar');
        const text = document.getElementById('hunger-percent');
        if (bar) bar.style.width = `${percent}%`;
        if (text) text.innerText = `${Math.round(percent)}%`;
        
        if (bar) {
            if (percent < 30) {
                bar.style.background = '#ff4444';
            } else if (percent < 70) {
                bar.style.background = '#ffd700';
            } else {
                bar.style.background = '#00ffaa';
            }
        }
    }

    showVictory(data) {
        const { score, movesLeft, starThresholds, maxCombo, isNewHighScore, discoveries = [] } = data;
        
        const baseScoreEl = this.successView.querySelector('#base-score-val');
        const bonusRow = this.successView.querySelector('#bonus-moves-row');
        const bonusCountEl = this.successView.querySelector('#bonus-moves-count');
        const bonusValEl = this.successView.querySelector('#bonus-score-val');
        const comboRow = this.successView.querySelector('#max-combo-row');
        const comboValEl = this.successView.querySelector('#max-combo-val');
        const totalScoreEl = this.successView.querySelector('#total-score-val');
        const highScoreBadge = this.successView.querySelector('#new-high-score-badge');
        const starEls = this.successView.querySelectorAll('.victory-star');
        const nextBtn = this.successView.querySelector('#victory-next-btn');

        // New Discoveries Container
        const discoveriesContainer = this.successView.querySelector('#victory-discoveries-container');
        discoveriesContainer.innerHTML = '';
        discoveriesContainer.style.cssText = `
            width: 100%; display: flex; flex-direction: column; align-items: center; gap: 8px; margin-bottom: 20px;
        `;
        
        // Reset state
        starEls.forEach(s => {
            s.style.color = 'rgba(255, 255, 255, 0.1)';
            s.style.textShadow = 'none';
            s.style.transform = 'scale(0.5)';
            s.style.opacity = '0';
        });
        bonusRow.style.opacity = '0';
        comboRow.style.opacity = '0';
        highScoreBadge.style.display = 'none';
        baseScoreEl.innerText = '0';
        bonusValEl.innerText = '+0';
        comboValEl.innerText = 'x0';
        totalScoreEl.innerText = '0';
        nextBtn.style.transform = 'scale(0)';

        this.showView('success');

        const bonusScore = movesLeft * 500;
        const totalScore = score + bonusScore;

        // Calculate stars based on score vs thresholds
        let stars = 0;
        if (totalScore >= starThresholds[2]) stars = 3;
        else if (totalScore >= starThresholds[1]) stars = 2;
        else if (totalScore >= starThresholds[0]) stars = 1;
        else stars = 1; 

        // Animation Sequence
        let currentTotal = 0;

        // 1. Count up base score
        this.animateValue(baseScoreEl, 0, score, 800, () => {
            currentTotal = score;
            totalScoreEl.innerText = currentTotal.toLocaleString();

            // 2. Show max combo if any
            setTimeout(() => {
                if (maxCombo > 1) {
                    comboRow.style.opacity = '1';
                    comboValEl.innerText = `x${maxCombo}`;
                }

                // 3. Show bonus moves if any
                if (movesLeft > 0) {
                    setTimeout(() => {
                        bonusRow.style.opacity = '1';
                        bonusCountEl.innerText = movesLeft;
                        this.animateValue(bonusValEl, 0, bonusScore, 600, () => {
                            currentTotal = totalScore;
                            totalScoreEl.innerText = currentTotal.toLocaleString();
                            if (isNewHighScore) highScoreBadge.style.display = 'block';
                            this.handleDiscoveries(discoveries, discoveriesContainer, () => {
                                this.animateStars(stars, starEls, nextBtn);
                            });
                        }, '+');
                    }, 400);
                } else {
                    if (isNewHighScore) highScoreBadge.style.display = 'block';
                    this.handleDiscoveries(discoveries, discoveriesContainer, () => {
                        this.animateStars(stars, starEls, nextBtn);
                    });
                }
            }, 300);
        });
    }

    handleDiscoveries(discoveries, container, callback) {
        if (!discoveries || discoveries.length === 0) {
            callback();
            return;
        }

        const title = document.createElement('div');
        title.style.cssText = `font-size: 0.8rem; color: #ffd700; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;`;
        title.innerText = "New Species Discovered!";
        container.appendChild(title);

        const list = document.createElement('div');
        list.style.cssText = `display: flex; gap: 15px; justify-content: center; margin-top: 10px;`;
        container.appendChild(list);

        discoveries.forEach((id, i) => {
            const fish = window.gameFISH_TYPES[id];
            if (!fish) return;

            const item = document.createElement('div');
            item.style.cssText = `
                width: 60px; height: 60px; background: rgba(255,215,0,0.2); 
                border-radius: 50%; border: 2px solid #ffd700; display: flex; 
                align-items: center; justify-content: center; position: relative;
                transform: scale(0); opacity: 0; transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            `;
            item.innerHTML = `<img src="${fish.sprite}" style="width: 40px; height: 40px; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.3));">`;
            list.appendChild(item);

            setTimeout(() => {
                item.style.transform = 'scale(1)';
                item.style.opacity = '1';
                window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'star' }));
            }, 300 + i * 300);
        });

        setTimeout(callback, 500 + discoveries.length * 300);
    }

    animateStars(count, elements, nextBtn) {
        elements.forEach((star, i) => {
            if (i < count) {
                setTimeout(() => {
                    star.style.opacity = '1';
                    star.style.transform = 'scale(1)';
                    star.style.color = '#ffd700';
                    star.style.textShadow = '0 0 20px rgba(255,215,0,0.8)';
                    window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'star' }));
                    
                    if (i === count - 1) {
                        setTimeout(() => {
                            nextBtn.style.transform = 'scale(1)';
                            const shareBtn = this.successView.querySelector('#victory-share-btn');
                            if (shareBtn) shareBtn.style.transform = 'scale(1)';
                        }, 500);
                    }
                }, 500 + i * 400);
            }
        });
    }

    showComboMessage(combo) {
        if (typeof combo === 'string') {
            const el = document.createElement('div');
            el.className = 'combo-message';
            el.innerText = combo;
            el.style.textAlign = 'center';
            this.root.appendChild(el);
            setTimeout(() => el.remove(), 1500);
            return;
        }

        if (combo < 2) return;
        
        const messages = {
            2: "GREAT!",
            3: "AMAZING!!",
            4: "EXCELLENT!!!",
            5: "UNBELIEVABLE!!!!"
        };
        
        const text = messages[Math.min(combo, 5)];
        const el = document.createElement('div');
        el.className = 'combo-message';
        el.innerText = `${text}\nx${combo}`;
        el.style.textAlign = 'center';
        this.root.appendChild(el);
        
        setTimeout(() => el.remove(), 1000);
    }

    addBiomeEffects(container, biomeIndex, topOffset, biomeConfig) {
        // Add Parallax Background Layers
        const layerCount = 3;
        const biomeHeight = 11000;

        for (let l = 0; l < layerCount; l++) {
            const bgLayer = document.createElement('div');
            bgLayer.className = `biome-bg-layer layer-${l}`;
            // Use background-repeat and contain/100% width to avoid stretching vertically
            bgLayer.style.cssText = `
                position: absolute; left: 0; width: 100%; height: ${biomeHeight}px;
                top: ${topOffset}px; z-index: 0; pointer-events: none;
                background: url('${biomeConfig.bg}') left top / 100% auto repeat-y;
                opacity: ${l === 0 ? 0.8 : 0.3 + (l * 0.15)};
                filter: blur(${l * 2}px) ${biomeIndex > 4 ? 'brightness(0.6)' : ''};
            `;
            container.appendChild(bgLayer);
            this.parallaxLayers.push({ element: bgLayer, speed: 0.15 + (l * 0.2), baseTop: topOffset });
        }

        // Add Atmospheric Tint Layer (Deepening effect)
        const tint = document.createElement('div');
        tint.style.cssText = `
            position: absolute; left: 0; width: 100%; height: ${biomeHeight}px;
            top: ${topOffset}px; z-index: 1; pointer-events: none;
            background: linear-gradient(to bottom, 
                rgba(0, 50, 100, ${biomeIndex * 0.08}), 
                rgba(0, 20, 50, ${(biomeIndex + 1) * 0.08})
            );
        `;
        container.appendChild(tint);
        
        // Add Bubbles
        const bubbleCount = [25, 30, 20, 15, 10, 30, 15, 40, 20, 10][biomeIndex] || 20;
        
        for (let i = 0; i < bubbleCount; i++) {
            const bubble = document.createElement('div');
            bubble.className = 'map-bubble';
            const size = 15 + Math.random() * 25;
            bubble.style.cssText = `
                width: ${size}px; height: ${size}px;
                background: url('assets/realistic-crystal-bubble-v2.webp') center/contain no-repeat;
                left: ${Math.random() * 100}%;
                top: ${topOffset + Math.random() * biomeHeight}px;
                animation-duration: ${6 + Math.random() * 6}s;
                animation-delay: -${Math.random() * 10}s;
                filter: ${biomeIndex >= 3 ? `hue-rotate(${biomeIndex * 36}deg) brightness(1.5)` : 'none'};
                opacity: 0.4;
            `;
            container.appendChild(bubble);
        }

        // Fish Schools Deleted completely from game background as requested
    }

    animateValue(obj, start, end, duration, callback, prefix = '') {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const val = Math.floor(progress * (end - start) + start);
            obj.innerText = prefix + val.toLocaleString();
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else if (callback) {
                callback();
            }
        };
        window.requestAnimationFrame(step);
    }

    updateCommunityGoal(current, target) {
        const percent = Math.min(100, Math.floor((current / target) * 100));
        const fill = document.getElementById('community-progress-fill');
        const text = document.getElementById('community-percent');
        if (fill) fill.style.width = `${percent}%`;
        if (text) text.innerText = `${percent}%`;
    }

    showBreedingAlert(traits, speciesName = "Baby Fish") {
        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed; top: 150px; left: 50%; transform: translateX(-50%);
            display: flex; flex-direction: column; align-items: center; gap: 10px;
            pointer-events: none; z-index: 10005;
        `;
        
        const title = document.createElement('div');
        title.style.cssText = `
            font-size: 1.5rem; font-weight: bold; color: #fff;
            text-shadow: 0 0 15px gold; text-transform: uppercase;
            letter-spacing: 2px; animation: trait-pop 0.5s forwards;
        `;
        title.innerText = `New ${speciesName}!`;
        container.appendChild(title);

        const badge = document.createElement('div');
        badge.className = 'trait-badge';
        if (traits.rarity === 'ultra-rare') {
            badge.style.background = 'linear-gradient(90deg, #ff00ff, #00ffff)';
            badge.style.color = 'white';
            badge.style.border = '2px solid white';
            badge.style.boxShadow = '0 0 20px #ff00ff';
            badge.innerText = '💎 ULTRA RARE';
        } else if (traits.rarity === 'rare') {
            badge.style.background = '#ffd700';
            badge.style.color = '#000';
            badge.innerText = '⭐ RARE';
        } else {
            badge.style.background = 'rgba(255,255,255,0.2)';
            badge.style.color = '#fff';
            badge.innerText = 'COMMON';
        }
        container.appendChild(badge);

        if (traits.pattern) {
            const patternBadge = document.createElement('div');
            patternBadge.className = 'trait-badge';
            patternBadge.style.background = '#00ffff';
            patternBadge.style.color = '#000';
            patternBadge.innerText = '🧬 HYBRID PATTERN';
            container.appendChild(patternBadge);
        }

        this.root.appendChild(container);

        // Spawn DNA particles in UI
        for (let i = 0; i < 6; i++) {
            const dna = document.createElement('div');
            dna.className = 'dna-particle';
            dna.innerText = traits.rarity === 'ultra-rare' ? '🌈' : (traits.pattern ? '🧬' : '✨');
            dna.style.left = `calc(50% + ${(Math.random() - 0.5) * 100}px)`;
            dna.style.top = `180px`;
            dna.style.animationDelay = `${i * 0.2}s`;
            this.root.appendChild(dna);
            setTimeout(() => dna.remove(), 2500);
        }

        setTimeout(() => {
            container.style.opacity = '0';
            container.style.transition = 'opacity 0.8s';
            setTimeout(() => container.remove(), 800);
        }, 3000);
    }

    showAdPauseOverlay(active) {
        let overlay = document.getElementById('ad-pause-overlay');
        if (active) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'ad-pause-overlay';
                overlay.style.cssText = `
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0, 10, 30, 0.95); z-index: 300000;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    pointer-events: auto; backdrop-filter: blur(15px);
                    animation: fade-in 0.3s ease-out forwards;
                `;
                overlay.innerHTML = `
                    <div style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 20px; width: 85%; max-width: 320px;">
                        <div style="font-size: 5rem; animation: fish-float 3s ease-in-out infinite;">📺</div>
                        <h2 style="font-size: 1.8rem; color: #00ffff; text-shadow: 0 0 15px #00ffff; margin: 0; text-transform: uppercase; letter-spacing: 2px;">Ad Active</h2>
                        <p style="color: #add8e6; font-size: 1rem; line-height: 1.4; margin: 0;">Audio is muted and gameplay paused.<br>We will resume in a moment...</p>
                        
                        <div style="width: 40px; height: 40px; border: 4px solid rgba(0,255,255,0.1); border-top: 4px solid #00ffff; border-radius: 50%; animation: spin 1s linear infinite; margin-top: 10px;"></div>
                    </div>
                    <style>
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    </style>
                `;
                this.root.appendChild(overlay);
            } else {
                overlay.style.display = 'flex';
            }
        } else {
            if (overlay) {
                overlay.remove();
            }
        }
    }

    resetGameOverAdState() {
        const btn = this.gameOverView.querySelector('#double-coins-btn');
        const rewardAmount = this.gameOverView.querySelector('#game-over-reward-amount');
        if (rewardAmount) {
            rewardAmount.innerText = '15';
            rewardAmount.style.color = '#ffd700';
            rewardAmount.style.textShadow = '0 0 8px rgba(255,215,0,0.4)';
        }
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.background = 'linear-gradient(180deg, #ffd700, #ffaa00)';
            btn.style.color = 'black';
            btn.style.cursor = 'pointer';
            btn.innerHTML = '<span>🎥</span> DOUBLE COINS (+15 ⚪)';
        }
    }

    onDoubleCoinsAdSuccess() {
        const btn = this.gameOverView.querySelector('#double-coins-btn');
        const rewardAmount = this.gameOverView.querySelector('#game-over-reward-amount');
        if (rewardAmount) {
            rewardAmount.innerText = '30';
            rewardAmount.style.color = '#00ffaa';
            rewardAmount.style.textShadow = '0 0 12px rgba(0,255,170,0.6)';
        }
        if (btn) {
            btn.disabled = true;
            btn.style.opacity = '0.8';
            btn.style.background = 'linear-gradient(180deg, #00ffaa, #00cc88)';
            btn.style.color = 'black';
            btn.style.cursor = 'default';
            btn.innerHTML = '<span>✅</span> COINS DOUBLED!';
        }
    }

    onDoubleCoinsAdFailure() {
        const btn = this.gameOverView.querySelector('#double-coins-btn');
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.innerHTML = '<span>❌</span> TRY AGAIN';
            setTimeout(() => {
                this.resetGameOverAdState();
            }, 2000);
        }
    }

    showCustomConfirm(title, message, onConfirm, onCancel = null) {
        if (!this.confirmOverlay) return;

        this.confirmOverlay.style.display = 'flex';
        this.confirmOverlay.style.pointerEvents = 'auto';

        this.confirmOverlay.innerHTML = `
            <div style="
                background: linear-gradient(180deg, #001e4b 0%, #000a20 100%);
                padding: 30px; border-radius: 35px; border: 3px solid #00ffff; 
                display: flex; flex-direction: column; align-items: center; 
                box-shadow: 0 10px 40px rgba(0, 255, 255, 0.25), inset 0 0 15px rgba(255,255,255,0.1);
                width: 85%; max-width: 360px; backdrop-filter: blur(20px);
                animation: modal-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                box-sizing: border-box; text-align: center;
                pointer-events: auto;
            ">
                <div style="font-size: 3rem; margin-bottom: 12px; filter: drop-shadow(0 2px 8px rgba(0,255,255,0.4));">❓</div>
                <h3 style="font-size: 1.6rem; color: #00ffff; text-shadow: 0 0 10px rgba(0,255,255,0.5); margin: 0 0 10px 0; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px;">${title}</h3>
                <p style="font-size: 1rem; color: #add8e6; margin: 0 0 25px 0; line-height: 1.4; font-weight: bold;">${message}</p>
                
                <div style="display: flex; gap: 15px; width: 100%;">
                    <button id="confirm-cancel-btn" class="interactive-btn" style="flex: 1; padding: 0.9rem; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3); color: white; cursor: pointer; border-radius: 50px; font-weight: bold; font-family: inherit; font-size: 1.05rem; transition: background 0.2s;">CANCEL</button>
                    <button id="confirm-ok-btn" class="interactive-btn" style="flex: 1; padding: 0.9rem; background: linear-gradient(180deg, #00ffaa, #00cc88); border: 2px solid white; color: black; font-weight: 900; cursor: pointer; border-radius: 50px; font-size: 1.05rem; font-family: inherit; box-shadow: 0 4px 12px rgba(0,255,170,0.3); transition: transform 0.1s;">CONFIRM</button>
                </div>
            </div>
        `;

        const closeConfirm = () => {
            this.confirmOverlay.style.display = 'none';
            this.confirmOverlay.style.pointerEvents = 'none';
        };

        this.confirmOverlay.querySelector('#confirm-cancel-btn').onclick = () => {
            closeConfirm();
            if (onCancel) onCancel();
        };

        this.confirmOverlay.querySelector('#confirm-ok-btn').onclick = () => {
            closeConfirm();
            if (onConfirm) onConfirm();
        };
    }
}
