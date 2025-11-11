import { usePollingParameter, useReadonlyParameter } from '@/audio/params';
import { audioEngine, useParameter } from '../audio';

export function Transport() {
    const state = useReadonlyParameter(audioEngine.state);
    const time = usePollingParameter(() => audioEngine.elapsedTime);
    const [volume, setVolume] = useParameter(audioEngine.volume);
    const [pan, setPan] = useParameter(audioEngine.pan);

    return (
        <section>
            <button onClick={() => audioEngine.toggleState()}>{state() === 'playing' ? 'Pause' : 'Play'}</button>
            <button onClick={() => audioEngine.stop()}>Stop</button>
            <span>Time: {time().toFixed(2)}</span>
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
        </section>
    );
}
