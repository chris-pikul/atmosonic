import { createEffect, createSignal, For, Match, onCleanup, Switch } from 'solid-js';
import './App.css';
import { audioEngine } from './audio';

function App() {
    const [time, setTime] = createSignal(0);

    createEffect(() => {
        if (audioEngine.state === 'playing') {
            const id = setInterval(() => setTime(audioEngine.context.currentTime - audioEngine.startTime), 100);
            onCleanup(() => clearInterval(id));
        }
    });

    return (
        <>
            <span>Time: {time().toPrecision(2)}s</span>
            <button onClick={() => audioEngine.toggleState()}>
                {audioEngine.state === 'playing' ? 'Pause' : 'Play'}
            </button>
            <button onClick={() => audioEngine.stop()}>Stop</button>

            <div>
                <h2>Master</h2>
                <label>
                    Volume
                    <input
                        type='range'
                        min='0'
                        max='1'
                        step='0.01'
                        value={audioEngine.volume}
                        onChange={(e) => (audioEngine.volume = parseFloat(e.target.value))}
                    />
                </label>
                <label>
                    Pan
                    <input
                        type='range'
                        min='-1'
                        max='1'
                        step='0.01'
                        value={audioEngine.pan}
                        onChange={(e) => (audioEngine.pan = parseFloat(e.target.value))}
                    />
                </label>
            </div>
            <div>
                <h2>Tracks</h2>
                <For each={audioEngine.tracks}>
                    {(track) => (
                        <div>
                            <h3>{track.name}</h3>
                            <button onClick={() => track.setLoopSample('/audio/samples/lovebird-chirp.wav')}>
                                Set Loop Sample
                            </button>
                            <label>
                                Volume
                                <input
                                    type='range'
                                    min='0'
                                    max='1'
                                    step='0.01'
                                    value={track.volume}
                                    onChange={(e) => (track.volume = parseFloat(e.target.value))}
                                />
                            </label>
                            <label>
                                Pan
                                <input
                                    type='range'
                                    min='-1'
                                    max='1'
                                    step='0.01'
                                    value={track.pan}
                                    onChange={(e) => (track.pan = parseFloat(e.target.value))}
                                />
                            </label>
                            <button onClick={() => audioEngine.removeTrack(track.id)}>Remove Track</button>
                        </div>
                    )}
                </For>
                <button onClick={() => audioEngine.createTrack()}>Create Track</button>
            </div>
        </>
    );
}

export default App;
