import { SampleSource } from './sample';

export interface LoopSampleSourceJSON {
    type: 'loop';
    url: string;
    loopStart?: number;
}

export class LoopSampleSource extends SampleSource {
    static async fromJSON(context: AudioContext, data: LoopSampleSourceJSON): Promise<LoopSampleSource> {
        const sample = new LoopSampleSource(context);
        await sample.load(data.url);
        if (data.loopStart !== undefined) sample._loopStart = data.loopStart;
        return sample;
    }

    private _url?: string;
    private _loopStart = 0;

    toJSON(): LoopSampleSourceJSON {
        return {
            type: 'loop',
            url: this._url!,
            loopStart: this._loopStart,
        };
    }

    async load(url: string) {
        await super.load(url);
        this._url = url;
    }

    beforePlay(node: AudioBufferSourceNode) {
        node.loop = true;
        node.loopStart = this._loopStart;
    }
}
