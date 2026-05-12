import { randf } from '@typegpu/noise';
import tgpu, { d, std, type TgpuFn } from 'typegpu';

// #region data structures

export const VertexOutput = {
  position: d.builtin.position,
  color: d.vec4f,
  isExpired: d.interpolate('flat', d.u32),
};

export const ParticleGeometry = d.struct({
  tilt: d.f32,
  angle: d.f32,
  color: d.vec4f,
});

export const ParticleData = d.struct({
  position: d.vec2f,
  velocity: d.vec2f,
  seed: d.f32,
  timeLeft: d.f32,
});

// #endregion

// #region slots

export const maxDurationTime = tgpu.slot<number>();
export const initParticle = tgpu.slot<TgpuFn<(index: d.I32) => d.Void>>();
export const gravity = tgpu.slot<TgpuFn<(pos: d.Vec2f) => d.Vec2f>>();

export const canvasAspectRatio = tgpu.accessor(d.f32);
export const particlesAccess = tgpu.accessor(d.arrayOf(ParticleData, 1));
export const maxParticleAmountAccess = tgpu.accessor(d.i32);
export const deltaTime = tgpu.accessor(d.f32);
export const time = tgpu.accessor(d.f32);

// #endregion

// #region functions

export type GravityFn = (pos: d.v2f) => d.v2f;
export const gravityFn = tgpu.fn([d.vec2f], d.vec2f);

export type InitParticleFn = (index: number) => void;
export const initParticleFn = tgpu.fn([d.i32]);

export const rotate = tgpu.fn(
  [d.vec2f, d.f32],
  d.vec2f,
)(/* wgsl */ `(v: vec2f, angle: f32) -> vec2f {
  return vec2(
    (v.x * cos(angle)) - (v.y * sin(angle)),
    (v.x * sin(angle)) + (v.y * cos(angle))
  );
}`);

export const mainVert = tgpu.vertexFn({
  in: {
    tilt: d.f32,
    angle: d.f32,
    color: d.vec4f,
    vi: d.builtin.vertexIndex,
    ii: d.builtin.instanceIndex,
  },
  out: VertexOutput,
})(({ tilt, angle, color, vi, ii }) => {
  const particle = particlesAccess.$[ii];

  const width = tilt;
  const height = tilt / 2;

  if (particle.timeLeft < 0.1) {
    return { position: d.vec4f(), color: d.vec4f(), isExpired: 1 };
  }

  const geometry = [d.vec2f(0, 0), d.vec2f(width, 0), d.vec2f(0, height), d.vec2f(width, height)];
  const pos = rotate(geometry[vi].div(350), angle).add(particle.position);

  if (canvasAspectRatio.$ < 1) {
    const center = width / 2 / 350;
    pos.x -= particle.position.x + center;
    pos.x /= canvasAspectRatio.$;
    pos.x += particle.position.x + center;
  } else {
    const center = height / 2 / 350;
    pos.y -= particle.position.y + center;
    pos.y *= canvasAspectRatio.$;
    pos.y += particle.position.y + center;
  }

  const alpha = std.min(d.f32(particle.timeLeft) / 1000, 1);
  return {
    position: d.vec4f(pos, 0, 1),
    color: d.vec4f(color.rgb, 1).mul(color.a * alpha),
    isExpired: 0,
  };
});

export const mainFrag = tgpu.fragmentFn({
  in: VertexOutput,
  out: d.vec4f,
})(/* wgsl */ `{
    if (in.isExpired != 0) {
      discard;
    }

    return in.color;
  }`);

export const mainCompute = tgpu
  .computeFn({
    in: { gid: d.builtin.globalInvocationId },
    workgroupSize: [64],
  })(/* wgsl */ `{
    let index = in.gid.x;

    if particles[index].timeLeft < 0.01 {
      return;
    }

    let phase = (time / 300) + particles[index].seed;

    particles[index].velocity += gravity(particles[index].position) * deltaTime / 1000;
    particles[index].position += particles[index].velocity * deltaTime / 1000 + vec2f(sin(phase) / 600, cos(phase) / 500);
    particles[index].timeLeft -= deltaTime;
  }`)
  .$uses({ gravity, particles: particlesAccess, deltaTime, time });

export const defaultInitParticle: InitParticleFn = (i) => {
  'use gpu';
  const particle = particlesAccess.$[i];

  particle.position = d.vec2f(randf.sample() * 2 - 1, randf.sample() / 1.5 + 1);
  particle.velocity = d.vec2f(randf.sample() * 2 - 1, -(randf.sample() / 25 + 0.01) * 50);
};

const preInitParticle = initParticleFn((i) => {
  'use gpu';
  randf.seed2(d.vec2f(d.f32(i), d.f32(time.$ % 1111)));

  const particle = particlesAccess.$[i];
  particle.timeLeft = maxDurationTime.$ * 1000;
  particle.seed = randf.sample();
});

export const initCompute = tgpu.computeFn({
  in: { gid: d.builtin.globalInvocationId },
  workgroupSize: [1],
})((input) => {
  preInitParticle(d.i32(input.gid.x));
  initParticle.$(d.i32(input.gid.x));
});

export const addParticleCompute = () => {
  'use gpu';
  for (let i = 0; i < maxParticleAmountAccess.$; i++) {
    if (particlesAccess.$[i].timeLeft < 0.1) {
      preInitParticle(i);
      initParticle.$(i);
      return;
    }
  }

  let minTimeLeft = particlesAccess.$[0].timeLeft;
  let minIndex = d.i32(0);

  for (let i = 1; i < maxParticleAmountAccess.$; i++) {
    if (particlesAccess.$[i].timeLeft < minTimeLeft) {
      minTimeLeft = particlesAccess.$[i].timeLeft;
      minIndex = i;
    }
  }

  initParticle.$(minIndex);
};

// #endregion

// #region layouts

export const geometryLayout = tgpu.vertexLayout(d.arrayOf(ParticleGeometry), 'instance');

// #endregion
