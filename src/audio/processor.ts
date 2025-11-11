// Holds a global counter for the last processor id assigned.
let lastProcessorId = 0;

/**
 * A base class for all audio processors.
 *
 * Processors are nodes that can be connected to the audio graph. They are
 * responsible for processing the audio signal in some way. They also include a
 * formalized parameter collection under `params` that represents configurable
 * properties of the processor.
 *
 * An example usage of a processor is any effect such as a reverb, compressor,
 * equalizer, etc. Additionally, sources can also be considered processors, as
 * they are nodes that produce audio signal.
 *
 * @template P - The parameters of the processor.
 */
export abstract class Processor<P extends object> {
    /**
     * A unique identifier for the processor. Useful for debugging, serialization,
     * and removal from chains.
     */
    readonly id: string;

    /**
     * The parameters of the processor.
     */
    abstract readonly params: P;

    protected context: AudioContext;
    abstract input: AudioNode;
    abstract output: AudioNode;

    constructor(context: AudioContext) {
        this.id = `${this.constructor.name}-${lastProcessorId++}`;
        this.context = context;
    }

    /**
     * Deserialize the parameters of the processor from an object.
     *
     * @param data - The object to deserialize the parameters from.
     */
    fromJSON(data: object): void {
        //deserializeParams(this.params, data);
    }

    /**
     * Serialize the parameters of the processor into an object.
     *
     * @returns An object containing the serialized parameters.
     */
    toJSON(): void {
        //return serializeParams(this.params);
    }

    /**
     * Connect the processor to a target node.
     *
     * @param target - The target node to connect to.
     */
    abstract connect(target: AudioNode): void;

    /**
     * Disconnect the processor from a target node.
     */
    abstract disconnect(): void;
}
