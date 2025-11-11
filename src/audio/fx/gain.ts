import { UnitParam } from '../params';
import { Processor } from '../processor';

export class GainParams {
    gain = new UnitParam(1.0);
}

/**
 * A gain processor is an effect that can be used to adjust the volume of an audio signal.
 */
export class Gain extends Processor<GainParams> {
    readonly params = new GainParams();
    readonly input: GainNode;
    readonly output: GainNode;

    constructor(context: AudioContext) {
        super(context);
        this.input = this.output = this.context.createGain();

        // Reactively update gain
        this.params.gain.onChange((v) => this.output.gain.setValueAtTime(v, this.context.currentTime));
    }

    connect(target: AudioNode) {
        this.output.connect(target);
    }

    disconnect() {
        this.output.disconnect();
    }
}
