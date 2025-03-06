import tgpu, { type TgpuFn } from 'typegpu';
import * as d from 'typegpu/data';

// #region data structures

export const VertexOutput = {
  position: d.builtin.position,
  color: d.vec4f,
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
  age: d.f32,
});

// #endregion

// #region slots

export const canvasAspectRatio = tgpu['~unstable'].accessor(d.f32);
export const particles = tgpu['~unstable'].accessor(d.arrayOf(ParticleData, 1));
export const maxDurationTime = tgpu['~unstable'].slot<number>();
export const initParticle =
  tgpu['~unstable'].slot<TgpuFn<[d.I32], undefined>>();
export const maxParticleAmount = tgpu['~unstable'].slot<number>();
export const deltaTime = tgpu['~unstable'].accessor(d.f32);
export const time = tgpu['~unstable'].accessor(d.f32);
export const gravity = tgpu['~unstable'].slot<TgpuFn<[d.Vec2f], d.Vec2f>>();

// #endregion

// #region functions

export const gravityFn = tgpu['~unstable'].fn([d.vec2f], d.vec2f);
export const initParticleFn = tgpu['~unstable'].fn([d.i32]);

export const rotate = tgpu['~unstable']
  .fn([d.vec2f, d.f32], d.vec2f)
  .does(/* wgsl */ `
    (v: vec2f, angle: f32) -> vec2f {
      return vec2(
        (v.x * cos(angle)) - (v.y * sin(angle)),
        (v.x * sin(angle)) + (v.y * cos(angle))
      );
  }`);

const randSeed = tgpu['~unstable'].privateVar(d.vec2f);
export const setupRandomSeed = tgpu['~unstable']
  .fn([d.vec2f])
  .does(/* wgsl */ '(coord: vec2f) { randSeed = coord;}')
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

export const mainVert = tgpu['~unstable']
  .vertexFn({
    in: {
      tilt: d.f32,
      angle: d.f32,
      color: d.vec4f,
      center: d.vec2f,
      age: d.f32,
      index: d.builtin.vertexIndex,
    },
    out: VertexOutput,
  })
  .does(
    /* wgsl */ `(in: VertexInput) -> VertexOutput {
        let width = in.tilt;
        let height = in.tilt / 2;
  
        let geometry = array<vec2f, 4>(
          vec2f(0, 0),
          vec2f(width, 0),
          vec2f(0, height),
          vec2f(width, height),
        );
        var pos = rotate(geometry[in.index] / 350, in.angle) + in.center;
  
        if (canvasAspectRatio < 1) {
          var center = (geometry[0].x + geometry[2].x) / 2;
          pos.x -= in.center.x + center;
          pos.x /= canvasAspectRatio;
          pos.x += in.center.x + center;
        } else {
          var center = (geometry[0].y + geometry[2].y) / 2;
          pos.y -= in.center.y + center;
          pos.y /= canvasAspectRatio;
          pos.y += in.center.y + center;
        }
  
        let alpha = min(f32(in.age) / 1000.f, 1);
        return VertexOutput(vec4f(pos, 0.0, 1.0), alpha * in.color.a * vec4f(in.color.rgb, 1));
    }`,
  )
  .$uses({ rotate, canvasAspectRatio });

export const mainFrag = tgpu['~unstable']
  .fragmentFn({
    in: VertexOutput,
    out: d.vec4f,
  })
  .does(/* wgsl */ `
    (in: FragmentIn) -> @location(0) vec4f {
      return in.color;
  }`);

export const mainCompute = tgpu['~unstable']
  .computeFn({
    in: { gid: d.builtin.globalInvocationId },
    workgroupSize: [64],
  })
  .does(/* wgsl */ `(in: ComputeIn) {
    let index = in.gid.x;
    if index == 0 {
      time += deltaTime;
    }
  
    if particles[index].age < 0.01 {
      return;
    }
  
    let phase = (time / 300) + particles[index].seed;
  
    particles[index].velocity += gravity(particles[index].position) * deltaTime / 1000;
    particles[index].position += particles[index].velocity * deltaTime / 1000 + vec2f(sin(phase) / 600, cos(phase) / 500);
    particles[index].age -= deltaTime;
  }`)
  .$uses({ gravity, particles, deltaTime, time });

export const defaultInitParticle = initParticleFn
  .does(/* wgsl */ `
  (i: i32) {
    setupRandomSeed(vec2f(f32(i), f32(i)));
    particles[i].age = maxDurationTime * 1000;
    particles[i].position = vec2f(rand01() * 2 - 1, rand01() / 1.5 + 1);
    particles[i].velocity = vec2f(
      rand01() * 2 - 1,
      -(rand01() / 25 + 0.01) * 50
    );
    particles[i].seed = rand01();
  }`)
  .$uses({
    particles,
    setupRandomSeed,
    rand01,
    maxDurationTime,
  });

export const initCompute = tgpu['~unstable']
  .computeFn({
    in: { gid: d.builtin.globalInvocationId },
    workgroupSize: [1],
  })
  .does(/* wgsl */ `(in: ComputeIn) {
    initParticle(i32(in.gid.x));
  }`)
  .$uses({ initParticle });

export const addParticleCompute = tgpu['~unstable']
  .computeFn({
    workgroupSize: [1],
  })
  .does(/* wgsl */ `() {
      for (var i = 0; i < maxParticleAmount; i++) {
        if particles[i].age < 0.1 {
          initParticle(i);
          return;
        }
      }

      var minAge = particles[0].age;
      var minIndex = 0;

      for (var i = 1; i < maxParticleAmount; i++) {
        if particles[i].age < minAge {
          minAge = particles[i].age;
          minIndex = i;
        }
      }

      initParticle(minIndex);
    }`)
  .$uses({
    rand01,
    setupRandomSeed,
    particles,
    initParticle,
    maxParticleAmount,
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
