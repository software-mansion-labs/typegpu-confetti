import { randf } from '@typegpu/noise';
import { d } from 'typegpu';

import { type GravityFn, ParticleInit, type SpawnFn } from './schemas.ts';

export const DEFAULT_PALETTE: [number, number, number, number][] = [
  [154, 177, 155, 1],
  [67, 129, 193, 1],
  [99, 71, 77, 1],
  [239, 121, 138, 1],
  [255, 166, 48, 1],
];

export const defaultGravity: GravityFn = () => {
  'use gpu';
  return d.vec2f(0, -0.3);
};

export const defaultSpawn: SpawnFn = () => {
  'use gpu';
  return ParticleInit({
    position: d.vec2f(randf.sample() * 2 - 1, randf.sample() / 1.5 + 1),
    velocity: d.vec2f(randf.sample() * 2 - 1, -(randf.sample() / 25 + 0.01) * 50),
  });
};

export const defaults = {
  lifetime: 2,
  autoStop: true,
  initParticleAmount: 200,
  maxParticleAmount: 1000,
  size: 1,
  colorPalette: DEFAULT_PALETTE,
  gravity: defaultGravity,
  spawn: defaultSpawn,
} as const;
