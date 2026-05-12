import type { GravityFn, InitParticleFn } from './schemas.ts';

export interface ConfettiProps {
  colorPalette?: [number, number, number, number][] | undefined;
  size?: number | undefined;
  maxDurationTime?: number | null;

  initParticleAmount?: number;
  maxParticleAmount?: number;

  gravity?: GravityFn;
  initParticle?: InitParticleFn;
}

export interface ConfettiRef {
  pause: () => void;
  resume: () => void;
  restart: () => void;
  addParticles: (amount: number) => void;
}
