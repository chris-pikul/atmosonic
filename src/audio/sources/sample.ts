import type { Source } from './source';
import { Processor } from '../processor';
import { BoolParam } from '../params';

export abstract class SampleSource<P extends object> extends Processor<P> implements Source<P> {
    readonly input: GainNode;
    readonly output: GainNode;

    protected node?: AudioBufferSourceNode;
    protected buffer?: AudioBuffer;

    abstract readonly type: string;
    protected _isLoaded = new BoolParam(false);
    protected _isPlaying = new BoolParam(false);
    protected _startTime = 0;
    protected _pauseTime = 0;

    constructor(context: AudioContext) {
        super(context);
        this.input = this.output = this.context.createGain();
    }

    get isLoaded(): boolean {
        return this._isLoaded.value;
    }

    get isPlaying(): boolean {
        return this._isPlaying.value;
    }

    get elapsedTime(): number {
        const elapsed = this.context.currentTime - this._startTime;
        return this.buffer ? elapsed % this.buffer.duration : elapsed;
    }

    abstract fromJSON(data: object): void;
    abstract toJSON(): object;

    async load(url: string) {
        const resp = await fetch(url);
        const buf = await resp.arrayBuffer();
        this.buffer = await this.context.decodeAudioData(buf);
        this._isLoaded.value = true;
        console.log(`Loaded ${url} for source ${this.id}`);
    }

    connect(target: AudioNode) {
        this.output.connect(target);
        console.log(`Connected ${this.id} to ${target.constructor.name}`);
    }

    disconnect() {
        this.output.disconnect();

        if (this.node) {
            try {
                this.node?.stop();
            } catch (_) {}
            this.node?.disconnect();
            this.node = undefined;
        }
        console.log(`Disconnected ${this.id}`);
    }

    play(start: number = 0, offset: number = 0): void {
        if (!this.buffer) return;

        const src = this.context.createBufferSource();
        src.buffer = this.buffer;
        src.connect(this.output);
        src.start(start, offset);

        this.node = src;
        this._startTime = this.context.currentTime;
        this._isPlaying.value = true;
        console.log(`Playing ${this.id} from ${start} with offset ${offset}`);
    }

    pause(): void {
        if (!this.node) return;

        try {
            this.node?.stop();
        } catch (_) {}
        this.node?.disconnect();
        this.node = undefined;

        this._pauseTime = this.elapsedTime;
        this._isPlaying.value = false;
        console.log(`Paused ${this.id}`);
    }

    resume(start?: number): void {
        this.play(start ?? this.context.currentTime, this._pauseTime);
        console.log(`Resumed ${this.id} from ${start} with offset ${this._pauseTime}`);
    }

    stop(): void {
        try {
            this.node?.stop();
        } catch (_) {}
        this.node?.disconnect();
        this.node = undefined;

        this._startTime = 0;
        this._pauseTime = 0;
        this._isPlaying.value = false;
        console.log(`Stopped ${this.id}`);
    }

    destroy(): void {
        this.stop();
        this.disconnect();
        this.buffer = undefined;
        console.log(`Destroyed ${this.id}`);
    }
}
