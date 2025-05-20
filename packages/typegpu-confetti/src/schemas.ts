import { randf } from '@typegpu/noise';
import tgpu, { type TgpuFn } from 'typegpu';
import * as d from 'typegpu/data';

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

export const canvasAspectRatio = tgpu['~unstable'].accessor(d.f32);
export const particles = tgpu['~unstable'].accessor(d.arrayOf(ParticleData, 1));
export const maxDurationTime = tgpu['~unstable'].slot<number>();
export const initParticle =
  tgpu['~unstable'].slot<TgpuFn<{ index: d.I32 }, undefined>>();
export const maxParticleAmount = tgpu['~unstable'].slot<number>();
export const deltaTime = tgpu['~unstable'].accessor(d.f32);
export const time = tgpu['~unstable'].accessor(d.f32);
export const gravity =
  tgpu['~unstable'].slot<TgpuFn<{ pos: d.Vec2f }, d.Vec2f>>();

// #endregion

// #region functions

export type GravityFn = (args: { pos: d.v2f }) => d.v2f;
export const gravityFn = tgpu['~unstable'].fn({ pos: d.vec2f }, d.vec2f);

export type InitParticleFn = (args: { index: number }) => void;
export const initParticleFn = tgpu['~unstable'].fn({ index: d.i32 });

export const rotate = tgpu['~unstable'].fn(
  { v: d.vec2f, angle: d.f32 },
  d.vec2f,
)(/* wgsl */ `{
    return vec2(
      (v.x * cos(angle)) - (v.y * sin(angle)),
      (v.x * sin(angle)) + (v.y * cos(angle))
    );
  }`);

export const mainVert = tgpu['~unstable']
  .vertexFn({
    in: {
      tilt: d.f32,
      angle: d.f32,
      color: d.vec4f,
      center: d.vec2f,
      timeLeft: d.f32,
      index: d.builtin.vertexIndex,
    },
    out: VertexOutput,
  })(
    /* wgsl */ `{
      let width = in.tilt;
      let height = in.tilt / 2;

      if (in.timeLeft < 0.1) {
        return Out(vec4f(), vec4f(), 1);
      }

      let geometry = array<vec2f, 4>(
        vec2f(0, 0),
        vec2f(width, 0),
        vec2f(0, height),
        vec2f(width, height),
      );
      var pos = rotate(geometry[in.index] / 350, in.angle) + in.center;

      if (canvasAspectRatio < 1) {
        var center = width / 2 / 350;
        pos.x -= in.center.x + center;
        pos.x /= canvasAspectRatio;
        pos.x += in.center.x + center;
      } else {
        var center = height / 2 / 350;
        pos.y -= in.center.y + center;
        pos.y *= canvasAspectRatio;
        pos.y += in.center.y + center;
      }

      let alpha = min(f32(in.timeLeft) / 1000.f, 1);
      return Out(vec4f(pos, 0.0, 1.0), alpha * in.color.a * vec4f(in.color.rgb, 1), 0);
    }`,
  )
  .$uses({ rotate, canvasAspectRatio });

export const mainFrag = tgpu['~unstable'].fragmentFn({
  in: VertexOutput,
  out: d.vec4f,
})(/* wgsl */ `{
    if (in.isExpired != 0) {
      discard;
    }

    return in.color;
  }`);

export const mainCompute = tgpu['~unstable']
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
  .$uses({ gravity, particles, deltaTime, time });

export const defaultInitParticle: InitParticleFn = ({ index: i }) => {
  'kernel';
  // @ts-ignore
  const particle: d.Infer<typeof ParticleData> = particles.value[i];

  particle.position = d.vec2f(randf.sample() * 2 - 1, randf.sample() / 1.5 + 1);
  particle.velocity = d.vec2f(
    randf.sample() * 2 - 1,
    -(randf.sample() / 25 + 0.01) * 50,
  );

  particles.value[i] = particle;
};

const preInitParticle = initParticleFn(({ index: i }) => {
  'kernel';
  randf.seed2(d.vec2f(d.f32(i), d.f32(time.value % 1111)));

  // @ts-ignore
  const particle: d.Infer<typeof ParticleData> = particles.value[i];
  particle.timeLeft = maxDurationTime.value * 1000;
  particle.seed = randf.sample();

  particles.value[i] = particle;
});

export const initCompute = tgpu['~unstable'].computeFn({
  in: { gid: d.builtin.globalInvocationId },
  workgroupSize: [1],
})((input) => {
  preInitParticle({ index: d.i32(input.gid.x) });
  initParticle.value({ index: d.i32(input.gid.x) });
});

export const addParticleCompute = tgpu['~unstable']
  .computeFn({
    workgroupSize: [1],
  })(/* wgsl */ `{
      for (var i = 0; i < maxParticleAmount; i++) {
        if particles[i].timeLeft < 0.1 {
          preInitParticle(i);
          initParticle(i);
          return;
        }
      }

      var minTimeLeft = particles[0].timeLeft;
      var minIndex = 0;

      for (var i = 1; i < maxParticleAmount; i++) {
        if particles[i].timeLeft < minTimeLeft {
          minTimeLeft = particles[i].timeLeft;
          minIndex = i;
        }
      }

      initParticle(minIndex);
    }`)
  .$uses({
    particles,
    initParticle,
    maxParticleAmount,
    preInitParticle,
  });

// #endregion

// #region layouts

export const geometryLayout = tgpu.vertexLayout(
  (n: number) => d.arrayOf(ParticleGeometry, n),
  'instance',
);

export const dataLayout = tgpu.vertexLayout(
  (n: number) => d.arrayOf(ParticleData, n),
  'instance',
);

// #endregion
