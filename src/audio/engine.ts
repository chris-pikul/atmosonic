import { createEffect, createRoot, createSignal } from 'solid-js';
import { Track, type TrackJSON } from './track';

export interface EngineJSON {
    version: number;
    volume: number;
    pan: number;
    tracks: TrackJSON[];
}

class AudioEngine {
    static async fromJSON(context: AudioContext, data: EngineJSON): Promise<AudioEngine> {
        const engine = new AudioEngine();
        engine.volume = data.volume;
        engine.pan = data.pan;
        for (const trackData of data.tracks) {
            const track = await Track.fromJSON(context, trackData);
            engine.addTrack(track);
        }
        return engine;
    }

    context: AudioContext;
    masterGain: GainNode;
    masterPan: StereoPannerNode;

    private _state = createSignal('stopped');
    private _volume = createSignal(1.0);
    private _pan = createSignal(0.0);
    private _tracks = createSignal<Track[]>([]);
    private _trackId = 0;
    private _startTime = 0;

    constructor() {
        this.context = new AudioContext();
        this.masterGain = this.context.createGain();
        this.masterPan = this.context.createStereoPanner();
        this.masterPan.connect(this.masterGain);
        this.masterGain.connect(this.context.destination);

        createEffect(() => (this.masterGain.gain.value = this._volume[0]()));
        createEffect(() => (this.masterPan.pan.value = this._pan[0]()));
    }

    get state(): string {
        return this._state[0]();
    }

    get volume(): number {
        return this._volume[0]();
    }
    set volume(unit: number) {
        this._volume[1](Math.min(Math.max(unit, 0.0), 1.0));
    }

    get pan(): number {
        return this._pan[0]();
    }
    set pan(unit: number) {
        this._pan[1](Math.min(Math.max(unit, -1.0), 1.0));
    }

    get tracks(): Track[] {
        return this._tracks[0]();
    }

    get startTime(): number {
        return this._startTime;
    }

    toJSON(): EngineJSON {
        return {
            version: 1,
            volume: this.volume,
            pan: this.pan,
            tracks: this.tracks.map((t) => t.toJSON()),
        };
    }

    async load(data: EngineJSON) {
        this.stop();

        this.volume = data.volume;
        this.pan = data.pan;

        const nextTracks: Track[] = [];
        for (const trackData of data.tracks) {
            const track = await Track.fromJSON(this.context, trackData);
            nextTracks.push(this.addTrack(track));
        }
        this._tracks[1](nextTracks);

        if (this.state === 'playing') {
            const now = this.context.currentTime;
            this.tracks.forEach((t) => t.play(now));
        }
    }

    play() {
        if (this.state === 'playing') return;
        this.context.resume().then(() => {
            const now = this.context.currentTime;
            this.tracks.forEach((t) => t.play(now));
            this._startTime = now;
            this._state[1]('playing');
        });
    }

    pause() {
        if (this.state !== 'playing') return;
        this.context.suspend();
        this.tracks.forEach((t) => t.pause());
        this._state[1]('paused');
    }

    resume() {
        if (this.state !== 'paused') return;
        this.context.resume().then(() => {
            const now = this.context.currentTime;
            this.tracks.forEach((t) => t.resume(now));
            this._state[1]('playing');
        });
    }

    toggleState() {
        switch (this.state) {
            case 'stopped':
                this.play();
                break;
            case 'playing':
                this.pause();
                break;
            case 'paused':
                this.resume();
                break;
        }
    }

    stop() {
        this.tracks.forEach((t) => t.stop());
        this._startTime = 0;
        this._state[1]('stopped');
    }

    getTrack(id: string) {
        return this.tracks.find((t) => t.id === id);
    }

    addTrack(track: Track): Track {
        track.output.connect(this.masterPan);
        this._tracks[1]([...this._tracks[0](), track]);
        return track;
    }

    createTrack(id?: string) {
        id = id ?? `track-${this._trackId++}`;
        const track = new Track(this.context, id);
        track.setLoopSample('/audio/samples/lovebird-chirp.wav');
        return this.addTrack(track);
    }

    removeTrack(id: string) {
        const track = this.getTrack(id);
        if (!track) return;
        track.destroy();
        this._tracks[1](this._tracks[0]().filter((t) => t.id !== id));
    }
}
export const audioEngine = createRoot(() => new AudioEngine());
