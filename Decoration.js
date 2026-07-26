import * as THREE from 'three';

export class Decoration extends THREE.Group {
    constructor(config, worldSize, levelIndex) {
        super();
        this.config = config;
        this.worldSize = worldSize;
        this.levelIndex = levelIndex;
        this.swayTime = Math.random() * Math.PI * 2;
        this.swaySpeed = 0.5 + Math.random() * 0.5;
        this.swayIntensity = 0.05 + Math.random() * 0.05;
        this.reactionPulse = 0;
        this.sprites = [];
        
        const textureLoader = new THREE.TextureLoader();
        
        if (!config) {
            // Default level decorations
            this.plantTexture = textureLoader.load('assets/giant-kelp-decoration.webp');
            const count = 3 + (levelIndex % 5);
            for (let i = 0; i < count; i++) {
                const x = (Math.random() - 0.5) * worldSize.x;
                const z = -4;
                const y = -worldSize.y / 2 + 1;
                
                const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ 
                    map: this.plantTexture,
                    color: 0x44ffaa 
                }));
                const s = 4 + Math.random() * 3;
                sprite.scale.set(s, s, 1);
                sprite.position.set(x, y, z);
                sprite.userData.baseRotation = 0;
                this.add(sprite);
                this.sprites.push(sprite);
            }
        } else {
            // Specific store decoration
            const texture = textureLoader.load(config.sprite);
            const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
            if (config.hue) {
                material.color.setHSL(config.hue / 360, 0.7, 0.6);
            }
            this.sprite = new THREE.Sprite(material);
            this.sprite.userData.baseRotation = 0;
            const scale = 2.0 + Math.random() * 0.5;
            this.sprite.scale.set(scale, scale, 1);
            this.add(this.sprite);
            this.sprites.push(this.sprite);

            this.type = config.id;
            this.interactCooldown = 0;
        }
    }

    update(delta) {
        if (this.interactCooldown > 0) {
            this.interactCooldown -= delta;
        }

        this.swayTime += delta * this.swaySpeed;
        this.reactionPulse *= 0.95; // Decay reaction

        const currentSway = Math.sin(this.swayTime) * (this.swayIntensity + this.reactionPulse);
        
        this.sprites.forEach(sprite => {
            // Apply sway as a Z-axis rotation for sprites
            sprite.material.rotation = currentSway;
        });

        // Biome-Specific Behaviors (New)
        const biomeIdx = Math.floor(this.levelIndex / 50);
        
        if (biomeIdx === 5) { // Volcanic Vents: Ember particles
            if (Math.random() < 0.02) this.emitHeatEmber();
        } else if (biomeIdx === 7) { // Bioluminescent Cave: Pulse color
            this.sprites.forEach(s => {
                if (s.material.color) {
                    const pulse = 0.8 + Math.sin(this.swayTime * 1.5) * 0.2;
                    s.material.opacity = pulse;
                }
            });
        } else if (biomeIdx === 6) { // Arctic Trench: Frozen effect
            this.swaySpeed *= 0.8; // Move slower in cold
        }

        // Specific Type Behaviors
        if (this.type === 'bubble_pipe' && Math.random() < 0.05) {
            this.emitBubble();
        }
        if (this.type === 'sea_mirror') {
            this.sprite.material.opacity = 0.7 + Math.sin(this.swayTime * 2) * 0.3;
        }
    }

    emitHeatEmber() {
        if (!this.parent) return;
        const texture = new THREE.TextureLoader().load('assets/realistic-crystal-bubble-v2.webp');
        const material = new THREE.SpriteMaterial({ 
            map: texture, 
            color: 0xff4400, 
            transparent: true, 
            opacity: 0.8,
            blending: THREE.AdditiveBlending 
        });
        const ember = new THREE.Sprite(material);
        ember.position.copy(this.position);
        ember.position.x += (Math.random() - 0.5) * 2;
        ember.scale.set(0.1, 0.1, 1);
        this.parent.add(ember);

        const startTime = performance.now();
        const animateEmber = () => {
            const elapsed = (performance.now() - startTime) / 1000;
            if (elapsed > 1.5) {
                this.parent.remove(ember);
                return;
            }
            ember.position.y += 0.05;
            ember.position.x += Math.sin(elapsed * 10) * 0.02;
            ember.material.opacity = 0.8 * (1 - elapsed / 1.5);
            ember.scale.multiplyScalar(0.98);
            requestAnimationFrame(animateEmber);
        };
        animateEmber();
    }

    emitBubble() {
        if (!this.parent) return;
        const texture = new THREE.TextureLoader().load('assets/crystal-bubble-webp-webp.webp');
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.6 });
        const bubble = new THREE.Sprite(material);
        bubble.position.copy(this.position);
        bubble.position.y += 0.5;
        bubble.scale.set(0.2, 0.2, 1);
        this.parent.add(bubble);

        // Simple bubble float up and fade
        const startTime = performance.now();
        const animateBubble = () => {
            const elapsed = (performance.now() - startTime) / 1000;
            if (elapsed > 2) {
                this.parent.remove(bubble);
                return;
            }
            bubble.position.y += 0.02;
            bubble.position.x += Math.sin(elapsed * 5) * 0.01;
            bubble.material.opacity = 0.6 * (1 - elapsed / 2);
            requestAnimationFrame(animateBubble);
        };
        animateBubble();
    }
    
    reactToFish() {
        this.reactionPulse = 0.15; // Initial kick when fish passes by
    }
    
    onTap() {
        if (this.interactCooldown > 0) return false;
        
        this.interactCooldown = 1.0;
        
        // Visual feedback
        if (this.sprite) {
            const originalScale = this.sprite.scale.clone();
            this.sprite.scale.multiplyScalar(1.2);
            setTimeout(() => {
                if (this.sprite) this.sprite.scale.copy(originalScale);
            }, 150);
        } else if (this.sprites.length > 0) {
            this.sprites.forEach(s => {
                const originalScale = s.scale.clone();
                s.scale.multiplyScalar(1.1);
                setTimeout(() => {
                    if (s) s.scale.copy(originalScale);
                }, 150);
            });
        }

        // Specific behaviors
        if (this.type === 'treasure_chest' || this.type === 'golden_chest') {
            window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'chest-open' }));
            // Trigger some bubbles
            return 'bubbles';
        } else if (this.type === 'bubble_pipe') {
            for (let i = 0; i < 10; i++) {
                setTimeout(() => this.emitBubble(), i * 100);
            }
            return 'bubbles';
        } else if (this.type && (this.type.includes('coral') || this.type === 'sea_mirror')) {
            window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'pop' }));
            this.reactionPulse = 0.5;
            return 'sway';
        }
        
        return true;
    }
}
