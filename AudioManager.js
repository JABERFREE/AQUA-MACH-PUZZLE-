import * as Tone from 'tone';

export class AudioManager {
    constructor() {
        this.synth = null;
        this.popSynth = null;
        this.reverb = null;
        
        this._lastClickTime = 0;
        this._lastPopTime = 0;
        this._lastStarPopTime = 0;
        this.isInitialized = false;
        this.isMuted = localStorage.getItem('aqua_match_muted') === 'true';
        
        // Music & SFX Volumes (Independent of ad master mute states)
        this.musicVolume = parseInt(localStorage.getItem('aqua_match_music_volume') ?? '100');
        this.sfxVolume = parseInt(localStorage.getItem('aqua_match_sfx_volume') ?? '100');
        
        this.musicVolumeNode = null;
        this.sfxVolumeNode = null;
        
        // Background drones/pads for each level
        this.currentDrone = null;
        this.droneOsc = null;
    }

    volumeToDb(percent) {
        if (percent <= 0) return -100; // Complete silence
        return Tone.gainToDb(percent / 100);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isInitialized) {
            Tone.Destination.mute = this.isMuted;
        }
        localStorage.setItem('aqua_match_muted', this.isMuted);
        return this.isMuted;
    }

    setMusicVolume(volume) {
        this.musicVolume = volume;
        localStorage.setItem('aqua_match_music_volume', volume);
        if (this.isInitialized && this.musicVolumeNode) {
            this.musicVolumeNode.volume.rampTo(this.volumeToDb(volume), 0.15);
        }
    }

    setSfxVolume(volume) {
        this.sfxVolume = volume;
        localStorage.setItem('aqua_match_sfx_volume', volume);
        if (this.isInitialized && this.sfxVolumeNode) {
            this.sfxVolumeNode.volume.rampTo(this.volumeToDb(volume), 0.15);
        }
    }
    
    async init() {
        if (this.isInitialized && Tone.context.state === 'running') return;
        if (this.isInitializing) return;
        this.isInitializing = true;
        
        try {
            await Tone.start();
            console.log("Audio Context state:", Tone.context.state);
        } catch (e) {
            console.warn("Tone.start() failed:", e);
            this.isInitializing = false;
            return;
        }
        
        if (this.isInitialized) {
            this.isInitializing = false;
            return;
        }
        this.musicVolumeNode = new Tone.Volume(this.volumeToDb(this.musicVolume)).toDestination();
        this.sfxVolumeNode = new Tone.Volume(this.volumeToDb(this.sfxVolume)).toDestination();
        
        // Initialize Synths with balanced polyphony
        this.synth = new Tone.PolySynth(Tone.Synth, {
            maxPolyphony: 32,
            oscillator: { type: "triangle" },
            envelope: {
                attack: 0.005,
                decay: 0.05,
                sustain: 0.1,
                release: 0.05
            }
        }).connect(this.sfxVolumeNode);
        this.synth.volume.value = -12;
        
        // Bubble Burst Tone Component
        this.popSynth = new Tone.PolySynth(Tone.MembraneSynth, {
            maxPolyphony: 32,
            pitchDecay: 0.05,
            octaves: 10,
            oscillator: { type: "sine" },
            envelope: {
                attack: 0.001,
                decay: 0.05,
                sustain: 0.01,
                release: 0.05,
                attackCurve: "exponential"
            }
        }).connect(this.sfxVolumeNode);
        this.popSynth.volume.value = -10;

        // Simplified Noise Component
        this.noiseSynth = new Tone.NoiseSynth({
            noise: { type: "pink" },
            envelope: {
                attack: 0.001,
                decay: 0.1,
                sustain: 0
            }
        }).connect(this.sfxVolumeNode);
        this.noiseSynth.volume.value = -20;
        
        this.reverb = new Tone.Reverb(2).connect(this.sfxVolumeNode);
        this.synth.connect(this.reverb);
        this.popSynth.connect(this.reverb);
        this.noiseSynth.connect(this.reverb);

        this.isInitialized = true;
        this.isInitializing = false;
        Tone.Destination.mute = this.isMuted;
        console.log("Audio fully initialized on user gesture.");
    }
    
    playPop(combo = 1) {
        if (!this.isInitialized) return;
        
        try {
            const now = Tone.now();
            const limit = combo > 1 ? 0.05 : 0.08;
            if (now < this._lastPopTime + limit) return;
            this._lastPopTime = now;
            
            const validCombo = (typeof combo !== 'number' || isNaN(combo)) ? 1 : Math.max(1, combo);
            const pitchMultiplier = 1.0 + (validCombo - 1) * 0.15;
            const basePitch = (350 + (Math.random() * 150)) * pitchMultiplier;
            
            const time = now + 0.1;
            this.popSynth.triggerAttackRelease(Math.min(basePitch, 3200), "32n", time);
            this.noiseSynth.triggerAttackRelease("16n", time);
        } catch (e) {
            console.warn("Audio pop error caught:", e);
        }
    }
    
    playLevelClear() {
        if (!this.isInitialized) return;
        try {
            const notes = ["C4", "E4", "G4", "B4", "C5"];
            const time = Tone.now() + 0.1;
            notes.forEach((note, i) => {
                this.synth.triggerAttackRelease(note, "8n", time + i * 0.1);
            });
        } catch (e) {
            console.warn("Audio error caught:", e);
        }
    }

    playPowerUp() {
        if (!this.isInitialized) return;
        try {
            const notes = ["C5", "E5", "G5", "C6"];
            const time = Tone.now() + 0.1;
            notes.forEach((note, i) => {
                this.synth.triggerAttackRelease(note, "16n", time + i * 0.05);
            });
            this.synth.triggerAttackRelease("G4", "2n", time + 0.2);
        } catch (e) {
            console.warn("Audio error caught:", e);
        }
    }

    playStarPop() {
        if (!this.isInitialized) return;
        try {
            const now = Tone.now();
            if (now < this._lastStarPopTime + 0.08) return;
            this._lastStarPopTime = now;

            const notes = ["C6", "E6", "G6"];
            const time = now + 0.1;
            notes.forEach((note, i) => {
                this.synth.triggerAttackRelease(note, "32n", time + i * 0.05);
            });
        } catch (e) {
            console.warn("Audio error caught:", e);
        }
    }

    playZap() {
        if (!this.isInitialized) return;
        try {
            const now = Tone.now() + 0.1;
            this.noiseSynth.triggerAttackRelease("4n", now);
            this.synth.triggerAttackRelease("C6", "8n", now);
            this.synth.triggerAttackRelease("G5", "8n", now + 0.05);
        } catch (e) {
            console.warn("Audio error caught:", e);
        }
    }

    playRocketSound() {
        if (!this.isInitialized) return;
        try {
            const now = Tone.now() + 0.1;
            this.noiseSynth.triggerAttackRelease("2n", now);
            this.popSynth.triggerAttackRelease(100, "4n", now);
        } catch (e) {
            console.warn("Audio error caught:", e);
        }
    }

    playChestOpen() {
        if (!this.isInitialized) return;
        try {
            const notes = ["G3", "C4", "G4", "C5"];
            const time = Tone.now() + 0.1;
            notes.forEach((note, i) => {
                this.synth.triggerAttackRelease(note, "8n", time + i * 0.1);
            });
            this.noiseSynth.triggerAttackRelease("4n", time);
        } catch (e) {
            console.warn("Audio error caught:", e);
        }
    }

    playShuffle() {
        if (!this.isInitialized) return;
        try {
            const notes = ["G4", "C4", "E4", "G3", "C3"];
            const time = Tone.now() + 0.1;
            notes.forEach((note, i) => {
                this.synth.triggerAttackRelease(note, "16n", time + i * 0.08);
            });
            this.noiseSynth.triggerAttackRelease("8n", time);
        } catch (e) {
            console.warn("Audio error caught:", e);
        }
    }

    playHover() {
        if (!this.isInitialized) return;
        try {
            const now = Tone.now() + 0.05;
            this.synth.triggerAttackRelease("C5", "32n", now, 0.1);
        } catch (e) {
            // Silently fail for hover
        }
    }

    playClick() {
        if (!this.isInitialized) return;
        try {
            const now = Tone.now() + 0.05;
            if (now > this._lastClickTime + 0.08) {
                this.popSynth.triggerAttackRelease(200, "16n", now);
                this.synth.triggerAttackRelease("G5", "16n", now);
                this._lastClickTime = now;
            }
        } catch (e) {
            // Silently fail for click
        }
    }

    playAdRewardSuccess() {
        if (!this.isInitialized) return;
        try {
            const notes = ["C5", "F5", "C6"];
            const time = Tone.now() + 0.1;
            notes.forEach((note, i) => {
                this.synth.triggerAttackRelease(note, "16n", time + i * 0.08);
            });
            this.synth.triggerAttackRelease(["E6", "G6", "B6"], "32n", time + 0.25);
        } catch (e) {
            console.warn("Audio error caught:", e);
        }
    }

    playIceCrack() {
        if (!this.isInitialized) return;
        try {
            const now = Tone.now() + 0.1;
            this.noiseSynth.triggerAttackRelease("16n", now);
            this.synth.triggerAttackRelease("C7", "32n", now);
        } catch (e) {
            console.warn("Audio error caught:", e);
        }
    }

    playStoneBreak() {
        if (!this.isInitialized) return;
        try {
            const now = Tone.now() + 0.1;
            this.noiseSynth.triggerAttackRelease("8n", now);
            this.popSynth.triggerAttackRelease(80, "8n", now);
        } catch (e) {
            console.warn("Audio error caught:", e);
        }
    }

    muteMusic() {
        if (this.droneOsc) {
            try {
                this.droneOsc.volume.rampTo(-60, 0.5, Tone.now());
            } catch (e) {}
        }
    }

    unmuteMusic() {
        if (this.droneOsc) {
            try {
                this.droneOsc.volume.rampTo(-30, 1, Tone.now());
            } catch (e) {}
        }
    }

    startBiomeSoundscape(biomeName) {
        // تم تعطيل الموسيقى الخلفية للـ Drone
        return;
    }

    startLevelSoundscape(levelIndex) {
        const biomeIndex = Math.floor(levelIndex / 250);
        const biomes = ['Bright Coral Reef', 'Sunken Ship', 'The Abyss', 'Deep Trench'];
        this.startBiomeSoundscape(biomes[biomeIndex] || biomes[0]);
    }

    stopLevelSoundscape() {
        if (this.droneOsc) {
            this.droneOsc.stop();
            this.droneOsc.dispose();
            this.droneOsc = null;
        }
    }

    updateHabitatMusic(habitatConfig) {
        // تم تعطيل موسيقى الـ Habitat
        return;
    }
}