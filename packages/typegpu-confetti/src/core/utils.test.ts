import { describe, expect, it } from 'vitest';
import { d } from 'typegpu';

import { ActiveToken, Config, FrameData, ParticleData, RenderInstance } from './schemas.ts';

import {
  accumulateRequest,
  buildConfig,
  normalizeCapacity,
  normalizeEmissionCount,
  normalizePalette,
  pausePlayback,
  restartRequest,
  resumePlayback,
} from './utils.ts';

describe('emission requests', () => {
  it('accumulates rapid requests without losing prior writes', () => {
    const first = accumulateRequest({ epoch: 3, requestedTotal: 10 }, 2.9);
    const second = accumulateRequest(first, 7);
    expect(second).toEqual({ epoch: 3, requestedTotal: 19 });
  });

  it('returns the same state for requests that do no work', () => {
    const state = { epoch: 1, requestedTotal: 5 };
    expect(accumulateRequest(state, 0)).toBe(state);
  });

  it('rolls the epoch instead of overflowing u32', () => {
    expect(accumulateRequest({ epoch: 1, requestedTotal: 0xffff_fff0 }, 32)).toEqual({
      epoch: 2,
      requestedTotal: 32,
    });
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, 0, -1])('normalizes %s to no work', (amount) =>
    expect(normalizeEmissionCount(amount)).toBe(0),
  );

  it('floors fractional counts', () => {
    expect(normalizeEmissionCount(12.99)).toBe(12);
  });

  it('never shrinks the pool below the initial burst', () => {
    expect(normalizeCapacity(10, 50)).toBe(50);
    expect(normalizeCapacity(0, 0)).toBe(1);
  });

  it('bumps the epoch on restart', () => {
    expect(restartRequest(7, 25)).toEqual({ epoch: 8, requestedTotal: 25 });
  });
});

describe('GPU data layouts', () => {
  it('keeps particle and stream records compact', () => {
    expect(d.sizeOf(ParticleData)).toBe(32);
    expect(d.sizeOf(ActiveToken)).toBe(8);
    expect(d.sizeOf(RenderInstance)).toBe(16);
  });

  it('keeps uniforms 16-byte aligned', () => {
    expect(d.sizeOf(FrameData) % 16).toBe(0);
    expect(d.sizeOf(Config) % 16).toBe(0);
  });
});

describe('config', () => {
  it('uses the default palette for an empty palette and caps colors', () => {
    expect(normalizePalette([]).colors).toHaveLength(5);
    const palette = Array.from(
      { length: 300 },
      () => [0, 0, 0, 1] as [number, number, number, number],
    );
    const normalized = normalizePalette(palette);
    expect(normalized.colors).toHaveLength(256);
    expect(normalized.truncated).toBe(true);
  });

  it('normalizes colors and zero-pads the palette array', () => {
    const config = buildConfig([[255, 0, 51, 0.5]], 1.5, 3);
    expect(config).toMatchObject({ size: 1.5, lifetimeSeconds: 3, paletteCount: 1 });
    expect(config.colors).toHaveLength(256);
    expect(config.colors[0]).toEqual([1, 0, 0.2, 0.5]);
    expect(config.colors[1]).toEqual([0, 0, 0, 0]);
  });
});

describe('playback', () => {
  it('pauses and resumes running playback', () => {
    expect(pausePlayback('running')).toBe('paused');
    expect(resumePlayback('paused')).toBe('running');
  });

  it('does not resume an already idle system', () => {
    expect(pausePlayback('idle')).toBe('idle');
    expect(resumePlayback('idle')).toBe('idle');
  });
});
