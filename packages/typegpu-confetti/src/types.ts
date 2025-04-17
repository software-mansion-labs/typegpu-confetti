import type { StyleProp, ViewStyle } from 'react-native';
import type { GravityFn, InitParticleFn } from './schemas';

export type ConfettiPropTypes = {
  colorPalette?: [number, number, number, number][];
  size?: number;
  maxDurationTime?: number | null;

  initParticleAmount?: number;
  maxParticleAmount?: number;

  gravity?: GravityFn;
  initParticle?: InitParticleFn;

  style?: StyleProp<ViewStyle>;
};

export type ConfettiRef = {
  pause: () => void;
  resume: () => void;
  restart: () => void;
  addParticles: (amount: number) => void;
};
