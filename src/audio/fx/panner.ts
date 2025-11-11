import { PolarParam } from '../params';
import { Processor } from '../processor';

export class PannerParams {
    pan = new PolarParam(0.0);
}

export class Panner extends Processor<PannerParams> {
    readonly params = new PannerParams();
    readonly input: StereoPannerNode;
    readonly output: StereoPannerNode;

    constructor(context: AudioContext) {
        super(context);
        this.input = this.output = this.context.createStereoPanner();

        // Reactively update pan
        this.params.pan.onChange((v) => this.output.pan.setValueAtTime(v, this.context.currentTime));
    }

    connect(target: AudioNode) {
        this.output.connect(target);
    }

    disconnect() {
        this.output.disconnect();
    }
}
