export {
  // slots
  canvasAspectRatio,
  deltaTime,
  // function shells
  type GravityFn,
  gravity,
  gravityFn,
  type InitParticleFn,
  initParticle,
  initParticleFn,
  maxDurationTime,
  maxParticleAmount,
  particles,
  time,
} from './schemas.ts';

export type { ConfettiProps, ConfettiRef } from './types.ts';
export type {
  /** @deprecated Use `ConfettiProps` instead. */
  ConfettiProps as ConfettiPropTypes,
} from './types.ts';
