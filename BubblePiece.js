/* 
 * PROJECT: AQUA MATCH PUZZLE
 * DEVELOPER: Emad Ibrahim
 * STUDIO: NexApp Development Studio
 * COPYRIGHT: © 2026 NexApp. All Rights Reserved.
 */

import * as THREE from 'three';

export class BubblePiece extends THREE.Group {
    constructor(fishConfig, unused, size) {
        super();
        this.fishConfig = fishConfig;
        this.size = size;
        
        const loader = new THREE.TextureLoader();
        
        // 3D Crystal Clear Bubble - Refined for watery transparency
        const bubbleGeo = new THREE.SphereGeometry(size * 0.48, 32, 32);
        const bubbleMat = new THREE.MeshStandardMaterial({
            color: 0x99ccff, // Watery blue tint
            metalness: 0.5,
            roughness: 0.05,
            transparent: true,
            opacity: 0.15, // Subtle visible shell
            side: THREE.FrontSide, 
            depthWrite: false
        });
        
        this.bubble = new THREE.Mesh(bubbleGeo, bubbleMat);
        this.add(this.bubble);

        // Fish icon - positioned inside the bubble, scaled for no overlap
        const fishTex = loader.load(fishConfig.sprite);
        const fishMat = new THREE.SpriteMaterial({ 
            map: fishTex,
            transparent: true,
            opacity: 1,
            depthWrite: false,
            depthTest: true
        });
        this.fish = new THREE.Sprite(fishMat);
        this.fish.scale.set(size * 0.85, size * 0.85, 1);
        this.fish.renderOrder = 5;
        this.add(this.fish);
        
        // Add a subtle inner sheen/rim light effect - Water highlight
        const rimGeo = new THREE.SphereGeometry(size * 0.46, 32, 32);
        const rimMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.1, // Very faint highlight
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending
        });
        this.rim = new THREE.Mesh(rimGeo, rimMat);
        this.add(this.rim);

        this.gridPos = { r: 0, c: 0 };
        this.targetPos = new THREE.Vector3();
        this.isMatching = false;
        
        // Visual flair for power-ups
        this.isPowerUp = fishConfig.id.includes('POWERUP');
        if (this.isPowerUp) {
            this.glow = new THREE.Sprite(new THREE.SpriteMaterial({
                map: loader.load('assets/realistic-crystal-bubble-v2.webp'), // Use original for glow texture
                color: fishConfig.id === 'RAINBOW_POWERUP' ? 0xffffff : 0xffd700,
                transparent: true,
                opacity: 0.4,
                blending: THREE.AdditiveBlending
            }));
            this.glow.scale.set(size * 1.3, size * 1.3, 1);
            this.add(this.glow);
        }
        
        // Floating animation offset
        this.floatOffset = Math.random() * Math.PI * 2;
        
        this.hasSeaweed = false;
        this.seaweedSprite = null;

        this.hasIce = false;
        this.iceSprite = null;

        this.isStone = false;
        this.stoneSprite = null;

        this.hasFrozen = false;
        this.frozenSprite = null;
        this.frozenHits = 0;

        this.isWeight = false;
        this.weightSprite = null;

        this.isGlowingVariant = false;
        this.glowVariantSprite = null;

        this.hasPressureCrack = false;
        this.pressureSprite = null;

        this.hasResilienceUsed = false;
        this.isGuardian = false;
        this.guardianHits = 0;
        this.maxGuardianHits = 3;
        this.guardianCracks = null;
        this.guardianRequiredColor = null;
        this.guardianColorIndicator = null;

        // Health system for multi-hit obstacles
        this.health = 1;
        this.maxHealth = 1;
        this.damageOverlay = null;

        if (fishConfig.id === 'STONE_BLOCKER') {
            this.setStone(true);
            this.bubble.visible = false;
            this.rim.visible = false;
            this.fish.visible = false;
        }

        if (fishConfig.id === 'GOLDEN_PEARL') {
            this.bubble.visible = false;
            this.rim.visible = false;
            this.fish.scale.set(size * 1.2, size * 1.2, 1);
        }
    }
    
    setGuardian(active, biomeName = '', availableTypes = []) {
        this.isGuardian = active;
        if (active) {
            this.guardianHits = this.maxGuardianHits;
            this.bubble.visible = false;
            this.rim.visible = false;
            
            // Assign biome-specific skin
            const loader = new THREE.TextureLoader();
            let skinPath = 'assets/deep-sea-guardian-leviathan.webp';
            
            if (biomeName.includes('Arctic')) {
                skinPath = 'assets/arctic-guardian-serpent-webp.webp';
            } else if (biomeName.includes('Volcanic')) {
                skinPath = 'assets/volcanic-guardian-crab-webp.webp';
            } else if (biomeName.includes('Shipwreck')) {
                skinPath = 'assets/ancient-guardian-kraken-webp.webp';
            } else if (biomeName.includes('Bioluminescent')) {
                skinPath = 'assets/bioluminescent-guardian-jellyfish-webp.webp';
            }
            
            this.fish.material.map = loader.load(skinPath);
            this.fish.material.needsUpdate = true;

            // Set a required color for the first stage
            if (availableTypes.length > 0) {
                this.guardianRequiredColor = availableTypes[Math.floor(Math.random() * availableTypes.length)].id;
                this.updateGuardianColorIndicator();
            }

            // Scale to occupy 2x2 visually (spacing is accounted for in Grid)
            this.fish.scale.set(this.size * 2.2, this.size * 2.2, 1);
            this.fish.renderOrder = 40;
        }
    }

    updateGuardianColorIndicator() {
        if (!this.guardianRequiredColor) return;
        
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
            'DAMSELFISH': 0x00ffcc
        };

        if (!this.guardianColorIndicator) {
            const loader = new THREE.TextureLoader();
            this.guardianColorIndicator = new THREE.Sprite(new THREE.SpriteMaterial({
                map: loader.load('assets/realistic-crystal-bubble-v2.webp'),
                transparent: true,
                opacity: 0.5,
                blending: THREE.AdditiveBlending
            }));
            this.guardianColorIndicator.scale.set(this.size * 2.8, this.size * 2.8, 1);
            this.guardianColorIndicator.renderOrder = 39;
            this.add(this.guardianColorIndicator);
        }

        this.guardianColorIndicator.material.color.set(colors[this.guardianRequiredColor] || 0xffffff);
    }

    damageGuardian(colorId = null, availableTypes = []) {
        if (!this.isGuardian) return false;

        // If a required color is set, only that color (or powerups) can damage it
        if (this.guardianRequiredColor && colorId && colorId !== this.guardianRequiredColor && !colorId.includes('POWERUP')) {
            this.onWiggle();
            return false;
        }

        this.guardianHits--;
        
        // Change required color for next stage if hits remain
        if (this.guardianHits > 0 && availableTypes.length > 0) {
            // Pick a different color
            const otherTypes = availableTypes.filter(t => t.id !== this.guardianRequiredColor);
            if (otherTypes.length > 0) {
                this.guardianRequiredColor = otherTypes[Math.floor(Math.random() * otherTypes.length)].id;
                this.updateGuardianColorIndicator();
            }
        }
        
        // Visual feedback for damage
        const flashColor = new THREE.Color(0xff0000);
        const originalColor = new THREE.Color(0xffffff);
        this.fish.material.color.copy(flashColor);
        
        setTimeout(() => {
            if (this.fish) this.fish.material.color.copy(originalColor);
        }, 100);

        // Add cracks overlay as health decreases
        if (this.guardianHits < this.maxGuardianHits && !this.guardianCracks) {
            const loader = new THREE.TextureLoader();
            const crackTex = loader.load('assets/ice-crack-overlay-webp.webp');
            const crackMat = new THREE.SpriteMaterial({ 
                map: crackTex,
                transparent: true,
                opacity: 0,
                color: 0x222222,
                depthWrite: false
            });
            this.guardianCracks = new THREE.Sprite(crackMat);
            this.guardianCracks.scale.set(this.size * 2.0, this.size * 2.0, 1);
            this.guardianCracks.renderOrder = 45;
            this.add(this.guardianCracks);
        }

        if (this.guardianCracks) {
            // Increase opacity of cracks as HP drops
            const damagePercent = (this.maxGuardianHits - this.guardianHits) / this.maxGuardianHits;
            this.guardianCracks.material.opacity = damagePercent * 0.9;
        }

        this.onWiggle();
        
        if (this.guardianHits <= 0) {
            if (this.guardianColorIndicator) {
                this.remove(this.guardianColorIndicator);
                this.guardianColorIndicator = null;
            }
            return true;
        }
        return false;
    }
    
    damageObstacle() {
        this.health--;
        this.updateDamageOverlay();
        this.onWiggle();
        
        const flashColor = new THREE.Color(0xffffff);
        const originalColor = this.fish.material.color.clone();
        
        // Flash effect
        if (this.stoneSprite) this.stoneSprite.material.color.set(0xffffff);
        if (this.frozenSprite) this.frozenSprite.material.color.set(0xffffff);
        
        setTimeout(() => {
            if (this.stoneSprite) this.stoneSprite.material.color.set(0xffffff);
            if (this.frozenSprite) this.frozenSprite.material.color.set(0x00ffff);
        }, 100);

        return this.health <= 0;
    }

    updateDamageOverlay() {
        if (this.health >= this.maxHealth) {
            if (this.damageOverlay) {
                this.remove(this.damageOverlay);
                this.damageOverlay = null;
            }
            return;
        }

        if (!this.damageOverlay) {
            const loader = new THREE.TextureLoader();
            const crackTex = loader.load('assets/ice-crack-overlay-webp.webp');
            const crackMat = new THREE.SpriteMaterial({ 
                map: crackTex,
                transparent: true,
                opacity: 0,
                color: 0x000000,
                depthWrite: false
            });
            this.damageOverlay = new THREE.Sprite(crackMat);
            this.damageOverlay.scale.set(this.size * 1.1, this.size * 1.1, 1);
            this.damageOverlay.renderOrder = 36;
            this.add(this.damageOverlay);
        }

        const damagePercent = (this.maxHealth - this.health) / this.maxHealth;
        this.damageOverlay.material.opacity = damagePercent * 0.8;
    }

    setFrozen(hasFrozen, health = 2) {
        this.hasFrozen = hasFrozen;
        if (hasFrozen && !this.frozenSprite) {
            this.health = health;
            this.maxHealth = health;
            this.frozenHits = health; 
            const loader = new THREE.TextureLoader();
            const frozenTex = loader.load('assets/ice-crack-overlay-webp.webp');
            const frozenMat = new THREE.SpriteMaterial({ 
                map: frozenTex,
                transparent: true,
                depthWrite: false,
                color: 0x00ffff,
                opacity: 0.9
            });
            this.frozenSprite = new THREE.Sprite(frozenMat);
            this.frozenSprite.scale.set(this.size * 1.15, this.size * 1.15, 1);
            this.frozenSprite.renderOrder = 30;
            this.add(this.frozenSprite);
            this.bubble.material.color.set(0x00ffff);
            this.bubble.material.opacity = 0.8;
            this.updateDamageOverlay();
        } else if (!hasFrozen && this.frozenSprite) {
            this.remove(this.frozenSprite);
            this.frozenSprite = null;
            this.bubble.material.color.set(0xccffff);
            this.bubble.material.opacity = 0.0;
            this.health = 1;
            this.maxHealth = 1;
            this.updateDamageOverlay();
        }
    }

    setWeight(isWeight) {
        this.isWeight = isWeight;
        if (isWeight && !this.weightSprite) {
            const loader = new THREE.TextureLoader();
            // Using stone texture with a tint for weights
            const weightTex = loader.load('assets/stone-blocker-webp.webp');
            const weightMat = new THREE.SpriteMaterial({ 
                map: weightTex,
                transparent: true,
                depthWrite: false,
                color: 0xcd7f32 // Bronze/Copper tint
            });
            this.weightSprite = new THREE.Sprite(weightMat);
            this.weightSprite.scale.set(this.size * 0.95, this.size * 0.95, 1);
            this.weightSprite.renderOrder = 22;
            this.add(this.weightSprite);
            // Weights are heavy, no bubble
            this.bubble.visible = false;
            this.rim.visible = false;
            this.fish.scale.multiplyScalar(0.8);
        } else if (!isWeight && this.weightSprite) {
            this.remove(this.weightSprite);
            this.weightSprite = null;
            this.bubble.visible = true;
            this.rim.visible = true;
            this.fish.scale.multiplyScalar(1.25);
        }
    }

    setGlowingVariant(active) {
        this.isGlowingVariant = active;
        if (active && !this.glowVariantSprite) {
            const loader = new THREE.TextureLoader();
            this.glowVariantSprite = new THREE.Sprite(new THREE.SpriteMaterial({
                map: loader.load('assets/realistic-crystal-bubble-v2.webp'),
                color: 0x00ffff,
                transparent: true,
                opacity: 0.6,
                blending: THREE.AdditiveBlending
            }));
            this.glowVariantSprite.scale.set(this.size * 1.4, this.size * 1.4, 1);
            this.add(this.glowVariantSprite);
            
            // Brighten the fish icon
            this.fish.material.color.set(0xffffff);
            this.fish.material.emissiveIntensity = 1.0;
        } else if (!active && this.glowVariantSprite) {
            this.remove(this.glowVariantSprite);
            this.glowVariantSprite = null;
        }
    }

    setPressureCrack(active) {
        this.hasPressureCrack = active;
        if (active && !this.pressureSprite) {
            const loader = new THREE.TextureLoader();
            // Using a dark, cracked overlay for pressure
            const crackTex = loader.load('assets/ice-crack-overlay-webp.webp');
            const crackMat = new THREE.SpriteMaterial({ 
                map: crackTex,
                transparent: true,
                depthWrite: false,
                color: 0x330066, // Deep purple/void tint
                opacity: 0.8
            });
            this.pressureSprite = new THREE.Sprite(crackMat);
            this.pressureSprite.scale.set(this.size * 1.1, this.size * 1.1, 1);
            this.pressureSprite.renderOrder = 35;
            this.add(this.pressureSprite);
            
            // Darken the bubble significantly
            this.bubble.material.color.set(0x110022);
            this.bubble.material.opacity = 0.7;
        } else if (!active && this.pressureSprite) {
            this.remove(this.pressureSprite);
            this.pressureSprite = null;
            this.bubble.material.color.set(0xccffff);
            this.bubble.material.opacity = 0.0;
        }
    }

    setSeaweed(hasSeaweed) {
        this.hasSeaweed = hasSeaweed;
        if (hasSeaweed && !this.seaweedSprite) {
            const loader = new THREE.TextureLoader();
            const seaweedTex = loader.load('assets/seaweed-lock.webp');
            const seaweedMat = new THREE.SpriteMaterial({ 
                map: seaweedTex,
                transparent: true,
                depthWrite: false
            });
            this.seaweedSprite = new THREE.Sprite(seaweedMat);
            this.seaweedSprite.scale.set(this.size * 1.2, this.size * 1.2, 1);
            this.seaweedSprite.renderOrder = 20; // Ensure it is on top
            this.add(this.seaweedSprite);
        } else if (!hasSeaweed && this.seaweedSprite) {
            this.remove(this.seaweedSprite);
            this.seaweedSprite = null;
        }
    }

    setIce(hasIce) {
        this.hasIce = hasIce;
        if (hasIce && !this.iceSprite) {
            const loader = new THREE.TextureLoader();
            const iceTex = loader.load('assets/ice-crack-overlay-webp.webp');
            const iceMat = new THREE.SpriteMaterial({ 
                map: iceTex,
                transparent: true,
                depthWrite: false,
                opacity: 0.8
            });
            this.iceSprite = new THREE.Sprite(iceMat);
            this.iceSprite.scale.set(this.size * 1.1, this.size * 1.1, 1);
            this.iceSprite.renderOrder = 25;
            this.add(this.iceSprite);
            this.bubble.material.color.set(0x88ffff);
            this.bubble.material.opacity = 0.8;
        } else if (!hasIce && this.iceSprite) {
            this.remove(this.iceSprite);
            this.iceSprite = null;
            this.bubble.material.color.set(0xccffff);
            this.bubble.material.opacity = 0.0;
        }
    }

    setStone(isStone, health = 1) {
        this.isStone = isStone;
        if (isStone && !this.stoneSprite) {
            this.health = health;
            this.maxHealth = health;
            const loader = new THREE.TextureLoader();
            const stoneTex = loader.load('assets/stone-blocker-webp.webp');
            const stoneMat = new THREE.SpriteMaterial({ 
                map: stoneTex,
                transparent: true,
                depthWrite: false
            });
            this.stoneSprite = new THREE.Sprite(stoneMat);
            this.stoneSprite.scale.set(this.size * 0.9, this.size * 0.9, 1);
            this.stoneSprite.renderOrder = 15;
            this.add(this.stoneSprite);
            this.updateDamageOverlay();
        } else if (!isStone && this.stoneSprite) {
            this.remove(this.stoneSprite);
            this.stoneSprite = null;
            this.health = 1;
            this.maxHealth = 1;
            this.updateDamageOverlay();
        }
    }

    highlight() {
        if (this.rim && this.rim.material) {
            this.rim.material.opacity = 0.85;
            this.rim.material.color.set(0x00ffff); // Neon cyan highlight glow
        }
        // Slightly scale up for visual feedback
        this.scale.set(1.15, 1.15, 1.15);
    }

    unhighlight() {
        if (this.rim && this.rim.material) {
            this.rim.material.opacity = 0.0;
        }
        this.scale.set(1.0, 1.0, 1.0);
    }

    update(delta, time) {
        // Smoothly move towards target position
        this.position.lerp(this.targetPos, 0.15);
        
        // Gentle floating animation for the fish inside
        const floatY = Math.sin(time * 2 + this.floatOffset) * 0.05;
        this.fish.position.y = floatY;

        // Subtle rotation for the bubble to show off reflections
        this.bubble.rotation.y = time * 0.5;
        this.bubble.rotation.z = Math.sin(time * 0.3) * 0.1;

        if (this.isPowerUp) {
            const pulse = 0.8 + Math.sin(time * 5) * 0.2;
            this.glow.scale.set(this.size * 1.3 * pulse, this.size * 1.3 * pulse, 1);
            if (this.fishConfig.id === 'RAINBOW_POWERUP') {
                this.glow.material.color.setHSL((time * 0.5) % 1, 0.8, 0.5);
            }
        }

        // Wiggle effect when touched or selected
        if (this.isWiggling) {
            this.wiggleTimer -= delta;
            this.rotation.z = Math.sin(this.wiggleTimer * 30) * 0.1;
            if (this.wiggleTimer <= 0) {
                this.isWiggling = false;
                this.rotation.z = 0;
            }
        }
        
        // Match-3 pop/shatter animation
        if (this.isMatching) {
            this.popTimer -= delta;
            const duration = 0.4;
            const progress = 1 - (this.popTimer / duration);
            
            if (progress < 0.3) {
                // Phase 1: Squish/Anticipation
                const s = 1 - Math.sin(progress * Math.PI / 0.3) * 0.2;
                this.scale.set(s, s, s);
                this.fish.material.color.setRGB(1 + progress * 5, 1 + progress * 5, 1 + progress * 5);
            } else {
                // Phase 2: Explosive Pop
                const popProgress = (progress - 0.3) / 0.7;
                const s = 0.8 + Math.pow(popProgress, 2) * 2.5;
                this.scale.set(s, s, s);
                if (this.hasIce || this.hasFrozen || this.hasPressureCrack) {
                    this.bubble.material.opacity = (1 - popProgress) * 0.8;
                } else {
                    this.bubble.material.opacity = 0;
                }
                this.fish.material.opacity = 1 - popProgress;
                // Bright white flash
                this.fish.material.color.setRGB(5, 5, 5);
            }
            
            if (this.popTimer <= 0) {
                this.visible = false;
            }
        }
    }
    
    setGridPos(r, c, worldSize, gridSize) {
        this.gridPos = { r, c };
        const spacing = worldSize / gridSize;
        let x = (c - (gridSize - 1) / 2) * spacing;
        let y = ((gridSize - 1) / 2 - r) * spacing + 1.65; // Raised slightly more to fit bottom controls safely
        
        if (this.isGuardian) {
            // Center between r,c and r+1, c+1
            x += spacing * 0.5;
            y -= spacing * 0.5;
        }

        this.targetPos.set(x, y, 0);
    }

    onMatch() {
        this.isMatching = true;
        this.popTimer = 0.4;
    }

    onWiggle() {
        this.isWiggling = true;
        this.wiggleTimer = 0.5;
    }

    async castHazard(biomeName = '') {
        if (!this.isGuardian) return;
        
        // Visual feedback for casting: intense glow and scale pulse
        const originalScale = this.fish.scale.clone();
        const flashColor = new THREE.Color(0xffffff);
        const originalColor = new THREE.Color(0xffffff);
        
        // Biome-specific glow colors
        let glowColor = 0xffffff;
        if (biomeName.includes('Arctic')) glowColor = 0x00ffff;
        else if (biomeName.includes('Volcanic')) glowColor = 0xff3300;
        else if (biomeName.includes('Shipwreck')) glowColor = 0x00ff00; // Ink green/teal
        else if (biomeName.includes('Bioluminescent')) glowColor = 0x00ffff;

        // 1. Anticipation: grow slightly and pulse glow
        this.fish.scale.multiplyScalar(1.2);
        this.fish.material.color.setRGB(2, 2, 2); // Overbrighten
        
        if (this.guardianColorIndicator) {
            this.guardianColorIndicator.scale.multiplyScalar(1.5);
            this.guardianColorIndicator.material.opacity = 1.0;
        }

        await new Promise(r => setTimeout(r, 400));
        
        // 2. The Cast: slam or roar
        this.fish.scale.copy(originalScale).multiplyScalar(1.5);
        this.fish.material.color.setRGB(5, 5, 5);
        
        // Shake self
        this.onWiggle();
        
        await new Promise(r => setTimeout(r, 600));
        
        // 3. Recover
        this.fish.scale.copy(originalScale);
        this.fish.material.color.copy(originalColor);
        
        if (this.guardianColorIndicator) {
            this.guardianColorIndicator.scale.set(this.size * 2.8, this.size * 2.8, 1);
            this.guardianColorIndicator.material.opacity = 0.5;
        }
    }

    updateSprite() {
        const loader = new THREE.TextureLoader();
        this.fish.material.map = loader.load(this.fishConfig.sprite);
        this.fish.material.needsUpdate = true;
        
        // Update glow if it's a powerup
        if (this.isPowerUp && this.glow) {
            this.glow.material.color.set(this.fishConfig.id === 'RAINBOW_POWERUP' ? 0xffffff : 0xffd700);
        }
    }

    dispose() {
        this.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
    }
}
