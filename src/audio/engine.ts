import { Parameter, PolarParam, StringParam, UnitParam } from './params';
import { Track, type SerializedTrack } from './track';

export interface EngineJSON {
    version: number;
    volume: number;
    pan: number;
    tracks: SerializedTrack[];
}

class AudioEngine {
    static async fromJSON(context: AudioContext, data: EngineJSON): Promise<AudioEngine> {
        const engine = new AudioEngine();
        engine.volume.value = data.volume;
        engine.pan.value = data.pan;
        for (const trackData of data.tracks) {
            const track = await Track.fromJSON(context, trackData);
            engine.addTrack(track);
        }
        return engine;
    }

    context: AudioContext;
    masterGain: GainNode;
    masterPan: StereoPannerNode;

    volume = new UnitParam(1.0);
    pan = new PolarParam(0.0);
    state = new StringParam('stopped');
    tracks = new Parameter<Track[]>([]);
    private _trackId = 0;
    private _startTime = 0;

    constructor() {
        this.context = new AudioContext();
        this.masterGain = this.context.createGain();
        this.masterPan = this.context.createStereoPanner();
        this.masterPan.connect(this.masterGain);
        this.masterGain.connect(this.context.destination);

        this.volume.onChange((v) => (this.masterGain.gain.value = v));
        this.pan.onChange((v) => (this.masterPan.pan.value = v));
    }

    get startTime(): number {
        return this._startTime;
    }

    get elapsedTime(): number {
        if (this.state.value === 'stopped') return 0;
        return this.context.currentTime - this._startTime;
    }

    toJSON(): EngineJSON {
        return {
            version: 1,
            volume: this.volume.value,
            pan: this.pan.value,
            tracks: this.tracks.value.map((t) => t.toJSON()),
        };
    }

    async load(data: EngineJSON) {
        this.stop();

        this.volume.value = data.volume;
        this.pan.value = data.pan;

        const nextTracks: Track[] = [];
        for (const trackData of data.tracks) {
            const track = await Track.fromJSON(this.context, trackData);
            nextTracks.push(this.addTrack(track));
        }
        this.tracks.value = nextTracks;

        if (this.state.value === 'playing') {
            const now = this.context.currentTime;
            this.tracks.value.forEach((t) => t.play(now));
        }
    }

    play() {
        if (this.state.value === 'playing') return;
        this.context.resume().then(() => {
            const now = this.context.currentTime;
            this.tracks.value.forEach((t) => t.play(now));
            this._startTime = now;
            this.state.value = 'playing';
        });
    }

    pause() {
        if (this.state.value !== 'playing') return;
        this.context.suspend();
        this.tracks.value.forEach((t) => t.pause());
        this.state.value = 'paused';
    }

    resume() {
        if (this.state.value !== 'paused') return;
        this.context.resume().then(() => {
            const now = this.context.currentTime;
            this.tracks.value.forEach((t) => t.resume(now));
            this.state.value = 'playing';
        });
    }

    toggleState() {
        switch (this.state.value) {
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
        this.tracks.value.forEach((t) => t.stop());
        this._startTime = 0;
        this.state.value = 'stopped';
    }

    getTrack(id: string) {
        return this.tracks.value.find((t) => t.id === id);
    }

    addTrack(track: Track): Track {
        track.output.connect(this.masterPan);
        this.tracks.value = [...this.tracks.value, track];
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
        this.tracks.value = this.tracks.value.filter((t) => t.id !== id);
    }
}
export const audioEngine = new AudioEngine();
