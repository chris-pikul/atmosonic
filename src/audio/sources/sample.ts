import { type Accessor, type Signal, createRoot, createSignal } from 'solid-js';
import type { Source } from './source';

export abstract class SampleSource<P extends object> implements Source {
    protected context: AudioContext;
    protected gain: GainNode;
    protected node?: AudioBufferSourceNode;
    protected buffer?: AudioBuffer;
    abstract readonly params: P;

    // @ts-expect-error - initialized in constructor
    protected _isLoaded: Signal<boolean>;
    // @ts-expect-error - initialized in constructor
    protected _isPlaying: Signal<boolean>;

    protected _startTime = 0;
    protected _pauseTime = 0;

    protected dispose?: () => void;

    constructor(context: AudioContext) {
        this.context = context;
        this.gain = this.context.createGain();
        this.gain.gain.value = 1.0;

        this.dispose = createRoot((dispose) => {
            this._isLoaded = createSignal(false);
            this._isPlaying = createSignal(false);

            return dispose;
        });
    }

    get isLoaded(): Accessor<boolean> {
        return this._isLoaded[0];
    }

    get isPlaying(): Accessor<boolean> {
        return this._isPlaying[0];
    }

    get elapsedTime(): number {
        const elapsed = this.context.currentTime - this._startTime;
        return this.buffer ? elapsed % this.buffer.duration : elapsed;
    }

    async load(url: string) {
        const resp = await fetch(url);
        const buf = await resp.arrayBuffer();
        this.buffer = await this.context.decodeAudioData(buf);
        this._isLoaded[1](true);
    }

    connect(target: AudioNode) {
        this.gain.connect(target);
    }

    disconnect() {
        this.gain.disconnect();
        if (this.node) {
            try {
                this.node?.stop();
            } catch (_) {}
            this.node?.disconnect();
            this.node = undefined;
        }
    }

    play(start: number = 0, offset: number = 0): void {
        if (!this.buffer) return;

        const src = this.context.createBufferSource();
        src.buffer = this.buffer;
        src.connect(this.gain);
        src.start(start, offset);

        this.node = src;
        this._startTime = this.context.currentTime;
        this._isPlaying[1](true);
    }

    pause(): void {
        if (!this.node) return;

        try {
            this.node?.stop();
        } catch (_) {}
        this.node?.disconnect();
        this.node = undefined;

        this._pauseTime = this.elapsedTime;
        this._isPlaying[1](false);
    }

    resume(start?: number): void {
        this.play(start ?? this.context.currentTime, this._pauseTime);
    }

    stop(): void {
        try {
            this.node?.stop();
        } catch (_) {}
        this.node?.disconnect();
        this.node = undefined;

        this._startTime = 0;
        this._pauseTime = 0;
        this._isPlaying[1](false);
    }

    destroy(): void {
        this.stop();
        this.disconnect();
        this.dispose?.();
        this.buffer = undefined;
    }
}
