import { LoopSampleSource, type Source } from './sources';
import type { LoopSampleSourceJSON } from './sources/loop-sample';
import type { Processor } from './processor';
import { Gain, Panner } from './fx';
import { BoolParam, PolarParam, RangeParam, UnitParam, type Range } from './params';

export interface SerializedTrack {
    id: string;
    name: string;
    volume: number;
    pan: number;
    initialDelay: Range;
    source?: LoopSampleSourceJSON;
}

export class Track {
    static async fromJSON(context: AudioContext, data: SerializedTrack): Promise<Track> {
        const track = new Track(context, data.id, data.name);
        track.volume.value = data.volume;
        track.panning.value = data.pan;
        track.initialDelay.value = data.initialDelay;

        return track;
    }

    readonly id: string;
    readonly context: AudioContext;

    readonly analyzer: AnalyserNode;
    readonly analyzerL: AnalyserNode;
    readonly analyzerR: AnalyserNode;

    // The mix-down output gain node. From here it goes through analyzers and then to the final output.
    readonly output: GainNode;

    private _source?: Source;
    private _fx: Processor<any>[] = [];
    private _gain: Gain;
    private _pan: Panner;

    name: string;
    volume = new UnitParam(1.0);
    panning = new PolarParam(0.0);
    initialDelay = new RangeParam([0, 0]);
    private _isPlaying = new BoolParam(false);

    constructor(ctx: AudioContext, id: string, name?: string) {
        this.id = id;
        this.context = ctx;

        this.analyzer = this.context.createAnalyser();
        this.analyzerL = this.context.createAnalyser();
        this.analyzerR = this.context.createAnalyser();

        const merger = this.context.createChannelMerger(2);
        this.analyzerL.connect(merger, 0, 0);
        this.analyzerR.connect(merger, 0, 1);
        merger.connect(this.analyzer);

        this.output = this.context.createGain();
        const splitter = this.context.createChannelSplitter(2);
        splitter.connect(this.analyzerL, 0);
        splitter.connect(this.analyzerR, 1);
        this.output.connect(splitter);

        this._gain = new Gain(this.context);
        this._pan = new Panner(this.context);

        this.name = name ?? `Track ${id}`;

        this.volume.onChange((v) => (this._gain.params.gain.value = v));
        this.panning.onChange((v) => (this._pan.params.pan.value = v));
    }

    toJSON(): SerializedTrack {
        return {
            id: this.id,
            name: this.name,
            volume: this.volume.value,
            pan: this.panning.value,
            initialDelay: this.initialDelay.value,
        };
    }

    get isPlaying(): boolean {
        return this._isPlaying.value;
    }

    get source(): Source | undefined {
        return this._source;
    }
    set source(src: Source | null) {
        this._source = src ?? undefined;
        this.rebuildChain();
    }

    connect(target: AudioNode) {
        this.analyzer.connect(target);
    }

    disconnect() {
        this._source?.disconnect();
        this._fx.forEach((fx) => fx.disconnect());
        this._gain.disconnect();
        this._pan.disconnect();
    }

    addFX(fx: Processor<any>) {
        this._fx.push(fx);
        this.rebuildChain();
    }

    removeFX(id: string) {
        const fx = this._fx.find((fx) => fx.id === id);
        if (fx) {
            fx.disconnect();
            this._fx = this._fx.filter((f) => f.id !== id);
            this.rebuildChain();
        }
    }

    private rebuildChain() {
        // First, disconnect everything
        this.disconnect();

        // No source, no chain, there is nothing to generate audio.
        if (!this._source) return;

        // Chain them in order.
        let last: AudioNode = this._source.output;
        for (const fx of this._fx) {
            last.connect(fx.input);
            last = fx.output;
        }

        // Add fixed processors the chain last.
        last.connect(this._gain.input);
        this._gain.connect(this._pan.input);
        this._pan.connect(this.output);
    }

    play(start: number) {
        if (!this.source) return;
        const [min, max] = this.initialDelay.value;
        const delay = min === max ? min : min + Math.random() * (max - min);
        const startAt = start + delay;
        this.source.play(startAt);
        this._isPlaying.value = true;
    }

    pause() {
        if (!this.source) return;
        this.source.pause();
        this._isPlaying.value = false;
    }

    resume(start?: number) {
        if (!this.source) return;
        this.source.resume(start);
        this._isPlaying.value = true;
    }

    stop() {
        if (!this.source) return;
        this.source.stop();
        this._isPlaying.value = false;
    }

    destroy() {
        this.disconnect();
        this.output.disconnect();
    }

    setLoopSample(url: string) {
        this.source?.destroy();

        const src = new LoopSampleSource(this.context);
        this.source = src;
        src.load(url)
            .then(() => {})
            .catch((error) => {
                console.error(`Error loading loop sample for track ${this.name}:`, error);
            });
    }
}
