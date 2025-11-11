import type { Accessor } from 'solid-js';

export interface Source<P extends object = object> {
    readonly params: P;

    connect(target: AudioNode): void;
    disconnect(): void;
    play(start?: number): void;
    pause(): void;
    resume(start?: number): void;
    stop(): void;
    destroy(): void;
    readonly elapsedTime: number;
    readonly isLoaded: Accessor<boolean>;
    readonly isPlaying: Accessor<boolean>;
}
