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
} from './core/schemas.ts';

export type { ConfettiProps, ConfettiRef } from './core/types.ts';
export type {
  /** @deprecated Use `ConfettiProps` instead. */
  ConfettiProps as ConfettiPropTypes,
} from './core/types.ts';
