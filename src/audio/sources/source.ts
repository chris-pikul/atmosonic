import type { Processor } from '../processor';

export interface Source<P extends object = object> extends Processor<P> {
    play(start?: number): void;
    pause(): void;
    resume(start?: number): void;
    stop(): void;
    destroy(): void;

    // Runtime statuses.
    readonly type: string;
    readonly isLoaded: boolean;
    readonly isPlaying: boolean;
    readonly elapsedTime: number;
}
