export {
  //
  // slots
  //
  /** @deprecated Use `maxParticleAmountSlot` instead */
  maxParticleAmount,
  maxParticleAmount as maxParticleAmountSlot,
  /** @deprecated Use `gravitySlot` instead */
  gravity,
  gravity as gravitySlot,
  /** @deprecated Use `initParticleSlot` instead */
  initParticle,
  initParticle as initParticleSlot,
  /** @deprecated Use `maxDurationTimeSlot` instead */
  maxDurationTime,
  maxDurationTime as maxDurationTimeSlot,
  //
  // function shells
  //
  type GravityFn,
  gravityFn,
  type InitParticleFn,
  initParticleFn,
  //
  // accessors
  //
  /** @deprecated Use `deltaTimeAccess` instead */
  deltaTime,
  deltaTime as deltaTimeAccess,
  /** @deprecated Use `aspectRatioAccess` instead */
  canvasAspectRatio,
  canvasAspectRatio as aspectRatioAccess,
  /** @deprecated Use `particlesAccess` instead */
  particles,
  particles as particlesAccess,
  /** @deprecated Use `timeAccess` instead */
  time,
  time as timeAccess,
} from './core/schemas.ts';

export type { ConfettiProps, ConfettiRef } from './core/types.ts';
export type {
  /** @deprecated Use `ConfettiProps` instead. */
  ConfettiProps as ConfettiPropTypes,
} from './core/types.ts';
