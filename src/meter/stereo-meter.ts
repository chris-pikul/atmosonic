export interface StereoMeterOptions {
    // Target FPS for the meter. Default is 30.
    fps?: number;

    // The minimum decibel level to display. Default is -60.
    floor?: number;

    // The smoothing factor for the meter. Default is 0.8.
    smoothing?: number;
}

export function createStereoMeter(
    analyzerL: AnalyserNode,
    analyzerR: AnalyserNode,
    onLevel: (lDb: number, rDb: number) => void,
    options?: StereoMeterOptions,
) {
    const { fps = 30, floor = -60, smoothing = 0.8 } = options ?? {};

    analyzerL.smoothingTimeConstant = smoothing;
    analyzerR.smoothingTimeConstant = smoothing;
    analyzerL.fftSize = 2048;
    analyzerR.fftSize = 2048;

    // 2-channel peak arrays.
    const ch0 = new Float32Array(analyzerL.fftSize);
    const ch1 = new Float32Array(analyzerR.fftSize);

    // const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    const frameTime = 1000 / fps;
    let running = true;

    const loop = () => {
        if (!running) return;

        analyzerL.getFloatTimeDomainData(ch0);
        analyzerR.getFloatTimeDomainData(ch1);

        const lPeak = Math.max(...ch0.map(Math.abs));
        const rPeak = Math.max(...ch1.map(Math.abs));

        const lDb = 20 * Math.log10(lPeak || 1e-8);
        const rDb = 20 * Math.log10(rPeak || 1e-8);

        onLevel(Math.max(lDb, floor), Math.max(rDb, floor));
        setTimeout(loop, frameTime);
    };
    loop();

    return () => {
        running = false;
    };
}
