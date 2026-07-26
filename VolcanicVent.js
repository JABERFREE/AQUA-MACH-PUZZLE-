/* 
 * PROJECT: AQUA MATCH PUZZLE
 * DEVELOPER: Emad Ibrahim
 * STUDIO: NexApp Development Studio
 * COPYRIGHT: © 2026 NexApp. All Rights Reserved.
 */

import * as THREE from 'three';

export class VolcanicVent extends THREE.Group {
    constructor(worldSize) {
        super();
        this.worldSize = worldSize;
        this.timer = 0;
        this.isActive = false;
        
        // Vent visual (at the bottom)
        const geo = new THREE.ConeGeometry(0.5, 1, 8);
        const mat = new THREE.MeshPhongMaterial({ color: 0x442200 });
        this.vent = new THREE.Mesh(geo, mat);
        this.vent.position.y = -worldSize.y / 2;
        this.add(this.vent);

        // Particle System using Points for better performance
        this.particleCount = 50;
        this.particles = new THREE.BufferGeometry();
        this.positions = new Float32Array(this.particleCount * 3);
        this.opacities = new Float32Array(this.particleCount);
        this.scales = new Float32Array(this.particleCount);
        this.velocities = [];

        for (let i = 0; i < this.particleCount; i++) {
            this.positions[i * 3] = 0;
            this.positions[i * 3 + 1] = -100; // Start off-screen
            this.positions[i * 3 + 2] = 0;
            this.opacities[i] = 0;
            this.scales[i] = 0;
            this.velocities.push(new THREE.Vector3(0, 0, 0));
        }

        this.particles.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.particles.setAttribute('opacity', new THREE.BufferAttribute(this.opacities, 1));
        
        const smokeTexture = new THREE.TextureLoader().load('assets/crystal-bubble-webp-webp.webp');
        this.smokeMaterial = new THREE.PointsMaterial({
            map: smokeTexture,
            color: 0x666666,
            transparent: true,
            size: 1.5,
            blending: THREE.NormalBlending,
            depthWrite: false
        });

        this.points = new THREE.Points(this.particles, this.smokeMaterial);
        this.add(this.points);
    }

    update(delta) {
        this.timer += delta;
        
        // Release smoke every 5-10 seconds
        if (this.timer > 8) {
            this.timer = 0;
            this.isActive = !this.isActive;
            if (this.isActive) {
                window.dispatchEvent(new CustomEvent('play-sfx', { detail: 'stone_break' }));
            }
        }

        if (this.isActive && Math.random() < 0.6) {
            this.spawnSmokeParticle();
        }

        const posAttr = this.particles.attributes.position;
        for (let i = 0; i < this.particleCount; i++) {
            if (this.opacities[i] > 0) {
                const idx = i * 3;
                posAttr.array[idx + 1] += delta * 1.5;
                posAttr.array[idx] += Math.sin(posAttr.array[idx + 1] * 1.5 + i) * 0.1 * delta * 60;
                
                this.opacities[i] -= delta * 0.15;
                if (this.opacities[i] <= 0 || posAttr.array[idx + 1] > 6) {
                    this.opacities[i] = 0;
                    posAttr.array[idx + 1] = -100;
                }
            }
        }
        posAttr.needsUpdate = true;
    }

    spawnSmokeParticle() {
        // Find an inactive particle
        for (let i = 0; i < this.particleCount; i++) {
            if (this.opacities[i] <= 0) {
                const idx = i * 3;
                this.positions[idx] = this.vent.position.x + (Math.random() - 0.5) * 1.0;
                this.positions[idx + 1] = this.vent.position.y + 0.5;
                this.positions[idx + 2] = this.vent.position.z;
                this.opacities[i] = 0.8;
                return;
            }
        }
    }
}
