/* 
 * PROJECT: AQUA MATCH PUZZLE
 * DEVELOPER: Emad Ibrahim
 * STUDIO: NexApp Development Studio
 * COPYRIGHT: © 2026 NexApp. All Rights Reserved.
 */

import * as THREE from 'three';
import { BubblePiece } from './BubblePiece.js';
import { FISH_TYPES } from './config.js';
import { Board } from './Board.js';

export class Grid {
    constructor(config, worldSize, scene) {
        this.config = config;
        this.worldSize = worldSize;
        this.scene = scene;
        this.gridSize = config.gridSize;
        this.availableTypes = config.availableTypes;
        
        this.textureLoader = new THREE.TextureLoader();
        this.bubbleTexture = this.textureLoader.load('assets/realistic-crystal-bubble-v2.webp');
        
        this.board = new Board(this.gridSize, config.layout);
        this.grid = this.board.grid; // Link to the logic grid
        this.pieces = [];
        this.particleSystems = [];
        
        this.selectedPiece = null;
        this.isProcessing = false;
        this.isProcessingPowerUp = false;
        this.comboCount = 0;
        this.isFreeSwapActive = false;
        this.cascadeDepth = 0;
        
        
        // No backing panel: the icons appear on their own without a transparent background
        this.backingPlane = null;
        
        this.setupGrid();
        this.setupIndicator();
        this.setupDarknessOverlay();
        this.setupWeather();
        this.setupAmbientWildlife();
    }
    
    setupAmbientWildlife() {
        // Disabled: completely delete the group of fish floating in the background of the game
        this.ambientWildlife = [];
        return;
    }

    updateAmbientWildlife(delta, time) {
        return;
    }

    setupWeather() {
        const weather = this.config.biome.weather;
        if (!weather) return;

        this.weatherParticles = [];
        const count = 40;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        const vel = [];

        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 15;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 15;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 5;
            
            vel.push(new THREE.Vector3(
                (Math.random() - 0.5) * 0.01,
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.01
            ));
        }

        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        
        let color = 0xddeeff; // Watery white/blue
        let size = 0.1;
        let texture = this.bubbleTexture;

        if (weather === 'snow') {
            color = 0xffffff;
            size = 0.15;
        } else if (weather === 'ash') {
            color = 0x444444;
            size = 0.12;
        } else if (weather === 'plankton') {
            color = 0x00ffaa;
            size = 0.08;
        } else if (weather === 'biolume') {
            color = 0x00ffff;
            size = 0.1;
        } else if (weather === 'glowing_spores') {
            color = 0xff00ff;
            size = 0.15;
        } else if (weather === 'bubbles') {
            color = 0xccffff;
            size = 0.1;
        } else if (weather === 'debris') {
            color = 0x886644;
            size = 0.2;
        } else if (weather === 'void_particles') {
            color = 0x440066; // Dark purple
            size = 0.12;
        }

