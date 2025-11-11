import { useParameter } from '@/audio/params';
import type { LoopSampleSource } from '@/audio/sources';

export type LoopSampleProps = {
    source: LoopSampleSource;
};

export function LoopSample(props: LoopSampleProps) {
    const [loopStart, setLoopStart] = useParameter(props.source.params.loopStart);
    const [fadeIn, setFadeIn] = useParameter(props.source.params.fadeIn);

    return (
        <div>
            <h3>Loop Sample</h3>

            <label>
                Loop Start:
                <input
                    type='number'
                    min='0'
                    value={loopStart()}
                    onChange={(e) => setLoopStart(Number(e.target.value))}
                />
            </label>
            <div>
                <h4>Fade In</h4>
                <label>
                    Min:
                    <input
                        type='number'
                        min='0'
                        value={fadeIn()[0]}
                        onChange={(e) => setFadeIn([Number(e.target.value), fadeIn()[1]])}
                    />
                </label>
                <label>
                    Max:
                    <input
                        type='number'
                        min='0'
                        value={fadeIn()[1]}
                        onChange={(e) => setFadeIn([fadeIn()[0], Number(e.target.value)])}
                    />
                </label>
            </div>
        </div>
    );
}
