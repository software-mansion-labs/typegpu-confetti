import type { GravityFn, SpawnFn } from './schemas.ts';

export interface ConfettiProps {
  /** RGBA colors; RGB in 0–255, alpha in 0–1. At most 256 entries. Live-updatable. */
  colorPalette?: [number, number, number, number][] | undefined;
  /** Particle size multiplier. Live-updatable. */
  size?: number | undefined;
  /** Particle lifetime in seconds. Live-updatable. Defaults to 2. */
  lifetime?: number | undefined;
  /** Stop the frame loop once the last emitted particle has expired. Defaults to true. */
  autoStop?: boolean | undefined;
  /** Particles emitted on mount and on `restart()`. */
  initParticleAmount?: number | undefined;
  /** Fixed GPU pool capacity. Emissions beyond it overwrite the oldest ring slots. */
  maxParticleAmount?: number | undefined;
  /** GPU callback from position to acceleration. Changing it rebuilds pipelines and restarts. */
  gravity?: GravityFn | undefined;
  /** GPU callback returning initial kinematics. Changing it rebuilds pipelines and restarts. */
  spawn?: SpawnFn | undefined;
  /** Called when `autoStop` stops the frame loop after the last emitted particle has expired. */
  onEnd?: (() => void) | undefined;
}

export interface ConfettiRef {
  pause: () => void;
  resume: () => void;
  restart: () => void;
  emit: (amount: number) => void;
}
