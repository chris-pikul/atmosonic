import type { Track } from '@/audio';
import { createStereoMeter } from '@/meter/stereo-meter';
import { onCleanup, onMount } from 'solid-js';

export interface StereoPeakMeterProps {
    track: Track;
}

const ledWidth = 8;
const ledHeight = 4;
const ledSpacing = 1;
const ledCount = 24;
const peakWidth = 4;

const width = ledWidth * 2 + ledSpacing * 5 + peakWidth * 2;
const height = ledHeight * ledCount + ledSpacing * ledCount + 1;
const minDb = -42;

const thresholds = Array.from({ length: ledCount }, (_, i) => minDb + ((0 - minDb) / ledCount) * (i + 1));

const ledColor = (db: number) => {
    if (db > -3) return '#ff4040'; // red
    if (db > -10) return '#ffaa40'; // yellow
    return '#40ff40'; // green
};

function drawStrip(ctx: CanvasRenderingContext2D, x: number, db: number) {
    const active = thresholds.filter((t) => t <= db).length;
    for (let i = 0; i < ledCount; i++) {
        const segDb = thresholds[i];
        const y = height - (i + 1) * (height / ledCount);
        ctx.fillStyle = i < active ? ledColor(segDb) : 'rgba(50,50,50,0.2)';
        ctx.fillRect(x, y, ledWidth, ledHeight);
    }
}

function drawPeak(ctx: CanvasRenderingContext2D, x: number, db: number) {
    ctx.fillStyle = ledColor(db);
    ctx.fillRect(x, height - (db - minDb) * (height / (0 - minDb)), peakWidth, ledHeight);
}

function drawMeter(ctx: CanvasRenderingContext2D, lDb: number, rDb: number, peakL: number, peakR: number) {
    ctx.clearRect(0, 0, width, height);

    drawPeak(ctx, ledSpacing, peakL);
    drawStrip(ctx, ledSpacing * 2 + peakWidth, lDb);
    drawStrip(ctx, ledSpacing * 3 + peakWidth + ledWidth, rDb);
    drawPeak(ctx, ledSpacing * 4 + peakWidth + ledWidth * 2, peakR);
}

export function StereoPeakMeter(props: StereoPeakMeterProps) {
    let canvas!: HTMLCanvasElement;
    onMount(() => {
        const ctx = canvas.getContext('2d', { premultipliedAlpha: false }) as CanvasRenderingContext2D;
        if (!ctx) return;

        let peakHoldL = minDb;
        let peakHoldR = minDb;
        let holdTimerL = 0;
        let holdTimerR = 0;
        const holdTime = 300; // ms
        const decayRate = 1.0; // dB/frame after hold

        const stop = createStereoMeter(
            props.track.analyzerL,
            props.track.analyzerR,
            (lDb, rDb) => {
                const dt = 1000 / 30;

                // Left channel
                if (lDb > peakHoldL) {
                    peakHoldL = lDb;
                    holdTimerL = holdTime;
                } else if (holdTimerL > 0) {
                    holdTimerL -= dt;
                } else {
                    peakHoldL = Math.max(peakHoldL - decayRate, minDb);
                }

                // Right channel
                if (rDb > peakHoldR) {
                    peakHoldR = rDb;
                    holdTimerR = holdTime;
                } else if (holdTimerR > 0) {
                    holdTimerR -= dt;
                } else {
                    peakHoldR = Math.max(peakHoldR - decayRate, minDb);
                }

                drawMeter(ctx, lDb, rDb, peakHoldL, peakHoldR);
            },
            { fps: 30, floor: minDb },
        );
        onCleanup(() => stop());
    });

    return <canvas ref={canvas} width={width} height={height} style={{ 'background-color': 'black' }} />;
}
