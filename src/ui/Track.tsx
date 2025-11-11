import { audioEngine, type Track } from '@/audio';
import { useParameter } from '@/audio/params';
import type { LoopSampleSource } from '@/audio/sources';
import { Match, Show, Switch } from 'solid-js';
import { LoopSample } from '@/ui/sources';
import { StereoPeakMeter } from './StereoPeakMeter';

export interface TrackProps {
    id: string;
    track: Track;
}

export function TrackStrip(props: TrackProps) {
    const [volume, setVolume] = useParameter(props.track.volume);
    const [pan, setPan] = useParameter(props.track.panning);
    const [initialDelay, setInitialDelay] = useParameter(props.track.initialDelay);

    return (
        <div>
            <span>{props.track.name}</span>
            <div>
                <h3>Initial Delay</h3>
                <label>
                    Min:
                    <input
                        type='number'
                        min='0'
                        value={initialDelay()[0]}
                        onChange={(e) => {
                            const value = Number(e.target.value);
                            const [_, max] = initialDelay();
                            setInitialDelay([value, max]);
                        }}
                    />
                </label>
                <label>
                    Max:
                    <input
                        type='number'
                        min='0'
                        value={initialDelay()[1]}
                        onChange={(e) => {
                            const value = Number(e.target.value);
                            const [min, _] = initialDelay();
                            setInitialDelay([min, value]);
                        }}
                    />
                </label>
            </div>
            <input
                type='range'
                min='0'
                max='1'
                step='0.01'
                value={volume()}
                onChange={(e) => setVolume(Number(e.target.value))}
            />
            <input
                type='range'
                min='-1'
                max='1'
                step='0.01'
                value={pan()}
                onChange={(e) => setPan(Number(e.target.value))}
            />
            <button onClick={() => audioEngine.removeTrack(props.id)}>Remove</button>

            <Show when={props.track.source}>
                <div>
                    <Switch>
                        <Match when={props.track.source!.type === 'loop'}>
                            <LoopSample source={props.track.source as LoopSampleSource} />
                        </Match>
                    </Switch>
                </div>
            </Show>

            <StereoPeakMeter track={props.track} />
        </div>
    );
}
