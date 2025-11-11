import { PositiveParam, WaitParam, type ParamsOf } from '../params';
import { SampleSource } from './sample';

export class LoopSampleSourceParams {
    fadeIn = new WaitParam([0, 0]);
    loopStart = new PositiveParam(0);
}

export type LoopSampleSourceJSON = ParamsOf<typeof LoopSampleSourceParams> & {
    type: 'loop';
    url: string;
};

export class LoopSampleSource extends SampleSource<LoopSampleSourceParams> {
    static async fromJSON(context: AudioContext, data: LoopSampleSourceJSON): Promise<LoopSampleSource> {
        const sample = new LoopSampleSource(context);
        await sample.load(data.url);
        sample.params.loopStart.value = data.loopStart;
        sample.params.fadeIn.value = data.fadeIn;
        return sample;
    }

    readonly params = new LoopSampleSourceParams();
    readonly type = 'loop';
    private _url?: string;

    fromJSON(data: LoopSampleSourceJSON): void {
        this._url = data.url;
        this.params.loopStart.value = data.loopStart;
        this.params.fadeIn.value = data.fadeIn;
    }

    toJSON(): LoopSampleSourceJSON {
        return {
            type: 'loop',
            url: this._url!,
            loopStart: this.params.loopStart.value,
            fadeIn: this.params.fadeIn.value,
        };
    }

    async load(url: string) {
        await super.load(url);
        this._url = url;
    }

    play(start: number = 0, offset: number = 0, skipFade: boolean = false): void {
        if (!this.buffer) return;

        const src = this.context.createBufferSource();
        src.buffer = this.buffer;
        src.loop = true;
        src.loopStart = this.params.loopStart.value;
        src.connect(this.output);

        // Handle fade-in
        if (!skipFade) {
            const [min, max] = this.params.fadeIn.value;
            const fade = min === max ? min : min + Math.random() * (max - min);
            const g = this.output.gain;
            const now = this.context.currentTime;
            g.cancelScheduledValues(now);
            if (fade > 0) {
                g.setValueAtTime(0, now);
                g.linearRampToValueAtTime(1, now + fade);
            } else {
                g.setValueAtTime(1, now);
            }
        }
        src.start(start, offset);

        this.node = src;
        this._startTime = this.context.currentTime;
        this._isPlaying.value = true;
        console.log(`Playing ${this.id} from ${start} with offset ${offset}`);
    }

    resume(start?: number): void {
        this.play(start ?? this.context.currentTime, this._pauseTime, true);
        console.log(`Resumed ${this.id} from ${start} with offset ${this._pauseTime}`);
    }
}
