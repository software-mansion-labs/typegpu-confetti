import { DEFAULT_PALETTE } from './defaults.ts';
import { type Config, MAX_PALETTE_COLORS } from './schemas.ts';
import type { d } from 'typegpu';

export const MAX_FRAME_DELTA_SECONDS = 1 / 15;

export type PlaybackState = 'running' | 'paused' | 'idle';

export interface RequestState {
  epoch: number;
  requestedTotal: number;
}

export function normalizeEmissionCount(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }
  return Math.min(Math.floor(amount), 0xffff_ffff);
}

export function normalizeCapacity(capacity: number, initialAmount: number): number {
  return Math.max(normalizeEmissionCount(capacity), normalizeEmissionCount(initialAmount), 1);
}

export function accumulateRequest(state: RequestState, amount: number): RequestState {
  const normalized = normalizeEmissionCount(amount);
  if (normalized === 0) {
    return state;
  }

  if (state.requestedTotal > 0xffff_ffff - normalized) {
    return { epoch: (state.epoch + 1) >>> 0, requestedTotal: normalized };
  }

  return { ...state, requestedTotal: state.requestedTotal + normalized };
}

export function restartRequest(epoch: number, initialAmount: number): RequestState {
  return {
    epoch: (epoch + 1) >>> 0,
    requestedTotal: normalizeEmissionCount(initialAmount),
  };
}

export interface NormalizedPalette {
  colors: [number, number, number, number][];
  truncated: boolean;
}

export function normalizePalette(
  palette: [number, number, number, number][] | undefined,
): NormalizedPalette {
  const source = palette && palette.length > 0 ? palette : DEFAULT_PALETTE;
  return {
    colors: source.slice(0, MAX_PALETTE_COLORS),
    truncated: source.length > MAX_PALETTE_COLORS,
  };
}

const TRANSPARENT: [number, number, number, number] = [0, 0, 0, 0];

/** Builds the CPU value of the `Config` uniform. Plain arrays keep `.write()` allocation-free. */
export function buildConfig(
  palette: [number, number, number, number][],
  size: number,
  lifetimeSeconds: number,
): d.InferInput<typeof Config> {
  return {
    size: Number.isFinite(size) ? size : 1,
    lifetimeSeconds: Number.isFinite(lifetimeSeconds) ? Math.max(lifetimeSeconds, 0) : 0,
    paletteCount: palette.length,
    reserved: 0,
    colors: Array.from({ length: MAX_PALETTE_COLORS }, (_, index) => {
      const color = palette[index];
      return color ? [color[0] / 255, color[1] / 255, color[2] / 255, color[3]] : TRANSPARENT;
    }),
  };
}

export function pausePlayback(state: PlaybackState): PlaybackState {
  return state === 'idle' ? 'idle' : 'paused';
}

export function resumePlayback(state: PlaybackState): PlaybackState {
  return state === 'paused' ? 'running' : state;
}
