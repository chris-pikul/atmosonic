import type { Accessor } from 'solid-js';

export interface Source {
    connect(target: AudioNode): void;
    disconnect(): void;
    play(start?: number): void;
    beforePlay(node: AudioBufferSourceNode): void;
    pause(): void;
    resume(start?: number): void;
    stop(): void;
    destroy(): void;
    readonly elapsedTime: number;
    readonly isLoaded: Accessor<boolean>;
    readonly isPlaying: Accessor<boolean>;
}
