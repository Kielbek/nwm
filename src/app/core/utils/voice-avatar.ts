/** First letter of a voice's name, shown inside its avatar circle. */
export function voiceInitial(name: string): string {
  return name.slice(0, 1).toUpperCase();
}

/**
 * Turns a voice's flat swatch color into a two-tone diagonal gradient
 * (lighter top-left, darker bottom-right) — the same base palette, but with
 * enough depth to read as a deliberate avatar rather than a plain dot.
 */
export function voiceAvatarGradient(hex: string): string {
  const light = mix(hex, '#ffffff', 0.35);
  const dark = mix(hex, '#000000', 0.18);
  return `linear-gradient(135deg, ${light}, ${dark})`;
}

/**
 * A richer, larger "abstract orb" look for avatars shown at bigger sizes
 * (the Voices page cards) — a soft highlight blob plus a violet-tinted
 * accent blob layered over the same two-tone wash used elsewhere, so it
 * reads as a deliberate piece of art rather than a flat color swatch. No
 * photo is involved — voices are synthetic, there's no real person to
 * depict, so a real photo would misrepresent what's being sold.
 */
export function voiceAvatarOrb(hex: string): string {
  const highlight = mix(hex, '#ffffff', 0.7);
  const accent = mix(hex, '#6257d8', 0.45);
  const dark = mix(hex, '#000000', 0.22);
  return [
    `radial-gradient(circle at 28% 24%, ${highlight} 0%, transparent 42%)`,
    `radial-gradient(circle at 78% 82%, ${accent} 0%, transparent 55%)`,
    `linear-gradient(155deg, ${hex}, ${dark})`,
  ].join(', ');
}

function mix(hex: string, withHex: string, amount: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(withHex);
  const r = Math.round(a.r + (b.r - a.r) * amount);
  const g = Math.round(a.g + (b.g - a.g) * amount);
  const bl = Math.round(a.b + (b.b - a.b) * amount);
  return `rgb(${r} ${g} ${bl})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const value = parseInt(clean, 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}
