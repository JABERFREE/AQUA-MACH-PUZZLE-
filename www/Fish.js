/* 
 * PROJECT: AQUA MATCH PUZZLE
 * DEVELOPER: Emad Ibrahim
 * STUDIO: NexApp Development Studio
 * COPYRIGHT: © 2026 NexApp. All Rights Reserved.
 */

import * as THREE from 'three';

export class Fish extends THREE.Group {
    constructor(config, worldSize, traits = null) {
        super();
        this.config = config;
        this.worldSize = worldSize; // { x, y, z }
        
        // Default or inherited traits
        this.traits = traits || {
            hueShift: 0,
            sizeMult: 1.0,
            speedMult: 1.0,
            isGlowing: false,
            rarity: 'common',
            pattern: null, // { sprite, color }
            isHybrid: false,
            pedigree: null // { father: speciesId, mother: speciesId, generation: 0 }
        };

        const scale = (config.scale || 1.0) * this.traits.sizeMult;
        const speed = (config.speed || 2.0) * this.traits.speedMult;

        // Sprite creation
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load(config.sprite);
        const material = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true,
            opacity: 1
        });
        this.sprite = new THREE.Sprite(material);
        this.sprite.material = material.clone(); // Unique material for each fish
        
        // Apply Hue Shift
        if (this.traits.hueShift !== 0) {
            const color = new THREE.Color(0xffffff);
            const hsl = {};
            color.getHSL(hsl);
            this.sprite.material.color.setHSL((hsl.h + this.traits.hueShift / 360) % 1, hsl.s, hsl.l);
        }

        // Apply Pattern Overlay (Hybrid Genetic Trait)
        if (this.traits.pattern) {
            const patternTexture = textureLoader.load(this.traits.pattern.sprite);
            const patternMaterial = new THREE.SpriteMaterial({
                map: patternTexture,
                transparent: true,
                opacity: 0.7,
                color: this.traits.pattern.color || 0xffffff,
                blending: THREE.AdditiveBlending
            });
            this.patternSprite = new THREE.Sprite(patternMaterial);
            this.patternSprite.scale.multiplyScalar(0.8); // Slightly smaller
            this.patternSprite.position.z = 0.01; // Just in front
            this.add(this.patternSprite);
        }

        // Apply Glowing Trait
        if (this.traits.isGlowing || this.traits.isHybrid || config.rarity === 'Legendary') {
            const glowColor = config.rarity === 'Legendary' ? 0xffd700 : this.sprite.material.color.clone();
            this.glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                blending: THREE.AdditiveBlending,
                opacity: 0.6,
                color: glowColor
            }));
            this.glowSprite.scale.multiplyScalar(config.rarity === 'Legendary' ? 1.4 : 1.2);
            this.add(this.glowSprite);

            // Special Aura for Legendaries
            if (config.rarity === 'Legendary') {
                const auraTexture = textureLoader.load('assets/realistic-crystal-bubble-v2.webp');
                this.auraSprite = new THREE.Sprite(new THREE.SpriteMaterial({
                    map: auraTexture,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    opacity: 0.3,
                    color: 0xffaa00
                }));
                this.auraSprite.scale.set(3, 3, 1);
                this.add(this.auraSprite);
            }
        }

        // Hybrid-Only: Bioluminescent Pulse
        if (this.traits.isHybrid) {
            this.pulseSprite = new THREE.Sprite(new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                blending: THREE.AdditiveBlending,
                opacity: 0,
                color: 0x00ffff
            }));
            this.pulseSprite.scale.multiplyScalar(1.5);
            this.add(this.pulseSprite);
            this.pulseTimer = 0;
        }

        this.sprite.scale.set(scale * 1.5, scale * 1.5, 1);
        this.add(this.sprite);
        
        // Movement state
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * speed,
            (Math.random() - 0.5) * speed,
            (Math.random() - 0.5) * speed * 0.2
        );
        this.targetVelocity = this.velocity.clone();
        this.position.set(
            (Math.random() - 0.5) * worldSize.x,
            (Math.random() - 0.5) * worldSize.y,
            (Math.random() - 0.5) * worldSize.z
        );
        
        this.flashTimer = 0;
        this.flashIntensity = 0;
        this.originalScale = this.sprite.scale.clone();
        this.isCollected = false;
        this.speed = speed;
        this.targetFood = null;
        this.targetDecoration = null;
        this.happiness = 100; // 0 to 100
        this.isBaby = false;
        this.age = 100; // 0 to 100, 100 is adult
        this.breedingCooldown = 0;

        // Visual feedback for Genetic Traits
        if (this.traits.geneticTraits) {
            if (this.traits.geneticTraits.includes('AQUA_SPEED')) {
                // Fins/Speed particles or trail could go here, but let's do a simple color pulse
                this.speed *= 1.3;
            }
            if (this.traits.geneticTraits.includes('PEARL_MAGNET')) {
                // Golden highlight
                this.sprite.material.color.add(new THREE.Color(0x332200));
            }
        }
    }
    
    update(delta, foodItems = [], happiness = 100, otherEntities = []) {
        this.happiness = happiness;
        if (this.breedingCooldown > 0) this.breedingCooldown -= delta;

        // Growth logic
        if (this.isBaby) {
            this.age += delta * 2; // Grow to adult in 50 seconds
            if (this.age >= 100) {
                this.age = 100;
                this.isBaby = false;
            }
            const growthScale = 0.4 + (this.age / 100) * 0.6;
            this.sprite.scale.set(
                this.originalScale.x * growthScale, 
                this.originalScale.y * growthScale, 
                1
            );
            if (this.glowSprite) {
                this.glowSprite.scale.set(
                    Math.abs(this.sprite.scale.x) * 1.2,
                    Math.abs(this.sprite.scale.y) * 1.2,
                    1
                );
            }
        }

        // Animate glow pulse
        if (this.glowSprite) {
            const time = performance.now() * 0.002;
            this.glowSprite.material.opacity = 0.4 + Math.sin(time * 2) * 0.2;
            
            if (this.auraSprite) {
                this.auraSprite.material.opacity = 0.15 + Math.sin(time * 1.5) * 0.1;
                this.auraSprite.rotation.z += delta * 0.5;
            }
        }

        // Hybrid-Only Pulse Effect
        if (this.traits.isHybrid && this.pulseSprite) {
            this.pulseTimer += delta;
            if (this.pulseTimer > 4.0) { // Pulse every 4 seconds
                const pulseAge = this.pulseTimer - 4.0;
                if (pulseAge < 1.0) {
                    this.pulseSprite.material.opacity = (1.0 - pulseAge) * 0.8;
                    this.pulseSprite.scale.set(
                        Math.abs(this.originalScale.x) * (1.5 + pulseAge * 2),
                        Math.abs(this.originalScale.y) * (1.5 + pulseAge * 2),
                        1
                    );
                } else {
                    this.pulseTimer = 0;
                    this.pulseSprite.material.opacity = 0;
                }
            }
        }

        // Detect items
        this.detectItems(foodItems, otherEntities);

        // Apply movement based on behavior
        this.applyBehavior(delta, otherEntities);
        
        // Update position
        this.position.add(this.velocity.clone().multiplyScalar(delta));
        
        // Boundaries
        this.checkBoundaries();
        
        // Update orientation (face movement direction)
        if (this.velocity.x > 0) {
            this.sprite.scale.x = Math.abs(this.originalScale.x);
            if (this.patternSprite) this.patternSprite.scale.x = Math.abs(this.patternSprite.scale.x);
        } else if (this.velocity.x < 0) {
            this.sprite.scale.x = -Math.abs(this.originalScale.x);
            if (this.patternSprite) this.patternSprite.scale.x = -Math.abs(this.patternSprite.scale.x);
        }
        
        // Update flash/glow effect
        if (this.flashTimer > 0) {
            this.flashTimer -= delta;
            this.flashIntensity = Math.max(0, this.flashIntensity - delta * 2);
            this.sprite.material.color.setRGB(1 + this.flashIntensity, 1 + this.flashIntensity, 1 + this.flashIntensity);
        }
    }

    detectItems(foodItems, otherEntities) {
        // Food detection
        if (foodItems.length > 0) {
            let nearestFood = null;
            let minFoodDist = 6;
            foodItems.forEach(food => {
                const dist = this.position.distanceTo(food.position);
                if (dist < minFoodDist) {
                    minFoodDist = dist;
                    nearestFood = food;
                }
            });
            this.targetFood = nearestFood;
        } else {
            this.targetFood = null;
        }

        // Decoration detection
        const personality = this.config.personality || 'social';
        let targetType = null;
        if (personality === 'territorial') targetType = 'sea_mirror';
        if (personality === 'curious') targetType = 'bubble_pipe';

        if (targetType) {
            let nearestDeco = null;
            let minDecoDist = 8;
            otherEntities.forEach(ent => {
                // Need to import Decoration or check type property
                if (ent.type === targetType) {
                    const dist = this.position.distanceTo(ent.position);
                    if (dist < minDecoDist) {
                        minDecoDist = dist;
                        nearestDeco = ent;
                    }
                }
            });
            this.targetDecoration = nearestDeco;
        } else {
            this.targetDecoration = null;
        }
    }
    
    applyBehavior(delta, otherEntities) {
        const personality = this.config.personality || 'social';
        let happinessFactor = 0.5 + (this.happiness / 100) * 0.5; // Speed 50% to 100%
        
        if (personality === 'lazy') happinessFactor *= 0.6;
        
        const currentSpeed = this.speed * happinessFactor;

        // Boid-like schooling behavior
        const steeringForce = new THREE.Vector3();
        const cohesion = new THREE.Vector3();
        const alignment = new THREE.Vector3();
        const separation = new THREE.Vector3();
        
        let neighbors = 0;
        const neighborDist = personality === 'social' || (this.traits && this.traits.isHybrid) ? 8.0 : 4.0;
        const separationDist = personality === 'solitary' ? 3.0 : 1.5;

        otherEntities.forEach(other => {
            if (other === this || !(other instanceof Fish)) return;

            const dist = this.position.distanceTo(other.position);
            
            // Territorial behavior: Chase away others
            if (personality === 'territorial' && dist < 3.0 && !this.targetDecoration && !(this.traits && this.traits.isHybrid)) {
                const chaseDir = new THREE.Vector3().subVectors(other.position, this.position).normalize();
                this.targetVelocity.copy(chaseDir).multiplyScalar(currentSpeed * 1.5);
                return; // Prioritize territorial chase
            }

            // Influence from others
            if (dist < neighborDist) {
                const otherPersonality = other.config.personality || 'social';
                
                // Hybrids are charismatic: everyone schools with them!
                const isCompatible = (personality === 'social' && otherPersonality === 'social') || 
                                    (other.config.id === this.config.id) ||
                                    (this.traits && this.traits.isHybrid) || (other.traits && other.traits.isHybrid);

                if (isCompatible) {
                    const weight = (other.traits && other.traits.isHybrid) ? 2.0 : 1.0;
                    cohesion.add(other.position.clone().multiplyScalar(weight));
                    alignment.add(other.velocity.clone().multiplyScalar(weight));
                    neighbors += weight;
                }

                if (dist < separationDist) {
                    const diff = new THREE.Vector3().subVectors(this.position, other.position);
                    diff.normalize().divideScalar(dist);
                    separation.add(diff);
                }
            }
        });

        if (neighbors > 0) {
            cohesion.divideScalar(neighbors).sub(this.position).multiplyScalar(0.02);
            alignment.divideScalar(neighbors).multiplyScalar(0.05);
            separation.multiplyScalar(0.1);

            steeringForce.add(cohesion).add(alignment).add(separation);
        } else {
            steeringForce.add(separation.multiplyScalar(0.2)); // Still avoid overcrowding if solitary
        }

        if (this.targetFood) {
            // Chase food
            const dir = new THREE.Vector3().subVectors(this.targetFood.position, this.position).normalize();
            this.targetVelocity.copy(dir).multiplyScalar(currentSpeed * 1.5);
        } else if (this.targetDecoration) {
            // Interact with decoration
            const dist = this.position.distanceTo(this.targetDecoration.position);
            const dir = new THREE.Vector3().subVectors(this.targetDecoration.position, this.position).normalize();
            
            if (dist > 1.5) {
                this.targetVelocity.copy(dir).multiplyScalar(currentSpeed * 1.2);
            } else {
                // Dance around it
                const orbit = new THREE.Vector3(-dir.y, dir.x, 0).normalize();
                this.targetVelocity.copy(orbit).multiplyScalar(currentSpeed * 0.8);
                if (Math.random() < 0.05) this.targetDecoration.reactToFish && this.targetDecoration.reactToFish();
            }
        } else {
            // Idle wandering behavior based on personality
            let wanderChance = 0.01;
            if (personality === 'lazy') wanderChance = 0.003;
            if (personality === 'curious') wanderChance = 0.02;

            if (Math.random() < wanderChance) {
                // Curious fish might move towards center or random "points of interest"
                if (personality === 'curious' && Math.random() < 0.3) {
                    this.targetVelocity.set(
                        (Math.random() - 0.5) * currentSpeed * 2,
                        (Math.random() - 0.5) * currentSpeed * 2,
                        (Math.random() - 0.5) * currentSpeed * 0.5
                    );
                } else {
                    this.targetVelocity.set(
                        (Math.random() - 0.5) * currentSpeed,
                        (Math.random() - 0.5) * currentSpeed,
                        (Math.random() - 0.5) * currentSpeed * 0.2
                    );
                }
            }
            this.targetVelocity.add(steeringForce);
        }
        
        // Final velocity application
        this.velocity.lerp(this.targetVelocity, 0.05);
        
        // Clamp velocity
        const maxVel = (personality === 'territorial' || personality === 'curious') && (this.targetFood || this.targetDecoration) ? currentSpeed * 2 : currentSpeed;
        if (this.velocity.length() > maxVel) {
            this.velocity.setLength(maxVel);
        }
    }
    
    checkBoundaries() {
        const margin = 2;
        const bounce = 0.1;
        
        if (this.position.x > this.worldSize.x / 2) {
            this.targetVelocity.x = -this.speed;
        } else if (this.position.x < -this.worldSize.x / 2) {
            this.targetVelocity.x = this.speed;
        }

        if (this.position.y > this.worldSize.y / 2) {
            this.targetVelocity.y = -this.speed;
        } else if (this.position.y < -this.worldSize.y / 2) {
            this.targetVelocity.y = this.speed;
        }

        if (this.position.z > this.worldSize.z / 2) {
            this.targetVelocity.z = -this.speed * 0.2;
        } else if (this.position.z < -this.worldSize.z / 2) {
            this.targetVelocity.z = this.speed * 0.2;
        }
    }
    
    onTap() {
        this.flashIntensity = 2.0;
        this.flashTimer = 0.5;
        
        // Sudden burst of speed
        this.velocity.multiplyScalar(2);
        
        // Small pop effect
        this.sprite.scale.set(this.originalScale.x * 1.3, this.originalScale.y * 1.3, 1);
        setTimeout(() => {
            this.sprite.scale.copy(this.originalScale);
        }, 200);
        
        return true;
    }
}
