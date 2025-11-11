import { audioEngine } from '@/audio';
import { useReadonlyParameter } from '@/audio/params';
import { For } from 'solid-js';
import { TrackStrip } from './Track';

export function Tracks() {
    const tracks = useReadonlyParameter(audioEngine.tracks);

    return (
        <article>
            <For each={tracks()}>{(track) => <TrackStrip id={track.id} track={track} />}</For>

            <section>
                <button onClick={() => audioEngine.createTrack()}>Create Track</button>
            </section>
        </article>
    );
}
