import { randf } from '@typegpu/noise';
import * as d from 'typegpu/data';
import { particles } from './schemas';
import type { ConfettiPropTypes } from './types';

export const defaults: {
  [K in keyof ConfettiPropTypes]-?: NonNullable<ConfettiPropTypes[K]>;
} = {
  maxDurationTime: 2,
  initParticleAmount: 200,
  maxParticleAmount: 1000,

  size: 1,
  colorPalette: [
    [154, 177, 155, 1],
    [67, 129, 193, 1],
    [99, 71, 77, 1],
    [239, 121, 138, 1],
    [255, 166, 48, 1],
  ],

  gravity: () => {
    'use gpu';
    return d.vec2f(0, -0.3);
  },

  initParticle: (i) => {
    'use gpu';
    const particle = particles.value[i];

    particle.position = d.vec2f(
      randf.sample() * 2 - 1,
      randf.sample() / 1.5 + 1,
    );
    particle.velocity = d.vec2f(
      randf.sample() * 2 - 1,
      -(randf.sample() / 25 + 0.01) * 50,
    );

    particles.value[i] = particle;
  },
};
