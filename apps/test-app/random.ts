import tgpu from 'typegpu';
import * as d from 'typegpu/data';

const randSeed = tgpu['~unstable'].privateVar(d.vec2f);
export const setupRandomSeed = tgpu['~unstable']
  .fn([d.vec2f])
  .does('(coord: vec2f) { randSeed = coord;}')
  .$uses({ randSeed });

export const rand01 = tgpu['~unstable']
  .fn([], d.f32)
  .does(/* wgsl */ `() -> f32 {
    let a = dot(randSeed, vec2f(23.14077926, 232.61690225));
    let b = dot(randSeed, vec2f(54.47856553, 345.84153136));
    randSeed.x = fract(cos(a) * 136.8168);
    randSeed.y = fract(cos(b) * 534.7645);
    return randSeed.y;
  }`)
  .$uses({ randSeed });