        const mat = new THREE.PointsMaterial({
            color: color,
            size: size,
            transparent: true,
            opacity: 0.25, // More transparent
            map: texture,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.weatherSystem = new THREE.Points(geo, mat);
        this.weatherSystem.userData.velocities = vel;
        this.scene.add(this.weatherSystem);
    }

    updateWeather(delta, time) {
        if (!this.weatherSystem) return;

        const posAttr = this.weatherSystem.geometry.attributes.position;
        const vels = this.weatherSystem.userData.velocities;
        const weather = this.config.biome.weather;

        for (let i = 0; i < vels.length; i++) {
            const v = vels[i];
            
            // Apply specific weather physics
            if (weather === 'snow') {
                v.y = -0.015 - Math.random() * 0.01;
                v.x = Math.sin(time + i) * 0.005;
            } else if (weather === 'ash') {
                v.y = 0.01 + Math.random() * 0.01;
                v.x = Math.sin(time * 0.5 + i) * 0.01;
            } else if (weather === 'bubbles') {
                v.y = 0.03 + Math.random() * 0.02;
            } else if (weather === 'void_particles') {
                v.y = (Math.random() - 0.5) * 0.01;
                v.x = Math.sin(time * 0.2 + i) * 0.005;
            }

            posAttr.array[i * 3] += v.x;
            posAttr.array[i * 3 + 1] += v.y;
            posAttr.array[i * 3 + 2] += v.z;

            // Wrap around
            if (posAttr.array[i * 3 + 1] < -8) posAttr.array[i * 3 + 1] = 8;
            if (posAttr.array[i * 3 + 1] > 8) posAttr.array[i * 3 + 1] = -8;
            if (posAttr.array[i * 3] < -10) posAttr.array[i * 3] = 10;
            if (posAttr.array[i * 3] > 10) posAttr.array[i * 3] = -10;
        }
        posAttr.needsUpdate = true;
    }

    async tickHazards() {
        const hazard = this.config.biome.hazard;
        if (!hazard) return;

        // Hazards trigger every 3 turns on average in standard biomes, 
        // but more frequently in the Abyss.
        const triggerChance = this.config.level > 500 ? 0.4 : 0.2;
        if (Math.random() > triggerChance) return;

        // CHECK FOR DEFLECTOR GADGET
        const deflectorEvent = new CustomEvent('check-hazard-deflector', { 
            detail: { hazard: hazard },
            cancelable: true 
        });
        window.dispatchEvent(deflectorEvent);

        if (deflectorEvent.defaultPrevented) {
            console.log("Hazard deflected by gadget!");
            this.uiPulseMessage("HAZARD DEFLECTED!");
            return;
        }

        console.log(`Hazard triggered: ${hazard}`);
        
        // Find if there's a guardian to perform the casting animation
        const guardian = this.pieces.find(p => p.isGuardian);
        if (guardian) {
            await guardian.castHazard(this.config.biome.name);
            window.dispatchEvent(new CustomEvent('camera-shake', { detail: { intensity: 0.4 } }));
        }
        
        switch(hazard) {
            case 'freeze':
                await this.applyFreezeHazard();
                break;
            case 'magma':
                await this.applyMagmaHazard();
                break;
            case 'ink':
                await this.applyInkHazard();
                break;
            case 'pulse':
                await this.applyPulseHazard();
                break;
            case 'crush':
                await this.applyCrushHazard();
                break;
        }
    }

    async applyFreezeHazard() {
        // Freeze 1-2 random pieces
        const count = 1 + Math.floor(Math.random() * 2);
        let frozen = 0;
        const attempts = 20;
        for (let i = 0; i < attempts && frozen < count; i++) {
            const r = Math.floor(Math.random() * this.gridSize);
            const c = Math.floor(Math.random() * this.gridSize);
            const p = this.grid[r][c];
            if (p && !p.isPowerUp && !p.hasIce && !p.hasFrozen && !p.isGuardian) {
                if (this.checkResilience(p)) continue;
                p.setFrozen(true);
                p.onWiggle();
                frozen++;
            }
        }
        if (frozen > 0) {
            window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'ice_crack' }));
            this.uiPulseMessage("FROST BITE!");
        }
    }

    async applyMagmaHazard() {
        // Spawn a magma stone
        const r = Math.floor(Math.random() * this.gridSize);
        const c = Math.floor(Math.random() * this.gridSize);
        const p = this.grid[r][c];
        if (p && !p.isPowerUp && !p.isGuardian && !p.isStone) {
            if (this.checkResilience(p)) return;
            // Visual Effect: Volcanic Burst
            this.createMagmaBurst(p.position);
            
            // Transform into stone
            p.setWeight(true); // Weights look like heavy volcanic stones
            p.onWiggle();
            window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'stone_break' }));
            this.uiPulseMessage("MAGMA SURGE!");
        }
    }

    createMagmaBurst(position) {
        const count = 30;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        const vel = [];
        
        for (let i = 0; i < count; i++) {
            pos[i * 3] = position.x;
            pos[i * 3 + 1] = position.y;
            pos[i * 3 + 2] = position.z;
            
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.1 + Math.random() * 0.2;
            vel.push(new THREE.Vector3(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                Math.random() * 0.1
            ));
        }
        
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({
            color: 0xff4400,
            size: 0.2,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending
        });
        
        const particles = new THREE.Points(geo, mat);
        particles.userData.velocities = vel;
        particles.userData.life = 1.0;
        this.scene.add(particles);
        this.particleSystems.push(particles);
    }

    async applyInkHazard() {
        // Obscure the grid with ink for 2 seconds
        this.uiPulseMessage("INK CLOUD!");
        window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'pop' }));
        
        // Find guardian to emit ink from
        const guardian = this.pieces.find(p => p.isGuardian);
        if (guardian) {
            this.createInkCloudEffect(guardian.position);
        }

        const inkOverlay = document.createElement('div');
        inkOverlay.style.position = 'absolute';
        inkOverlay.style.top = '0';
        inkOverlay.style.left = '0';
        inkOverlay.style.width = '100%';
        inkOverlay.style.height = '100%';
        inkOverlay.style.backgroundColor = 'rgba(0,0,0,0.85)';
        inkOverlay.style.pointerEvents = 'none';
        inkOverlay.style.zIndex = '10';
        inkOverlay.style.transition = 'opacity 2s ease-out';
        inkOverlay.style.backdropFilter = 'blur(15px)';
        inkOverlay.style.backgroundImage = 'radial-gradient(circle at center, transparent 30%, black 90%)';
        document.body.appendChild(inkOverlay);
        
        setTimeout(() => {
            inkOverlay.style.opacity = '0';
            setTimeout(() => inkOverlay.remove(), 2000);
        }, 1500);
    }

    createInkCloudEffect(position) {
        const count = 50;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        const vel = [];
        
        for (let i = 0; i < count; i++) {
            pos[i * 3] = position.x;
            pos[i * 3 + 1] = position.y;
            pos[i * 3 + 2] = position.z;
            
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.05 + Math.random() * 0.1;
            vel.push(new THREE.Vector3(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                0
            ));
        }
        
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({
            color: 0x001100,
            size: 1.5,
            transparent: true,
            opacity: 0.6,
            depthWrite: false
        });
        
        const particles = new THREE.Points(geo, mat);
        particles.userData.velocities = vel;
        particles.userData.life = 2.0;
        this.scene.add(particles);
        this.particleSystems.push(particles);
    }

    async applyPulseHazard() {
        // Change colors of random group
        const r = Math.floor(Math.random() * (this.gridSize - 1));
        const c = Math.floor(Math.random() * (this.gridSize - 1));
        const affected = [];
        for (let i = r; i <= r + 1; i++) {
            for (let j = c; j <= c + 1; j++) {
                const p = this.grid[i][j];
                if (p && !p.isPowerUp && !p.isGuardian) affected.push(p);
            }
        }
        if (affected.length > 0) {
            this.uiPulseMessage("GLOW PULSE!");
            window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'zap' }));
            const newType = this.availableTypes[Math.floor(Math.random() * this.availableTypes.length)];
            affected.forEach(p => {
                p.fishConfig = newType;
                p.updateSprite();
                p.onWiggle();
                this.createColorBeam(p.position, p.position.clone().add({x:0,y:0.5,z:0}), 0xff00ff);
            });
        }
    }

    async applyCrushHazard() {
        // Deep sea pressure: random pieces get cracks (takes 2 hits to clear)
        // ENDGAME SCALING: Increase count for late Hadal Void (900+)
        const count = this.config.level > 900 ? 3 : 2;
        let applied = 0;
        for (let i = 0; i < 20 && applied < count; i++) {
            const r = Math.floor(Math.random() * this.gridSize);
            const c = Math.floor(Math.random() * this.gridSize);
            const p = this.grid[r][c];
            if (p && !p.isPowerUp && !p.isGuardian && !p.hasPressureCrack) {
                if (this.checkResilience(p)) continue;
                p.setPressureCrack(true);
                p.onWiggle();
                applied++;
            }
        }
        if (applied > 0) {
            this.uiPulseMessage("VOID CRUSH!");
            window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'ice_crack' }));
        }
    }

    checkResilience(piece) {
        if (!piece || !piece.fishConfig) return false;
        const resilientSpecies = this.config.resilientSpecies;
        if (resilientSpecies && resilientSpecies.has(piece.fishConfig.id) && !piece.hasResilienceUsed) {
            piece.hasResilienceUsed = true;
            this.uiPulseMessage("RESISTED!");
            piece.onWiggle();
            // Optional: visual effect for resilience
            this.createColorBeam(piece.position, piece.position.clone().add({x:0,y:1,z:0}), 0x00ff00);
            return true;
        }
        return false;
    }

    uiPulseMessage(text) {
        window.dispatchEvent(new CustomEvent('show-combo-message', { detail: text }));
    }
    
    setupDarknessOverlay() {
        if (!this.config.isDark) return;

        const shroudGeo = new THREE.PlaneGeometry(30, 30);
        const shroudMat = new THREE.MeshBasicMaterial({ 
            color: 0x000511, 
            transparent: true, 
            opacity: 0.94,
            depthWrite: false
        });
        this.darknessShroud = new THREE.Mesh(shroudGeo, shroudMat);
        this.darknessShroud.position.z = 1.5; // In front of pieces but behind indicators
        this.scene.add(this.darknessShroud);

        // Spotlights logic: we'll use small additive sprites to "punch through" the darkness
        this.lights = [];
        this.maxLights = 6;
        for (let i = 0; i < this.maxLights; i++) {
            const light = new THREE.Sprite(new THREE.SpriteMaterial({
                map: this.textureLoader.load('assets/realistic-crystal-bubble-v2.webp'),
                color: 0x00ffff,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending
            }));
            light.scale.set(5, 5, 1);
            light.position.z = 1.6;
            this.scene.add(light);
            this.lights.push(light);
        }
    }
    
    setupIndicator() {
        const group = new THREE.Group();
        
        // Simple neon arrow using a cone and a cylinder
        const arrowColor = 0x00ffff;
        
        const coneGeo = new THREE.ConeGeometry(0.25, 0.45, 16);
        const coneMat = new THREE.MeshBasicMaterial({ 
            color: arrowColor, 
            transparent: true, 
            opacity: 0.9,
            depthTest: false // Ensure it's always visible over bubbles
        });
        const cone = new THREE.Mesh(coneGeo, coneMat);
        cone.position.y = 0.35;
        group.add(cone);
        
        const stemGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 16);
        const stemMat = new THREE.MeshBasicMaterial({ 
            color: arrowColor, 
            transparent: true, 
            opacity: 0.9,
            depthTest: false
        });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = -0.1;
        group.add(stem);
        
        group.visible = false;
        this.scene.add(group);
        this.indicator = group;
        this.indicator.renderOrder = 999; // Render on top
    }

    showSwipeIndicator(piece, direction) {
        // Directional arrow feature disabled as requested
        if (this.indicator) {
            this.indicator.visible = false;
        }
    }

    highlightSwap(originPiece, direction) {
        // Unhighlight any previously highlighted pieces first
        this.pieces.forEach(p => {
            if (p && typeof p.unhighlight === 'function') {
                p.unhighlight();
            }
        });

        if (!originPiece || !direction || this.isProcessing) return;

        // Highlight the origin piece
        if (typeof originPiece.highlight === 'function') {
            originPiece.highlight();
        }

        // Find and highlight the target piece
        const { r, c } = originPiece.gridPos;
        let targetR = r;
        let targetC = c;
        if (direction === 'up') targetR--;
        else if (direction === 'down') targetR++;
        else if (direction === 'left') targetC--;
        else if (direction === 'right') targetC++;

        if (targetR >= 0 && targetR < this.gridSize && targetC >= 0 && targetC < this.gridSize) {
            const targetPiece = this.grid[targetR][targetC];
            if (targetPiece && typeof targetPiece.highlight === 'function') {
                targetPiece.highlight();
            }
        }
    }

    hideSwipeIndicator() {
        if (this.indicator) {
            this.indicator.visible = false;
        }
        // Unhighlight all pieces when the indicator is hidden/gesture finishes
        this.pieces.forEach(p => {
            if (p && typeof p.unhighlight === 'function') {
                p.unhighlight();
            }
        });
    }
    
    getFishColor(id) {
        const colors = {
            'NEON_TETRA': 0x00ccff,
            'GUPPY': 0xff6600,
            'OSCAR': 0xff3300,
            'GOLD_BUTTERFLY': 0xffd700,
            'BLUE_TANG': 0x0055ff,
            'YELLOW_FIN': 0xffff00,
            'SILVER_BUTTERFLY': 0xeeeeee,
            'PARADISE_FISH': 0xff0066,
            'NEON_GOLDFISH': 0xffaa00,
            'DAMSELFISH': 0x00ffcc,
            'PEARL_POWERUP': 0xffffff,
            'RAINBOW_POWERUP': 0xff00ff,
            'SHIELD_POWERUP': 0x00ffff
        };
        return colors[id] || 0xffffff;
    }

    createBubblePop(position, fishId) {
        const color = this.getFishColor(fishId);

        // 1. Enhanced Bubble Pop (More bubbles, varying sizes)
        const bubbleCount = 15;
        const bubbleGeo = new THREE.BufferGeometry();
        const bubblePos = new Float32Array(bubbleCount * 3);
        const bubbleVelocities = [];

        for (let i = 0; i < bubbleCount; i++) {
            bubblePos[i * 3] = position.x;
            bubblePos[i * 3 + 1] = position.y;
            bubblePos[i * 3 + 2] = position.z + 0.2;
            
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 0.08 + 0.04;
            bubbleVelocities.push(new THREE.Vector3(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed + 0.05, // Slight upward buoyancy
                (Math.random() - 0.5) * 0.05
            ));
        }
        bubbleGeo.setAttribute('position', new THREE.BufferAttribute(bubblePos, 3));
        const bubbleMat = new THREE.PointsMaterial({
            color: 0xccf0ff, // More watery blue-ish white
            size: 0.3,
            transparent: true,
            opacity: 0.35, // More transparent pop
            map: this.bubbleTexture,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const bubbles = new THREE.Points(bubbleGeo, bubbleMat);
        bubbles.userData.velocities = bubbleVelocities;
        bubbles.userData.life = 1.0;
        this.scene.add(bubbles);
        this.particleSystems.push(bubbles);

        // 2. Themed Sparkling Particles (Species-specific color)
        const sparkCount = 25;
        const sparkGeo = new THREE.BufferGeometry();
        const sparkPos = new Float32Array(sparkCount * 3);
        const sparkVelocities = [];

        for (let i = 0; i < sparkCount; i++) {
            sparkPos[i * 3] = position.x;
            sparkPos[i * 3 + 1] = position.y;
            sparkPos[i * 3 + 2] = position.z + 0.1;
            
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 0.15 + 0.05;
            sparkVelocities.push(new THREE.Vector3(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                (Math.random() - 0.5) * 0.1
            ));
        }
        sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
        const sparkMat = new THREE.PointsMaterial({
            color: color,
            size: 0.12,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const sparks = new THREE.Points(sparkGeo, sparkMat);
        sparks.userData.velocities = sparkVelocities;
        sparks.userData.life = 1.2;
        sparks.userData.isSparkle = true;
        this.scene.add(sparks);
        this.particleSystems.push(sparks);

        // 3. Shockwave Ring
        const ringGeo = new THREE.RingGeometry(0.1, 0.15, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(position);
        ring.position.z += 0.1;
        ring.userData.life = 0.8;
        ring.userData.isRing = true;
        this.scene.add(ring);
        this.particleSystems.push(ring);
    }
    
    setupGrid() {
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                // Only spawn if layout allows
                if (this.config.layout && this.config.layout[r][c] === 1) {
                    // Set initial to false to trigger the "falling in" animation reveal
                    this.spawnPiece(r, c, false);
                } else {
                    this.grid[r][c] = 'HOLE';
                }
            }
        }
        
        // Initial check for matches and resolve them instantly (with safety limit)
        let safetyCount = 0;
        // Using a synchronous check to ensure initial board is clean
        while (this.hasMatches() && safetyCount < 10) {
            this.resolveMatchesInstant();
            safetyCount++;
        }
    }

    hasMatches() {
        return this.findMatches().length > 0;
    }

    resolveMatchesInstant() {
        const matches = this.findMatches();
        for (const group of matches) {
            group.forEach(p => {
                if (p && p.gridPos) {
                    this.grid[p.gridPos.r][p.gridPos.c] = null;
                    this.scene.remove(p);
                    if (p.dispose) p.dispose();
                    this.pieces = this.pieces.filter(item => item !== p);
                }
            });
        }
        
        // Drop and refill synchronously
        for (let c = 0; c < this.gridSize; c++) {
            let emptySpaces = 0;
            for (let r = this.gridSize - 1; r >= 0; r--) {
                const piece = this.grid[r][c];
                if (piece === 'HOLE') {
                    emptySpaces = 0; // Holes reset empty spaces for pieces above them
                    continue;
                }
                if (piece === 'OCCUPIED_BY_GUARDIAN' || (piece && piece.isGuardian)) {
                    emptySpaces = 0;
                    continue;
                }

                if (this.grid[r][c] === null) {
                    emptySpaces++;
                } else if (emptySpaces > 0) {
                    const pieceToMove = this.grid[r][c];
                    this.grid[r + emptySpaces][c] = pieceToMove;
                    this.grid[r][c] = null;
                    pieceToMove.setGridPos(r + emptySpaces, c, this.worldSize, this.gridSize);
                    pieceToMove.position.copy(pieceToMove.targetPos);
                }
            }
            for (let i = 0; i < emptySpaces; i++) {
                // Only spawn if not a hole
                if (this.grid[i][c] !== 'HOLE') {
                    this.spawnPiece(i, c, true);
                    const piece = this.grid[i][c];
                    if (piece && piece !== 'OCCUPIED_BY_GUARDIAN' && piece !== 'HOLE') {
                        piece.position.copy(piece.targetPos);
                    }
                }
            }
        }
    }
    
    spawnPiece(r, c, initial = false) {
        // Handle Holes or Occupied tiles (part of a 2x2)
        if (this.grid[r][c] === 'HOLE' || this.grid[r][c] === 'OCCUPIED_BY_GUARDIAN') return;

        // Abyss Guardian Spawn (2x2)
        if (this.config.level > 500 && !initial && Math.random() < 0.05) {
            // Check if we can fit a 2x2 guardian here (r, c) is top-left
            if (r < this.gridSize - 1 && c < this.gridSize - 1) {
                const canFit = !this.grid[r][c] && !this.grid[r+1][c] && !this.grid[r][c+1] && !this.grid[r+1][c+1];
                if (canFit) {
                    const guardian = new BubblePiece(FISH_TYPES.DEEP_SEA_GUARDIAN, this.config.bubbleSprite, this.worldSize / this.gridSize);
                    guardian.setGuardian(true, this.config.biome.name, this.availableTypes);
                    
                    // Special positioning for 2x2: center between the 4 tiles
                    const spacing = this.worldSize / this.gridSize;
                    const centerX = (c + 0.5 - (this.gridSize - 1) / 2) * spacing;
                    const centerY = ((this.gridSize - 1) / 2 - (r + 0.5)) * spacing + 1.2;
                    
                    guardian.gridPos = { r, c };
                    guardian.targetPos.set(centerX, centerY, 0);
                    
                    if (initial) {
                        guardian.position.copy(guardian.targetPos);
                    } else {
                        guardian.position.copy(guardian.targetPos);
                        guardian.position.y += this.worldSize;
                    }
                    
                    this.grid[r][c] = guardian;
                    this.grid[r+1][c] = 'OCCUPIED_BY_GUARDIAN';
                    this.grid[r][c+1] = 'OCCUPIED_BY_GUARDIAN';
                    this.grid[r+1][c+1] = 'OCCUPIED_BY_GUARDIAN';
                    
                    this.pieces.push(guardian);
                    this.scene.add(guardian);
                    return;
                }
            }
        }

        // 2% chance to spawn a shield power-up if not initial and level > 2
        let type;
        const shieldChance = (this.config.level > 2 && !initial) ? 0.02 : 0;
        
        // Handle Stone Blocker spawning
        if (this.config.stoneChance > 0 && !initial && Math.random() < this.config.stoneChance) {
            type = FISH_TYPES.STONE_BLOCKER;
        }

        // Handle Sea Fruit / Golden Pearl drops if needed
        if (!type && this.config.pearlDropCount > 0 && !initial && Math.random() < 0.03) {
            // Count current fruit on board
            const currentFruit = this.pieces.filter(p => p && p.fishConfig && (p.fishConfig.id === 'SEA_FRUIT' || p.fishConfig.id === 'GOLDEN_PEARL')).length;
            if (currentFruit < this.config.pearlDropCount) {
                type = FISH_TYPES.SEA_FRUIT;
            }
        }

        if (!type) {
            if (Math.random() < shieldChance) {
                type = FISH_TYPES.SHIELD_POWERUP;
            } else {
                type = this.availableTypes[Math.floor(Math.random() * this.availableTypes.length)];
            }
        }
        
        const piece = new BubblePiece(type, this.config.bubbleSprite, this.worldSize / this.gridSize);
        
        // Apply Seaweed or Ice
        if (type.id !== 'GOLDEN_PEARL' && type.id !== 'STONE_BLOCKER' && !type.id.includes('POWERUP')) {
            if (this.config.seaweedChance > 0 && Math.random() < this.config.seaweedChance) {
                piece.setSeaweed(true);
            } else if (this.config.iceChance > 0 && Math.random() < this.config.iceChance) {
                piece.setIce(true);
            } else if (this.config.frozenChance > 0 && Math.random() < this.config.frozenChance) {
                const health = (this.config.multiHitChance && Math.random() < this.config.multiHitChance) ? 3 : 2;
                piece.setFrozen(true, health);
            } else if (this.config.weightChance > 0 && Math.random() < this.config.weightChance) {
                piece.setWeight(true);
            } else if (this.config.pressureChance > 0 && Math.random() < this.config.pressureChance) {
                piece.setPressureCrack(true);
            }

            // Bioluminescent variants in dark levels
            if (this.config.isDark && Math.random() < 0.25) {
                piece.setGlowingVariant(true);
            }
        } else if (type.id === 'STONE_BLOCKER') {
            const health = (this.config.multiHitChance && Math.random() < this.config.multiHitChance) ? 2 : 1;
            piece.setStone(true, health);
        }

        if (initial) {
            piece.setGridPos(r, c, this.worldSize, this.gridSize);
            piece.position.copy(piece.targetPos);
        } else {
            // Spawn from top
            piece.setGridPos(r, c, this.worldSize, this.gridSize);
            piece.position.copy(piece.targetPos);
            piece.position.y += this.worldSize; // Start above grid
        }
        
        this.grid[r][c] = piece;
        this.pieces.push(piece);
        this.scene.add(piece);
    }
    
    async clearMatches(matchGroups, instant = false, comboMultiplier = 1, delayMult = 1) {
        if (!matchGroups || matchGroups.length === 0) return { points: 0, changed: false };
        
        let totalPoints = 0;
        let stateChanged = false;
        const powerUpsToTrigger = [];
        const piecesToRemove = [];

        for (const group of matchGroups) {
            if (!group || group.length === 0) continue;
            const size = group.length;
            const matchCenter = group.find(p => p === this.lastMovedPiece) || group[0];
            const firstPiece = group[0];
            const matchId = firstPiece.fishConfig ? firstPiece.fishConfig.id : 'UNKNOWN';
            const baseValue = firstPiece.fishConfig ? (firstPiece.fishConfig.baseValue || 100) : 100;
            
            // Calculate points for this group: base * count * multiplier
            const sizeMultiplier = size >= 5 ? 2.5 : size === 4 ? 1.5 : 1;
            const groupPoints = Math.floor(baseValue * size * sizeMultiplier * comboMultiplier);
            totalPoints += groupPoints;

            if (!instant && matchCenter) {
                this.spawnFloatingScore(matchCenter.position, groupPoints, comboMultiplier);
            }

            group.forEach(p => {
                if (!p || p.isMatching) return; // Skip if already matching or null
                
                // If piece has seaweed, match only clears the seaweed!
                if (p.hasSeaweed) {
                    if (!instant) {
                        p.setSeaweed(false);
                        p.onWiggle();
                        window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'bubble' }));
                        if (window.navigator.vibrate) window.navigator.vibrate(15);
                        window.dispatchEvent(new CustomEvent('obstacle-cleared', { detail: { type: 'seaweed' } }));
                    }
                    stateChanged = true;
                    return;
                }

                // If piece has ice, match only clears the ice!
                if (p.hasIce) {
                    if (!instant) {
                        p.setIce(false);
                        p.onWiggle();
                        window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'ice_crack' }));
                        if (window.navigator.vibrate) window.navigator.vibrate([10, 30, 10]);
                        window.dispatchEvent(new CustomEvent('obstacle-cleared', { detail: { type: 'ice' } }));
                    }
                    stateChanged = true;
                    return;
                }

                // If piece has frozen shell (Arctic Trench), it takes multiple hits
                if (p.hasFrozen) {
                    if (!instant) {
                        const destroyed = p.damageObstacle();
                        if (!destroyed) {
                            window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'ice_crack' }));
                            stateChanged = true; // Still changed even if not destroyed
                            return;
                        } else {
                            p.setFrozen(false);
                            window.dispatchEvent(new CustomEvent('obstacle-cleared', { detail: { type: 'frozen' } }));
                        }
                    } else {
                        p.setFrozen(false);
                    }
                    stateChanged = true;
                }

                // If piece has Pressure Crack, it triggers a release when matched!
                if (p.hasPressureCrack && !instant) {
                    this.triggerPressureRelease(p);
                }

                if (!instant) {
                    p.onMatch();
                    this.createBubblePop(p.position, p.fishConfig ? p.fishConfig.id : 'GUPPY');
                    if (window.navigator.vibrate) window.navigator.vibrate(20);
                    
                    // Trigger beautiful pitched pop sound for each matching creature!
                    window.dispatchEvent(new CustomEvent('play-sfx', { 
                        detail: { type: 'pop', combo: comboMultiplier } 
                    }));
                }
                
                stateChanged = true;

                // Use Board logic for adjacent obstacles
                if (!instant) {
                    const adjDestroyed = this.board.checkAdjacentObstacles(p);
                    adjDestroyed.forEach(neighbor => {
                        if (!piecesToRemove.includes(neighbor)) {
                            neighbor.onMatch();
                            piecesToRemove.push(neighbor);
                            const sfx = neighbor.isStone ? 'stone_break' : 'pop';
                            window.dispatchEvent(new CustomEvent('play-sfx', { detail: sfx }));
                            if (window.navigator.vibrate) window.navigator.vibrate([30, 50, 30]);
                            window.dispatchEvent(new CustomEvent('obstacle-cleared', { detail: { type: neighbor.isStone ? 'stone' : 'weight' } }));
                            if (neighbor.isStone) {
                                window.dispatchEvent(new CustomEvent('objective-collected', { 
                                    detail: { type: 'collect', id: 'STONE_BLOCKER' } 
                                }));
                            }
                        }
                    });

                    // Still need to handle Guardian manually since it's not a simple health obstacle
                    const r = p.gridPos.r;
                    const c = p.gridPos.c;
                    const adj = [{r: r-1, c: c}, {r: r+1, c: c}, {r: r, c: c-1}, {r: r, c: c+1}];
                    adj.forEach(pos => {
                        if (pos.r >= 0 && pos.r < this.gridSize && pos.c >= 0 && pos.c < this.gridSize) {
                            if (this.grid[pos.r][pos.c] === 'OCCUPIED_BY_GUARDIAN' || (this.grid[pos.r][pos.c] && this.grid[pos.r][pos.c].isGuardian)) {
                                this.damageGuardianAt(pos.r, pos.c, matchId);
                            }
                        }
                    });
                }

                // Check if piece has an ability
                const ability = (p && p.fishConfig) ? p.fishConfig.ability : null;
                if (ability === 'BIOLUMINESCENT_LURE' && !instant) {
                    this.triggerBioluminescentLure(p);
                }

                if (p.fishConfig && (p.fishConfig.id.includes('POWERUP') || p.fishConfig.id.includes('ARTIFACT'))) powerUpsToTrigger.push(p);
                this.grid[p.gridPos.r][p.gridPos.c] = null;
                piecesToRemove.push(p);
            });
            
            if (!instant && matchId && !matchId.includes('POWERUP') && !matchId.includes('ARTIFACT') && matchId !== 'GOLDEN_PEARL') {
                // Create power-ups for 4 or 5 matches
                if (size === 4) {
                    this.spawnPowerUp(matchCenter.gridPos.r, matchCenter.gridPos.c, 'PEARL_POWERUP');
                } else if (size >= 5) {
                    this.spawnPowerUp(matchCenter.gridPos.r, matchCenter.gridPos.c, 'RAINBOW_POWERUP');
                }
            }
        }
        
        if (!instant) {
            await new Promise(r => setTimeout(r, 450 * delayMult));
            piecesToRemove.forEach(p => {
                this.scene.remove(p);
                if (p.dispose) p.dispose();
                this.pieces = this.pieces.filter(item => item !== p);
            });
            
            // Trigger any power-ups that were part of the match (these are now atomic)
            for (const pu of powerUpsToTrigger) {
                await this.activatePowerUp(pu);
            }
        }
        
        return { points: totalPoints, changed: stateChanged };
    }

    async triggerPressureRelease(piece) {
        const { r, c } = piece.gridPos;
        const affected = [];
        
        // Clear 1 adjacent piece in each 4-way direction (like a + shape)
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        directions.forEach(([dr, dc]) => {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < this.gridSize && nc >= 0 && nc < this.gridSize) {
                const p = this.grid[nr][nc];
                if (p && !p.isMatching && p.fishConfig && !p.fishConfig.id.includes('POWERUP') && p.fishConfig.id !== 'GOLDEN_PEARL') {
                    affected.push(p);
                }
            }
        });

        if (affected.length > 0) {
            window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'pop' }));
            // Visual feedback: dark shockwave
            this.createPressureEffect(piece.position);
            
            // Short delay to see the source pop first
            await new Promise(res => setTimeout(res, 200));
            
            const { points } = await this.clearMatches([affected], false, this.comboCount);
            window.dispatchEvent(new CustomEvent('points-earned', { 
                detail: { 
                    points: points, 
                    species: 'PRESSURE_RELEASE',
                    combo: this.comboCount 
                } 
            }));
        }
    }

    createPressureEffect(position) {
        // Simple dark purple expanding ring for pressure release
        const ringGeo = new THREE.RingGeometry(0.1, 0.2, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x6600cc,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(position);
        ring.position.z += 0.2;
        ring.userData.life = 0.6;
        ring.userData.isRing = true;
        this.scene.add(ring);
        this.particleSystems.push(ring);
    }

    async triggerBioluminescentLure(piece) {
        const { r, c } = piece.gridPos;
        this.uiPulseMessage("BIOLUMINESCENT LURE!");
        window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'zap' }));
        
        // Visual lure effect: glowing beacon
        this.createLureEffect(piece.position);

        // Logic: Convert 2-3 random nearby standard bubbles into the same species as the match
        // to encourage larger combos/chains in the next drop.
        const neighbors = [];
        for (let i = r - 2; i <= r + 2; i++) {
            for (let j = c - 2; j <= c + 2; j++) {
                if (i >= 0 && i < this.gridSize && j >= 0 && j < this.gridSize) {
                    const p = this.grid[i][j];
                    if (p && !p.isMatching && p.fishConfig && !p.fishConfig.id.includes('POWERUP') && !p.fishConfig.id.includes('ARTIFACT') && p.fishConfig.id !== 'GOLDEN_PEARL' && !p.isStone) {
                        neighbors.push(p);
                    }
                }
            }
        }

        if (neighbors.length > 0) {
            const count = Math.min(neighbors.length, 2 + Math.floor(Math.random() * 2));
            const selected = [];
            for(let i=0; i<count; i++) {
                const idx = Math.floor(Math.random() * neighbors.length);
                selected.push(neighbors.splice(idx, 1)[0]);
            }

            selected.forEach(p => {
                this.createColorBeam(piece.position, p.position, 0x00ffff);
                p.fishConfig = piece.fishConfig;
                p.updateSprite();
                p.onWiggle();
            });
        }
    }

    createLureEffect(position) {
        const ringGeo = new THREE.RingGeometry(0.1, 0.4, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(position);
        ring.position.z += 0.3;
        ring.userData.life = 1.0;
        ring.userData.isRing = true;
        this.scene.add(ring);
        this.particleSystems.push(ring);
    }

    spawnPowerUp(r, c, typeKey) {
        // Ensure the grid slot is actually empty
        if (this.grid[r][c]) {
            this.scene.remove(this.grid[r][c]);
            this.pieces = this.pieces.filter(item => item !== this.grid[r][c]);
        }
        
        const type = Object.values(FISH_TYPES).find(t => t.id === typeKey);
        const piece = new BubblePiece(type, this.config.bubbleSprite, this.worldSize / this.gridSize);
        piece.setGridPos(r, c, this.worldSize, this.gridSize);
        piece.position.copy(piece.targetPos);
        
        // Dispatch event for mission tracking
        window.dispatchEvent(new CustomEvent('powerup-created', { detail: { type: typeKey } }));
        
        this.grid[r][c] = piece;
        this.pieces.push(piece);
        this.scene.add(piece);
        return piece;
    }

    findMatches() {
        return this.board.findMatches();
    }
    
    async activateRocket(targetPiece) {
        if (!targetPiece) return;
        
        this.isProcessing = true;
        const r = targetPiece.gridPos.r;
        const affected = [];
        
        // Collect all pieces in the same row
        for (let c = 0; c < this.gridSize; c++) {
            const p = this.grid[r][c];
            if (p === 'OCCUPIED_BY_GUARDIAN' || (p && p.isGuardian)) {
                this.damageGuardianAt(r, c, 'POWERUP_ROCKET');
            } else if (p) {
                affected.push(p);
            }
        }

        if (affected.length > 0) {
            // Visual Effect: Rocket flying across the row
            const startX = -this.worldSize;
            const endX = this.worldSize;
            const y = targetPiece.position.y;
            
            this.createRocketEffect(startX, endX, y);
            window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'rocket' }));
            window.dispatchEvent(new CustomEvent('camera-shake', { detail: { intensity: 0.3 } }));
            if (window.navigator.vibrate) window.navigator.vibrate([20, 50, 20]);
            
            await new Promise(r => setTimeout(r, 600));

            const { points } = await this.clearMatches([affected], false, this.comboCount);
            window.dispatchEvent(new CustomEvent('points-earned', { 
                detail: { 
                    points: points, 
                    species: 'POWERUP',
                    combo: this.comboCount 
                } 
            }));
            await this.dropAndRefill();
        }
        
        this.isProcessing = false;
    }

    createRocketEffect(startX, endX, y) {
        const geometry = new THREE.ConeGeometry(0.3, 0.8, 8);
        const material = new THREE.MeshPhongMaterial({ color: 0xff4400, emissive: 0xff0000 });
        const rocket = new THREE.Mesh(geometry, material);
        
        rocket.rotation.z = -Math.PI / 2; // Point right
        rocket.position.set(startX, y, 1);
        this.scene.add(rocket);

        // Rocket fire particles
        const particleCount = 20;
        const pGeo = new THREE.BufferGeometry();
        const pPos = new Float32Array(particleCount * 3);
        for(let i=0; i<particleCount; i++) {
            pPos[i*3] = startX;
            pPos[i*3+1] = y;
            pPos[i*3+2] = 1;
        }
        pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
        const pMat = new THREE.PointsMaterial({ color: 0xffaa00, size: 0.1, transparent: true, opacity: 0.8 });
        const particles = new THREE.Points(pGeo, pMat);
        this.scene.add(particles);

        let progress = 0;
        const duration = 0.5; // seconds
        const startTime = performance.now();

        const animate = (time) => {
            const elapsed = (time - startTime) / 1000;
            progress = Math.min(elapsed / duration, 1);
            
            const currentX = startX + (endX - startX) * progress;
            rocket.position.x = currentX;

            // Update trail
            const positions = particles.geometry.attributes.position.array;
            for(let i=0; i<particleCount; i++) {
                if (Math.random() > 0.5) {
                    positions[i*3] = currentX - 0.5;
                    positions[i*3+1] = y + (Math.random() - 0.5) * 0.2;
                }
            }
            particles.geometry.attributes.position.needsUpdate = true;
            particles.material.opacity = 1 - progress;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(rocket);
                this.scene.remove(particles);
                geometry.dispose();
                material.dispose();
                pGeo.dispose();
                pMat.dispose();
            }
        };
        requestAnimationFrame(animate);
    }

    async activateVerticalRocket(targetPiece) {
        if (!targetPiece) return;
        
        this.isProcessing = true;
        const c = targetPiece.gridPos.c;
        const affected = [];
        
        // Collect all pieces in the same column
        for (let r = 0; r < this.gridSize; r++) {
            const p = this.grid[r][c];
            if (p === 'OCCUPIED_BY_GUARDIAN' || (p && p.isGuardian)) {
                this.damageGuardianAt(r, c, 'POWERUP_ROCKET');
            } else if (p) {
                affected.push(p);
            }
        }

        if (affected.length > 0) {
            // Visual Effect: Rocket flying across the column
            const startY = this.worldSize;
            const endY = -this.worldSize;
            const x = targetPiece.position.x;
            
            this.createVerticalRocketEffect(x, startY, endY);
            window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'rocket' }));
            window.dispatchEvent(new CustomEvent('camera-shake', { detail: { intensity: 0.3 } }));
            if (window.navigator.vibrate) window.navigator.vibrate([20, 50, 20]);
            
            await new Promise(r => setTimeout(r, 600));

            const { points } = await this.clearMatches([affected], false, this.comboCount);
            window.dispatchEvent(new CustomEvent('points-earned', { 
                detail: { 
                    points: points, 
                    species: 'POWERUP',
                    combo: this.comboCount 
                } 
            }));
            await this.dropAndRefill();
        }
        
        this.isProcessing = false;
    }

    createVerticalRocketEffect(x, startY, endY) {
        const geometry = new THREE.ConeGeometry(0.3, 0.8, 8);
        const material = new THREE.MeshPhongMaterial({ color: 0x00ffaa, emissive: 0x0088ff });
        const rocket = new THREE.Mesh(geometry, material);
        
        rocket.rotation.z = Math.PI; // Point down
        rocket.position.set(x, startY, 1);
        this.scene.add(rocket);

        // Rocket fire particles
        const particleCount = 20;
        const pGeo = new THREE.BufferGeometry();
        const pPos = new Float32Array(particleCount * 3);
        for(let i=0; i<particleCount; i++) {
            pPos[i*3] = x;
            pPos[i*3+1] = startY;
            pPos[i*3+2] = 1;
        }
        pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
        const pMat = new THREE.PointsMaterial({ color: 0x00ffff, size: 0.1, transparent: true, opacity: 0.8 });
        const particles = new THREE.Points(pGeo, pMat);
        this.scene.add(particles);

        let progress = 0;
        const duration = 0.5; // seconds
        const startTime = performance.now();

        const animate = (time) => {
            const elapsed = (time - startTime) / 1000;
            progress = Math.min(elapsed / duration, 1);
            
            const currentY = startY + (endY - startY) * progress;
            rocket.position.y = currentY;

            // Update trail
            const positions = particles.geometry.attributes.position.array;
            for(let i=0; i<particleCount; i++) {
                if (Math.random() > 0.5) {
                    positions[i*3] = x + (Math.random() - 0.5) * 0.2;
                    positions[i*3+1] = currentY + 0.5;
                }
            }
            particles.geometry.attributes.position.needsUpdate = true;
            particles.material.opacity = 1 - progress;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(rocket);
                this.scene.remove(particles);
                geometry.dispose();
                material.dispose();
                pGeo.dispose();
                pMat.dispose();
            }
        };
        requestAnimationFrame(animate);
    }

    async activateColorBomb(targetPiece, overrideColorId = null) {
        if (!targetPiece) return;
        
        this.isProcessing = true;
        const colorToClear = overrideColorId || (targetPiece.fishConfig ? targetPiece.fishConfig.id : null);
        if (!colorToClear) {
            this.isProcessing = false;
            return;
        }
        
        const affected = [];
        
        this.pieces.forEach(p => {
            if (p && p.fishConfig && p.fishConfig.id === colorToClear) {
                affected.push(p);
            }
        });

        if (affected.length > 0) {
            // Visual Effect: Beams from source to all targets
            window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'zap' }));
            window.dispatchEvent(new CustomEvent('camera-shake', { detail: { intensity: 0.4 } }));
            
            // Pulse the source piece
            targetPiece.scale.set(1.4, 1.4, 1.4);
            
            for (const p of affected) {
                // Subtle pulse on each target to show selection
                p.scale.set(1.2, 1.2, 1.2);
                this.createColorBeam(targetPiece.position, p.position, this.getFishColor(colorToClear));
            }
            
            await new Promise(r => setTimeout(r, 600));

            const { points } = await this.clearMatches([affected], false, this.comboCount);
            window.dispatchEvent(new CustomEvent('points-earned', { 
                detail: { 
                    points: points, 
                    species: colorToClear,
                    combo: this.comboCount 
                } 
            }));
            await this.dropAndRefill();
        }
        
        this.isProcessing = false;
    }

    createColorBeam(start, end, color) {
        const points = [];
        // Add a slight arc to the beam for more "energy" look
        const mid = start.clone().lerp(end, 0.5);
        mid.z += 1.5;
        
        const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
        const curvePoints = curve.getPoints(10);
        
        const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
        const material = new THREE.LineBasicMaterial({ 
            color: color, 
            transparent: true, 
            opacity: 1,
            blending: THREE.AdditiveBlending
        });
        
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);
        
        // Inner glowing core line
        const coreMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
        const coreLine = new THREE.Line(geometry, coreMat);
        this.scene.add(coreLine);
        
        // Animate beam fading
        let life = 1.0;
        const animate = () => {
            life -= 0.04;
            material.opacity = life;
            coreMat.opacity = life * 0.8;
            
            if (life > 0) {
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(line);
                this.scene.remove(coreLine);
                geometry.dispose();
                material.dispose();
                coreMat.dispose();
            }
        };
        animate();
    }
    
    createHammerEffect(position) {
        const hammerTexture = this.textureLoader.load('assets/pearl-powerup-sprite-webp.webp');
        const material = new THREE.SpriteMaterial({ 
            map: hammerTexture, 
            transparent: true,
            color: 0x00ffff // Cyan tint for hammer
        });
        const hammer = new THREE.Sprite(material);
        hammer.position.copy(position);
        hammer.position.z += 1;
        hammer.scale.set(1.5, 1.5, 1);
        hammer.rotation.z = -Math.PI / 4; // Tilted back
        this.scene.add(hammer);
        
        let time = 0;
        const duration = 0.5;
        const animate = () => {
            time += 0.05;
            const progress = time / duration;
            
            // Swing down animation
            hammer.rotation.z = -Math.PI / 4 + (Math.sin(progress * Math.PI) * Math.PI / 2);
            hammer.scale.set(1.5 * (1 + Math.sin(progress * Math.PI) * 0.2), 1.5 * (1 + Math.sin(progress * Math.PI) * 0.2), 1);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(hammer);
                material.dispose();
            }
        };
        animate();
    }

    async activatePowerUp(piece, targetColorId = null) {
        if (!piece || (piece.isMatching && !targetColorId)) return; // targetColorId check allows forcing activation for hammer
        
        this.isProcessing = true;
        if (!targetColorId) piece.onMatch(); // Mark as matching immediately to prevent re-activation
        
        // Create an "affected" list of pieces based on power-up type
        const r = piece.gridPos.r;
        const c = piece.gridPos.c;
        const affected = [];
        
        const id = piece.fishConfig.id;

        if (targetColorId === 'BOOSTER_HAMMER') {
            // Hammer: clear only the targeted piece
            if (piece && !affected.includes(piece)) affected.push(piece);
            this.createHammerEffect(piece.position);
            window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'pop' }));
            window.dispatchEvent(new CustomEvent('camera-shake', { detail: { intensity: 0.25 } }));
            // Small delay for hammer animation
            await new Promise(r => setTimeout(r, 400));
        } else if (id === 'PEARL_POWERUP') {
            // Pearl: clear 3x3 area
            for (let i = r - 1; i <= r + 1; i++) {
                for (let j = c - 1; j <= c + 1; j++) {
                    if (i >= 0 && i < this.gridSize && j >= 0 && j < this.gridSize) {
                        const p = this.grid[i][j];
                        if (p === 'OCCUPIED_BY_GUARDIAN' || (p && p.isGuardian)) {
                            this.damageGuardianAt(i, j, 'PEARL_POWERUP');
                        } else if (p && !affected.includes(p)) {
                            affected.push(p);
                        }
                    }
                }
            }
        } else if (id === 'RAINBOW_POWERUP') {
            // Rainbow: clear all of a specific color
            let colorToClear = targetColorId;
            
            if (!colorToClear) {
                // Try neighbors
                const neighbors = [
                    r > 0 ? this.grid[r - 1][c] : null,
                    r < this.gridSize - 1 ? this.grid[r + 1][c] : null,
                    c > 0 ? this.grid[r][c - 1] : null,
                    c < this.gridSize - 1 ? this.grid[r][c + 1] : null
                ].filter(n => n && n.fishConfig);
                
                if (neighbors.length > 0) {
                    colorToClear = neighbors[0].fishConfig.id;
                }
            }

            if (colorToClear) {
                // Reuse the cinematic color bomb logic for rainbows!
                this.isProcessing = false; // Temporarily unlock to allow activateColorBomb to run
                await this.activateColorBomb(piece, colorToClear);
                return;
            } else {
                // Fallback if no neighbor: clear random non-powerup color
                const validPieces = this.pieces.filter(p => p && p.fishConfig && !p.fishConfig.id.includes('POWERUP') && !p.fishConfig.id.includes('ARTIFACT'));
                if (validPieces.length > 0) {
                    const randomPiece = validPieces[Math.floor(Math.random() * validPieces.length)];
                    const randomColor = randomPiece.fishConfig.id;
                    this.isProcessing = false;
                    await this.activateColorBomb(piece, randomColor);
                    return;
                }
            }
        } else if (id === 'PRISM_ARTIFACT') {
            this.uiPulseMessage("PRISM REFRACTION!");
            const valid = this.pieces.filter(p => p && p.fishConfig && !p.isMatching && !p.fishConfig.id.includes('ARTIFACT'));
            for (let i = 0; i < 5 && valid.length > 0; i++) {
                const idx = Math.floor(Math.random() * valid.length);
                affected.push(valid.splice(idx, 1)[0]);
            }
        } else if (id === 'CORAL_HEART_ARTIFACT') {
            this.uiPulseMessage("HEART BEAT! +5 MOVES");
            window.dispatchEvent(new CustomEvent('add-moves', { detail: 5 }));
            window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'zap' }));
        } else if (id === 'VINE_ARTIFACT') {
            this.uiPulseMessage("VINE STRANGLE!");
            this.pieces.forEach(p => {
                if (p && typeof p.onWiggle === 'function') {
                    if (p.hasSeaweed) p.setSeaweed(false);
                    p.onWiggle();
                }
            });
            window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'bubble' }));
        } else if (id === 'LANTERN_ARTIFACT') {
            this.uiPulseMessage("LANTERN LIGHT!");
            if (this.darknessShroud) {
                const origOpacity = this.darknessShroud.material.opacity;
                this.darknessShroud.material.opacity = 0;
                setTimeout(() => { if (this.darknessShroud) this.darknessShroud.material.opacity = origOpacity; }, 5000);
            }
        } else if (id === 'PRESSURE_ARTIFACT') {
            this.uiPulseMessage("PRESSURE RELEASE!");
            for (let i = 0; i < this.gridSize; i++) {
                if (this.grid[r][i] && this.grid[r][i] !== 'OCCUPIED_BY_GUARDIAN') affected.push(this.grid[r][i]);
                if (this.grid[i][c] && this.grid[i][c] !== 'OCCUPIED_BY_GUARDIAN') affected.push(this.grid[i][c]);
            }
            this.createPressureEffect(piece.position);
        } else if (id === 'MAGMA_CORE_ARTIFACT') {
            this.uiPulseMessage("MAGMA BLAST!");
            // 2x2 Area explosion
            for (let i = r; i <= r + 1; i++) {
                for (let j = c; j <= c + 1; j++) {
                    if (i < this.gridSize && j < this.gridSize && this.grid[i][j] && this.grid[i][j] !== 'OCCUPIED_BY_GUARDIAN') {
                        affected.push(this.grid[i][j]);
                    }
                }
            }
            this.createMagmaBurst(piece.position);
        } else if (id === 'ICE_PICK_ARTIFACT') {
            this.uiPulseMessage("ICE BREAKER!");
            this.pieces.forEach(p => { 
                if (p && (p.hasIce || p.hasFrozen)) {
                    affected.push(p);
                }
            });
            window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'ice_crack' }));
        } else if (id === 'SPARK_ARTIFACT') {
            this.uiPulseMessage("BIO-SONAR!");
            this.applyCollectiveSonar();
        } else if (id === 'COMPASS_ARTIFACT') {
            this.uiPulseMessage("COMPASS GUIDE!");
            const rr = Math.floor(Math.random() * this.gridSize);
            const rc = Math.floor(Math.random() * this.gridSize);
            for (let i = 0; i < this.gridSize; i++) {
                const rowPiece = this.grid[rr][i];
                const colPiece = this.grid[i][rc];
                if (rowPiece && rowPiece !== 'OCCUPIED_BY_GUARDIAN' && !affected.includes(rowPiece)) affected.push(rowPiece);
                if (colPiece && colPiece !== 'OCCUPIED_BY_GUARDIAN' && !affected.includes(colPiece)) affected.push(colPiece);
            }
            // Visual: show the cross
            this.createColorBeam(new THREE.Vector3(-5, this.grid[rr][0].position.y, 0), new THREE.Vector3(5, this.grid[rr][0].position.y, 0), 0xffaa00);
            this.createColorBeam(new THREE.Vector3(this.grid[0][rc].position.x, -5, 0), new THREE.Vector3(this.grid[0][rc].position.x, 5, 0), 0xffaa00);
        } else if (id === 'VOID_ORB_ARTIFACT') {
            this.uiPulseMessage("VOID CONSUMPTION!");
            const counts = {};
            this.pieces.forEach(p => {
                if (p && p.fishConfig && !p.fishConfig.id.includes('ARTIFACT') && !p.fishConfig.id.includes('POWERUP')) {
                    counts[p.fishConfig.id] = (counts[p.fishConfig.id] || 0) + 1;
                }
            });
            let maxCount = 0, mostCommon = null;
            for (const cid in counts) {
                if (counts[cid] > maxCount) { maxCount = counts[cid]; mostCommon = cid; }
            }
            if (mostCommon) {
                this.isProcessing = false;
                await this.activateColorBomb(piece, mostCommon);
                return;
            }
        }
        
        if (affected.length > 0) {
            const { points } = await this.clearMatches([affected], false, this.comboCount);
            window.dispatchEvent(new CustomEvent('points-earned', { 
                detail: { 
                    points: points, 
                    species: 'POWERUP',
                    combo: this.comboCount 
                } 
            }));
            await this.dropAndRefill();
        }
        this.isProcessing = false;
    }

    async swapPieces(p1, p2, isFree = false) {
        if (this.isProcessing) return;
        
        // Cannot swap locked pieces, obstacles or guardians
        const isLocked = (p) => p.hasSeaweed || p.hasIce || p.hasFrozen || p.isStone || p.isWeight || p.isGuardian;
        
        if ((isLocked(p1) || isLocked(p2)) && !isFree) {
            p1.onWiggle();
            p2.onWiggle();
            return;
        }

        this.isProcessing = true;
        this.lastMovedPiece = p1; // p1 is the one the user grabbed
        this.comboCount = 0; // Reset combo at start of move
        
        try {
            // Cannot swap golden pearls with each other or matching them
            if (p1.fishConfig.id === 'GOLDEN_PEARL' || p2.fishConfig.id === 'GOLDEN_PEARL') {
                // Visualize swap attempt
                const r1 = p1.gridPos.r, c1 = p1.gridPos.c;
                const r2 = p2.gridPos.r, c2 = p2.gridPos.c;
                
                // Only allow swap if it results in a match (handled below) or if we want to allow movement
                // Standard match-3: special items can be swapped but don't match.
            }

            // Handle Shield Power-up activation on swap
            if (p1.fishConfig.id === 'SHIELD_POWERUP' || p2.fishConfig.id === 'SHIELD_POWERUP') {
                const shieldPiece = p1.fishConfig.id === 'SHIELD_POWERUP' ? p1 : p2;
                window.dispatchEvent(new CustomEvent('shield-activated'));
                
                // Remove shield piece
                this.grid[shieldPiece.gridPos.r][shieldPiece.gridPos.c] = null;
                this.scene.remove(shieldPiece);
                this.pieces = this.pieces.filter(p => p !== shieldPiece);
                
                await this.dropAndRefill();
                return true;
            }

            // Handle Power-up/Artifact activation on swap
            if (p1.fishConfig.id.includes('POWERUP') || p1.fishConfig.id.includes('ARTIFACT') || 
                p2.fishConfig.id.includes('POWERUP') || p2.fishConfig.id.includes('ARTIFACT')) {
                // Visualize swap first
                const r1 = p1.gridPos.r, c1 = p1.gridPos.c;
                const r2 = p2.gridPos.r, c2 = p2.gridPos.c;
                this.grid[r1][c1] = p2;
                this.grid[r2][c2] = p1;
                p1.setGridPos(r2, c2, this.worldSize, this.gridSize);
                p2.setGridPos(r1, c1, this.worldSize, this.gridSize);
                await new Promise(r => setTimeout(r, 300));

                if (p1.fishConfig.id === 'RAINBOW_POWERUP' || p1.fishConfig.id === 'VOID_ORB_ARTIFACT') {
                    await this.activatePowerUp(p1, p2.fishConfig.id);
                } else if (p2.fishConfig.id === 'RAINBOW_POWERUP' || p2.fishConfig.id === 'VOID_ORB_ARTIFACT') {
                    await this.activatePowerUp(p2, p1.fishConfig.id);
                } else if (p1.fishConfig.id.includes('POWERUP') || p1.fishConfig.id.includes('ARTIFACT')) {
                    await this.activatePowerUp(p1);
                } else if (p2.fishConfig.id.includes('POWERUP') || p2.fishConfig.id.includes('ARTIFACT')) {
                    await this.activatePowerUp(p2);
                }
                
                return true;
            }

            const r1 = p1.gridPos.r, c1 = p1.gridPos.c;
            const r2 = p2.gridPos.r, c2 = p2.gridPos.c;
            
            this.grid[r1][c1] = p2;
            this.grid[r2][c2] = p1;
            p1.setGridPos(r2, c2, this.worldSize, this.gridSize);
            p2.setGridPos(r1, c1, this.worldSize, this.gridSize);
            
            await new Promise(r => setTimeout(r, 300));
            
            const matchGroups = this.findMatches();
            if (matchGroups.length > 0 || isFree) {
                this.isProcessing = false;
                await this.processCascades();
                return true;
            } else {
                this.grid[r1][c1] = p1;
                this.grid[r2][c2] = p2;
                p1.setGridPos(r1, c1, this.worldSize, this.gridSize);
                p2.setGridPos(r2, c2, this.worldSize, this.gridSize);
                await new Promise(r => setTimeout(r, 300));
                return false;
            }
        } catch (e) {
            console.error("Swap error:", e);
            return false;
        } finally {
            this.isProcessing = false;
        }
    }

    async processCascades() {
        if (this.isProcessing) return;
        this.isProcessing = true;
        
        try {
            let cascadeCount = 0;
            const maxCascades = 100; // Safety limit
            
            while (cascadeCount < maxCascades) {
                const groups = this.findMatches();
                if (groups.length === 0) break;
                
                this.comboCount++;
                cascadeCount++;
                
                // Acceleration: Reduce delays as cascade deepens
                const delayMult = Math.max(0.2, 1.0 - (cascadeCount * 0.15));
                const refillDelay = 400 * delayMult;

                // Identify if any pieces will actually be REMOVED (not just obstacles cleared)
                // This helps avoid loops where matches stay on board because of obstacles.
                const { points, changed } = await this.clearMatches(groups, false, this.comboCount, delayMult);
                
                await this.dropAndRefill(false, refillDelay);
                
                // Safely get species ID for event
                const firstGroup = groups[0];
                const firstPiece = firstGroup ? firstGroup[0] : null;
                const speciesId = (firstPiece && firstPiece.fishConfig) ? firstPiece.fishConfig.id : 'UNKNOWN';

                window.dispatchEvent(new CustomEvent('points-earned', { 
                    detail: { 
                        points: points, 
                        species: speciesId,
                        combo: this.comboCount
                    } 
                }));

                // If nothing changed in the board state, break to prevent infinite loop.
                if (!changed && !this.hasEmptySlots()) {
                    break; 
                }
            }
        } catch (e) {
            console.error("Cascade error:", e);
        } finally {
            this.isProcessing = false;
            this.comboCount = 0;
            
            // Check for available moves after everything settles
            if (this.board && !this.board.isMoveAvailable()) {
                console.log("[Grid] No moves left on board. Auto-shuffling...");
                this.shuffleGrid();
            }
        }
    }

    hasEmptySlots() {
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.grid[r][c] === null) return true;
            }
        }
        return false;
    }

    async dropAndRefill(instant = false, delayOverride = null) {
        // Drop pieces
        for (let c = 0; c < this.gridSize; c++) {
            let emptySpaces = 0;
            for (let r = this.gridSize - 1; r >= 0; r--) {
                const piece = this.grid[r][c];
                
                // Holes block piece movement from above
                if (piece === 'HOLE') {
                    emptySpaces = 0;
                    continue;
                }

                // Skip Guardians and their occupied slots (they are immovable)
                if (piece === 'OCCUPIED_BY_GUARDIAN' || (piece && piece.isGuardian)) {
                    emptySpaces = 0; 
                    continue;
                }

                // Check if Sea Fruit / Golden Pearl reached the bottom
                if (piece && piece.fishConfig && (piece.fishConfig.id === 'SEA_FRUIT' || piece.fishConfig.id === 'GOLDEN_PEARL') && r === this.gridSize - 1) {
                    window.dispatchEvent(new CustomEvent('obstacle-cleared', { detail: { type: piece.fishConfig.id.toLowerCase() } }));
                    window.dispatchEvent(new CustomEvent('objective-collected', { 
                        detail: { type: 'collect', id: piece.fishConfig.id } 
                    }));
                    this.grid[r][c] = null;
                    this.scene.remove(piece);
                    if (piece.dispose) piece.dispose();
                    this.pieces = this.pieces.filter(p => p !== piece);
                    emptySpaces++;
                    continue;
                }

                if (this.grid[r][c] === null) {
                    emptySpaces++;
                } else if (emptySpaces > 0) {
                    const pieceToMove = this.grid[r][c];
                    this.grid[r + emptySpaces][c] = pieceToMove;
                    this.grid[r][c] = null;
                    pieceToMove.setGridPos(r + emptySpaces, c, this.worldSize, this.gridSize);
                    
                    // Re-check for fruit at bottom after move
                    if (pieceToMove.fishConfig && (pieceToMove.fishConfig.id === 'SEA_FRUIT' || pieceToMove.fishConfig.id === 'GOLDEN_PEARL') && (r + emptySpaces) === this.gridSize - 1) {
                        const targetR = r + emptySpaces;
                        const targetC = c;
                        // Wait a bit then collect
                        const collectionDelay = delayOverride !== null ? delayOverride * 0.75 : 300;
                        setTimeout(() => {
                            // Safety check: ensure grid still exists and indices are valid
                            if (!this.grid || !this.grid[targetR] || this.grid[targetR][targetC] !== pieceToMove) return;
                            
                            window.dispatchEvent(new CustomEvent('obstacle-cleared', { detail: { type: pieceToMove.fishConfig.id.toLowerCase() } }));
                            window.dispatchEvent(new CustomEvent('objective-collected', { 
                                detail: { type: 'collect', id: pieceToMove.fishConfig.id } 
                              }));
                            this.grid[targetR][targetC] = null;
                            this.scene.remove(pieceToMove);
                            if (pieceToMove.dispose) pieceToMove.dispose();
                            this.pieces = this.pieces.filter(p => p !== pieceToMove);
                        }, collectionDelay);
                    }
                }
            }
            
            // Refill column
            for (let i = 0; i < emptySpaces; i++) {
                // Only spawn if not a hole
                if (this.grid[i][c] !== 'HOLE') {
                    this.spawnPiece(i, c, instant);
                }
            }
        }
        
        if (!instant) {
            const finalDelay = delayOverride !== null ? delayOverride : 400;
            await new Promise(r => setTimeout(r, finalDelay));
        }
    }
    
    async shuffleGrid() {
        if (this.isProcessing) return;
        this.isProcessing = true;
        
        window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'shuffle' }));
        window.dispatchEvent(new CustomEvent('camera-shake', { detail: { intensity: 0.15 } }));

        // 1. Gather all non-powerup pieces
        const piecesToShuffle = [];
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const piece = this.grid[r][c];
                if (piece && typeof piece === 'object' && !piece.isPowerUp && !piece.isGuardian && !piece.isStone) {
                    piecesToShuffle.push(piece);
                }
            }
        }
        
        // 2. Visual Effect: Move all pieces to the center
        const centerPos = new THREE.Vector3(0, 1.2, 0); // Approx grid center
        piecesToShuffle.forEach(p => {
            p.targetPos.copy(centerPos);
            p.scale.set(0.7, 0.7, 0.7);
        });

        await new Promise(r => setTimeout(r, 600));

        // 3. Shuffle the actual data
        for (let i = piecesToShuffle.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            // Swap configs
            const tempConfig = piecesToShuffle[i].fishConfig;
            piecesToShuffle[i].fishConfig = piecesToShuffle[j].fishConfig;
            piecesToShuffle[j].fishConfig = tempConfig;
            
            // Update sprites to match new config
            piecesToShuffle[i].updateSprite();
            piecesToShuffle[j].updateSprite();
        }
        
        // 4. Spread them back to original grid positions
        let idx = 0;
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const piece = this.grid[r][c];
                if (piece && typeof piece === 'object' && !piece.isPowerUp && !piece.isGuardian && !piece.isStone) {
                    const shiftedPiece = piecesToShuffle[idx++];
                    shiftedPiece.setGridPos(r, c, this.worldSize, this.gridSize);
                    shiftedPiece.scale.set(1, 1, 1);
                    this.grid[r][c] = shiftedPiece;
                }
            }
        }
        
        await new Promise(r => setTimeout(r, 600));
        
        // 5. Trigger cascades after shuffle
        this.isProcessing = false;
        await this.processCascades();
    }

    async handleSwipe(piece, direction) {
        if (this.isProcessing) return false;
        
        // Clear any active hint on interaction
        this.clearHint();
        
        const { r, c } = piece.gridPos;
        let targetR = r;
        let targetC = c;
        
        if (direction === 'up') targetR--;
        else if (direction === 'down') targetR++;
        else if (direction === 'left') targetC--;
        else if (direction === 'right') targetC++;
        
        if (targetR >= 0 && targetR < this.gridSize && targetC >= 0 && targetC < this.gridSize) {
            const targetPiece = this.grid[targetR][targetC];
            // Ensure target is a valid BubblePiece instance (not string grid holes)
            if (targetPiece && targetPiece instanceof BubblePiece) {
                return await this.swapPieces(piece, targetPiece, this.isFreeSwapActive);
            }
        }
        return false;
    }

    showHint() {
        if (this.isProcessing || this.isProcessingPowerUp) return;
        
        const moves = this.board.findPossibleMoves();
        if (moves.length === 0) {
            console.log("[Hint] No moves available. Shuffling...");
            this.shuffleGrid();
            return;
        }

        // Select a random valid move to hint
        const move = moves[Math.floor(Math.random() * moves.length)];
        const p1 = this.grid[move.r1][move.c1];
        const p2 = this.grid[move.r2][move.c2];

        if (p1 && p2 && p1 instanceof BubblePiece && p2 instanceof BubblePiece) {
            p1.onWiggle();
            p2.onWiggle();
            
            // Apply a stronger highlight
            if (typeof p1.highlight === 'function') p1.highlight();
            if (typeof p2.highlight === 'function') p2.highlight();
            
            this.hintedPieces = [p1, p2];
            console.log(`[Hint] Suggested move: (${move.r1},${move.c1}) <-> (${move.r2},${move.c2})`);
        }
    }

    clearHint() {
        if (this.hintedPieces) {
            this.hintedPieces.forEach(p => {
                if (p && typeof p.unhighlight === 'function') p.unhighlight();
            });
            this.hintedPieces = null;
        }
    }

    handleInput(piece) {
        // Legacy click-to-select disabled in favor of handleSwipe
        piece.onWiggle();
    }
    
    applyCollectiveSonar() {
        const sonarOrigin = new THREE.Vector3(0, 0, 0);
        
        // Sonar Wave Visual
        const sonarRing = new THREE.Mesh(
            new THREE.RingGeometry(0.1, 0.2, 32),
            new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
        );
        this.scene.add(sonarRing);
        
        let sonarLife = 0;
        const animateSonar = () => {
            sonarLife += 0.1;
            sonarRing.scale.set(sonarLife * 20, sonarLife * 20, 1);
            sonarRing.material.opacity = 1.0 - (sonarLife / 2.0);
            
            if (sonarLife < 2.0) {
                requestAnimationFrame(animateSonar);
            } else {
                this.scene.remove(sonarRing);
            }
        };
        animateSonar();

        // Mechanical Effect
        this.pieces.forEach(p => {
            if (p && p.fishConfig) {
                if (p.fishConfig.id === 'DEEP_SEA_GUARDIAN') {
                    p.onStun && p.onStun(3); // Stun for 3 turns
                } else if (p.fishConfig.id === 'STONE_BLOCKER' || p.isIce || p.isSeaweed) {
                    // Sonar pulse weakens obstacles
                    p.onWiggle && p.onWiggle();
                    if (Math.random() < 0.3 && p.gridPos) {
                        this.clearPiece(p.gridPos.r, p.gridPos.c);
                    }
                }
            } else if (p && (p.isIce || p.isSeaweed)) {
                // Piece or obstacle itself
                p.onWiggle && p.onWiggle();
                if (Math.random() < 0.3 && p.gridPos) {
                    this.clearPiece(p.gridPos.r, p.gridPos.c);
                }
            }
        });
    }

    setScannerActive(active) {
        if (active && !this.scannerLine) {
            const geo = new THREE.PlaneGeometry(this.worldSize, 0.2);
            const mat = new THREE.MeshBasicMaterial({ 
                color: 0x00ffff, 
                transparent: true, 
                opacity: 0.5,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            this.scannerLine = new THREE.Mesh(geo, mat);
            this.scannerLine.position.z = 1.6;
            this.scene.add(this.scannerLine);
        } else if (!active && this.scannerLine) {
            this.scene.remove(this.scannerLine);
            this.scannerLine = null;
        }
    }

    update(delta, time) {
        this.pieces.forEach(p => {
            if (p && typeof p.update === 'function') {
                p.update(delta, time);
            }
        });
        this.updateWeather(delta, time);
        this.updateAmbientWildlife(delta, time);
        
        // --- Hadal Depth Distortion ---
        if (this.config.biome.name === 'The Hadal Void') {
            const distortionIntensity = 0.05;
            const distortionSpeed = 2.0;
            this.pieces.forEach((p, idx) => {
                if (p && typeof p.update === 'function' && p.position) {
                    const offset = Math.sin(time * distortionSpeed + idx) * distortionIntensity;
                    p.position.x += offset * delta;
                    p.position.y += Math.cos(time * distortionSpeed * 0.8 + idx) * distortionIntensity * delta;
                }
            });
        }
        // Update Scanner Line Animation
        if (this.scannerLine) {
            this.scannerLine.position.y = Math.sin(time * 2) * (this.worldSize / 2);
            this.scannerLine.material.opacity = 0.3 + Math.sin(time * 5) * 0.2;
        }

        // Update darkness lighting
        if (this.config.isDark && this.lights) {
            let lightIdx = 0;
            
            // Priority 1: User selection/last moved
            if (this.lastMovedPiece && lightIdx < this.maxLights) {
                const l = this.lights[lightIdx++];
                l.position.x = this.lastMovedPiece.position.x;
                l.position.y = this.lastMovedPiece.position.y;
                l.opacity = 0.8;
                l.scale.set(6, 6, 1);
            }

            // Priority 2: Power-ups
            this.pieces.forEach(p => {
                if (p.isPowerUp && lightIdx < this.maxLights) {
                    const l = this.lights[lightIdx++];
                    l.position.x = p.position.x;
                    l.position.y = p.position.y;
                    l.opacity = 0.6;
                    l.scale.set(4, 4, 1);
                }
            });

            // Priority 3: Glowing variants
            this.pieces.forEach(p => {
                if (p.isGlowingVariant && lightIdx < this.maxLights) {
                    const l = this.lights[lightIdx++];
                    l.position.x = p.position.x;
                    l.position.y = p.position.y;
                    l.opacity = 0.5;
                    l.scale.set(3, 3, 1);
                }
            });

            // Turn off unused lights
            for (let i = lightIdx; i < this.maxLights; i++) {
                this.lights[i].opacity = 0;
            }
        }

        // Update Swipe Indicator animation
        if (this.indicator && this.indicator.visible) {
            const pulse = Math.sin(time * 15) * 0.1;
            this.indicator.scale.set(1 + pulse, 1 + pulse, 1 + pulse);
            // Oscillate position slightly for a "pointing" effect
            const originalOffset = 1.0;
            const oscillate = Math.sin(time * 20) * 0.1;
            
            // We need to re-apply the position based on the current piece it's attached to if we want it to move
            // But for now, just a scale pulse is quite good.
        }
        
        // Update particles
        for (let i = this.particleSystems.length - 1; i >= 0; i--) {
            const ps = this.particleSystems[i];
            ps.userData.life -= delta * 2.5;
            
            if (ps.userData.life <= 0) {
                this.scene.remove(ps);
                if (ps.geometry) ps.geometry.dispose();
                if (ps.material) ps.material.dispose();
                this.particleSystems.splice(i, 1);
                continue;
            }

            if (ps.userData.isRing) {
                const scale = 1 + (1 - ps.userData.life) * 4;
                ps.scale.set(scale, scale, 1);
                ps.material.opacity = ps.userData.life * 0.8;
            } else {
                const posAttr = ps.geometry.attributes.position;
                for (let j = 0; j < ps.userData.velocities.length; j++) {
                    const vel = ps.userData.velocities[j];
                    posAttr.array[j * 3] += vel.x;
                    posAttr.array[j * 3 + 1] += vel.y;
                    posAttr.array[j * 3 + 2] += vel.z;
                    
                    if (ps.userData.isSparkle) {
                        vel.multiplyScalar(0.92); // Sparkles slow down
                    } else {
                        vel.y += 0.002; // Bubbles float UP
                    }
                }
                posAttr.needsUpdate = true;
                ps.material.opacity = ps.userData.life;
            }
        }
    }

    async clearAllObstacles() {
        if (this.isProcessing) return;
        this.isProcessing = true;
        
        const affected = [];
        this.pieces.forEach(p => {
            if (p && (p.hasSeaweed || p.hasIce || p.hasFrozen || p.isStone || p.isWeight || p.hasPressureCrack)) {
                affected.push(p);
            }
        });

        if (affected.length > 0) {
            // Visual feedback: Multiple Sonar rings
            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    const ringGeo = new THREE.RingGeometry(0.1, 0.5, 64);
                    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
                    const sonar = new THREE.Mesh(ringGeo, ringMat);
                    sonar.position.set(0, 1.2, 2);
                    this.scene.add(sonar);
                    
                    let sonarLife = 1.0;
                    const animateSonar = () => {
                        sonarLife -= 0.015;
                        sonar.scale.set(1 + (1-sonarLife)*40, 1 + (1-sonarLife)*40, 1);
                        sonar.material.opacity = sonarLife;
                        if (sonarLife > 0) requestAnimationFrame(animateSonar);
                        else {
                            this.scene.remove(sonar);
                            ringGeo.dispose();
                            ringMat.dispose();
                        }
                    };
                    animateSonar();
                }, i * 200);
            }

            // Screen Flash
            const flashGeo = new THREE.PlaneGeometry(30, 30);
            const flashMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending });
            const flash = new THREE.Mesh(flashGeo, flashMat);
            flash.position.z = 3;
            this.scene.add(flash);
            setTimeout(() => {
                let flashLife = 1.0;
                const animateFlash = () => {
                    flashLife -= 0.05;
                    flash.material.opacity = flashLife * 0.4;
                    if (flashLife > 0) requestAnimationFrame(animateFlash);
                    else this.scene.remove(flash);
                };
                animateFlash();
            }, 100);

            window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'rocket' }));
            window.dispatchEvent(new CustomEvent('camera-shake', { detail: { intensity: 0.6 } }));

            await new Promise(res => setTimeout(res, 800));

            // Clear obstacles
            affected.forEach(p => {
                if (p.hasSeaweed) p.setSeaweed(false);
                if (p.hasIce) p.setIce(false);
                if (p.hasFrozen) p.setFrozen(false);
                if (p.isStone) {
                    this.grid[p.gridPos.r][p.gridPos.c] = null;
                    p.onMatch();
                    setTimeout(() => {
                        this.scene.remove(p);
                        this.pieces = this.pieces.filter(item => item !== p);
                    }, 450);
                }
                if (p.isWeight) p.setWeight(false);
                if (p.hasPressureCrack) p.setPressureCrack(false);
                p.onWiggle();
            });

            await this.dropAndRefill();
        }
        
        this.isProcessing = false;
    }

    damageGuardianAt(r, c, colorId = null) {
        // Find the guardian piece. Since it's 2x2, the actual piece could be at (r,c), (r-1,c), (r,c-1) or (r-1,c-1)
        let guardian = null;
        for (let i = r - 1; i <= r; i++) {
            for (let j = c - 1; j <= c; j++) {
                if (i >= 0 && i < this.gridSize && j >= 0 && j < this.gridSize) {
                    const p = this.grid[i][j];
                    if (p && p.isGuardian) {
                        guardian = p;
                        break;
                    }
                }
            }
            if (guardian) break;
        }

        if (guardian) {
            const isDead = guardian.damageGuardian(colorId, this.availableTypes);
            window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'stone_break' }));
            if (window.navigator.vibrate) window.navigator.vibrate(50);
            
            if (isDead) {
                // Clear all 4 slots
                const gr = guardian.gridPos.r;
                const gc = guardian.gridPos.c;
                
                // Trigger pop effect
                this.createBubblePop(guardian.position, guardian.fishConfig.id);
                window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'pop' }));
                window.dispatchEvent(new CustomEvent('camera-shake', { detail: { intensity: 0.5 } }));

                // Clean grid
                this.grid[gr][gc] = null;
                this.grid[gr + 1][gc] = null;
                this.grid[gr][gc + 1] = null;
                this.grid[gr + 1][gc + 1] = null;
                
                // Clear pieces list
                this.pieces = this.pieces.filter(p => p !== guardian);
                
                // Fade out and remove
                guardian.onMatch();
                setTimeout(() => {
                    this.scene.remove(guardian);
                }, 450);

                window.dispatchEvent(new CustomEvent('points-earned', { 
                    detail: { 
                        points: 5000, 
                        species: 'DEEP_SEA_GUARDIAN',
                        combo: this.comboCount 
                    } 
                }));
            }
        }
    }

    spawnFloatingScore(position, points, combo = 1) {
        if (!window.gameCamera) return;

        const frame = document.getElementById('game-frame') || document.body;
        const rect = frame.getBoundingClientRect();

        const vector = position.clone();
        vector.project(window.gameCamera);

        // Project relative to our mobile game frame width/height rather than entire browser window
        const x = (vector.x * 0.5 + 0.5) * rect.width;
        const y = (vector.y * -0.5 + 0.5) * rect.height;

        const el = document.createElement('div');
        el.className = 'floating-score';
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        
        if (combo > 1) {
            el.innerHTML = `<span style="font-size: 1.3em; color: #ffd700; text-shadow: 0 0 10px rgba(255,215,0,0.8); font-weight: bold;">+${points}</span><br><span style="font-size: 0.9em; color: #00ffaa; text-shadow: 0 0 10px #00ffaa; font-weight: bold; text-transform: uppercase;">COMBO x${combo}</span>`;
            el.style.textAlign = 'center';
        } else {
            el.innerText = `+${points}`;
        }
        
        // Append inside our UI overlay container to prevent rendering out-of-bounds
        const uiRoot = document.getElementById('ui-root');
        if (uiRoot) {
            uiRoot.appendChild(el);
        } else {
            frame.appendChild(el);
        }

        setTimeout(() => el.remove(), 1000);
    }
}
