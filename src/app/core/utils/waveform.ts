/**
 * Deterministic, decorative bar heights (0-100) for a waveform-style
 * visualization — there's no real per-sample amplitude data available on
 * the client, so this fakes the "organic" look of one with a cheap fixed
 * hash instead of flat/random bars that would look uniform or jittery
 * across re-renders.
 */
export function pseudoWaveformHeights(count: number, minPercent = 30): number[] {
  return Array.from({ length: count }, (_, i) => {
    const seed = Math.sin(i * 12.9898) * 43758.5453;
    const fraction = seed - Math.floor(seed);
    return minPercent + fraction * (100 - minPercent);
  });
}
