import { createEffect, createRoot, createSignal, type Signal } from 'solid-js';
import { LoopSampleSource, type Source } from './sources';
import type { LoopSampleSourceJSON } from './sources/loop-sample';

export interface TrackJSON {
    id: string;
    name: string;
    volume: number;
    pan: number;
    initialDelay: [number, number];
    source?: LoopSampleSourceJSON;
}

export class Track {
    static async fromJSON(context: AudioContext, data: TrackJSON): Promise<Track> {
        const track = new Track(context, data.id, data.name);
        track.volume = data.volume;
        track.pan = data.pan;
        track.initialDelay = data.initialDelay;

        if (data.source) {
            if (data.source.type === 'loop') track.source = await LoopSampleSource.fromJSON(context, data.source);
        }
        return track;
    }

    id: string;
    name: string;

    context: AudioContext;
    output: GainNode;
    panNode: StereoPannerNode;
    source?: Source;
    dispose?: () => void;

    // @ts-expect-error - initialized in constructor
    private _volume: Signal<number>;
    // @ts-expect-error - initialized in constructor
    private _pan: Signal<number>;
    // @ts-expect-error - initialized in constructor
    private _isPlaying: Signal<boolean>;

    /**
     * When the engine itself starts, this declares the initial delay before the
     * track source starts playing. It is a tuple of [start, end] in seconds. It
     * is treated as a range, and the source will play for a random amount of time
     * between the start (inclusive) and end (exclusive). If both values are the
     * same, the source will play for the exact amount of time given, thus treating
     * the values as a constant delay.
     */
    // @ts-expect-error - initialized in constructor
    private _initialDelay: Signal<[number, number]>;

    constructor(ctx: AudioContext, id: string, name?: string) {
        this.context = ctx;
        this.id = id;
        this.name = name ?? `Track ${id}`;
        this.output = this.context.createGain();
        this.panNode = this.context.createStereoPanner();
        this.panNode.connect(this.output);

        this.dispose = createRoot((dispose) => {
            this._volume = createSignal(1.0);
            this._pan = createSignal(0.0);
            this._isPlaying = createSignal(false);
            this._initialDelay = createSignal([0, 0]);

            createEffect(() => (this.output.gain.value = this._volume[0]()));
            createEffect(() => (this.panNode.pan.value = this._pan[0]()));

            return dispose;
        });
    }

    toJSON(): TrackJSON {
        return {
            id: this.id,
            name: this.name,
            volume: this.volume,
            pan: this.pan,
            initialDelay: this.initialDelay,
        };
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

    get isPlaying(): boolean {
        return this._isPlaying[0]();
    }

    get initialDelay(): [number, number] {
        return this._initialDelay[0]();
    }
    set initialDelay(seconds: number | [number, number]) {
        this._initialDelay[1](typeof seconds === 'number' ? [seconds, seconds] : seconds);
    }

    play(start: number) {
        if (!this.source) return;
        const [min, max] = this.initialDelay;
        const delay = min === max ? min : min + Math.random() * (max - min);
        const startAt = start + delay;
        this.source.play(startAt);
        this._isPlaying[1](true);
    }

    pause() {
        if (!this.source) return;
        this.source.pause();
        this._isPlaying[1](false);
    }

    resume(start?: number) {
        if (!this.source) return;
        this.source.resume(start);
        this._isPlaying[1](true);
    }

    stop() {
        if (!this.source) return;
        this.source.stop();
        this._isPlaying[1](false);
    }

    destroy() {
        this.dispose?.();
        this.output.disconnect();
        this.panNode.disconnect();
    }

    setLoopSample(url: string) {
        this.source?.destroy();

        const src = new LoopSampleSource(this.context);
        src.load(url)
            .then(() => {
                src.connect(this.panNode);
                this.source = src;
            })
            .catch((error) => {
                console.error(`Error loading loop sample for track ${this.name}:`, error);
            });
    }
}
