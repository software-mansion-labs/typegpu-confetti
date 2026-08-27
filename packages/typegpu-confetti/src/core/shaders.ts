import { randf } from '@typegpu/noise';
import { d, std, tgpu } from 'typegpu';

import {
  ActiveToken,
  activeTokensAAccess,
  activeTokensBAccess,
  capacityAccess,
  configAccess,
  controlAccess,
  DispatchArgs,
  drawArgsAccess,
  DrawArgs,
  frameAccess,
  gravitySlot,
  ParticleData,
  particlesAccess,
  renderInstancesAccess,
  RenderInstance,
  requestAccess,
  SpawnContext,
  spawnDispatchAccess,
  spawnSlot,
  updateDispatchAccess,
  VertexOutput,
  WORKGROUP_SIZE,
} from './schemas.ts';

const rotate = (value: d.v2f, angle: number): d.v2f => {
  'use gpu';
  const sine = std.sin(angle);
  const cosine = std.cos(angle);
  return d.vec2f(value.x * cosine - value.y * sine, value.x * sine + value.y * cosine);
};

/** Palette index, size, phase and spin packed into one byte each. */
function packVisual(): number {
  'use gpu';
  const paletteIndex = d.u32(randf.sample() * d.f32(configAccess.$.paletteCount));
  const size = d.u32(randf.sample() * 10) + 11;
  const phase = d.u32(randf.sample() * 256);
  const spin = d.u32(randf.sample() * 256);
  return paletteIndex + size * 256 + phase * 65_536 + spin * 16_777_216;
}

function appendLiveParticle(
  token: d.Infer<typeof ActiveToken>,
  particle: d.Infer<typeof ParticleData>,
) {
  'use gpu';
  const destIndex = std.atomicAdd(controlAccess.$.destCount, 1);
  if (destIndex >= capacityAccess.$) {
    return;
  }

  if (controlAccess.$.sourceParity === 0) {
    activeTokensBAccess.$[destIndex] = ActiveToken(token);
  } else {
    activeTokensAAccess.$[destIndex] = ActiveToken(token);
  }

  renderInstancesAccess.$[destIndex] = RenderInstance({
    position: particle.position,
    opacity: std.min(particle.timeLeft, 1),
    visual: particle.visual,
  });
}

/** Single invocation: consumes the emission request and writes indirect dispatch counts. */
export const prepareCompute = tgpu.computeFn({ workgroupSize: [1] })(() => {
  'use gpu';
  const requestedEpoch = requestAccess.$.epoch;
  const requestedTotal = requestAccess.$.requestedTotal;
  if (controlAccess.$.epoch !== requestedEpoch) {
    controlAccess.$.epoch = requestedEpoch;
    controlAccess.$.consumedTotal = 0;
    controlAccess.$.sourceCount = 0;
    controlAccess.$.sourceParity = 0;
  }

  const capacity = capacityAccess.$;
  let pendingCount = requestedTotal - controlAccess.$.consumedTotal;
  let emissionBase = controlAccess.$.consumedTotal;
  if (pendingCount > capacity) {
    pendingCount = capacity;
    emissionBase = requestedTotal - capacity;
  }

  controlAccess.$.pendingCount = pendingCount;
  controlAccess.$.emissionBase = emissionBase;
  controlAccess.$.consumedTotal = requestedTotal;
  std.atomicStore(controlAccess.$.destCount, 0);

  spawnDispatchAccess.$ = DispatchArgs({
    x: std.intdiv(pendingCount + WORKGROUP_SIZE - 1, WORKGROUP_SIZE),
    y: 1,
    z: 1,
  });
  updateDispatchAccess.$ = DispatchArgs({
    x: std.intdiv(controlAccess.$.sourceCount + WORKGROUP_SIZE - 1, WORKGROUP_SIZE),
    y: 1,
    z: 1,
  });
});

export const spawnCompute = tgpu.computeFn({
  in: { gid: d.builtin.globalInvocationId },
  workgroupSize: [WORKGROUP_SIZE],
})(({ gid }) => {
  'use gpu';
  const localIndex = gid.x;
  if (localIndex >= controlAccess.$.pendingCount) {
    return;
  }

  const emissionIndex = controlAccess.$.emissionBase + localIndex;
  const slotIndex = emissionIndex % capacityAccess.$;
  const generation = emissionIndex + 1;
  const elapsedSeconds = frameAccess.$.elapsedSeconds;
  randf.seed3(d.vec3f(d.f32(slotIndex), d.f32(emissionIndex), elapsedSeconds));

  const initialized = spawnSlot.$(SpawnContext({ slotIndex, emissionIndex, elapsedSeconds }));
  const particle = ParticleData({
    position: initialized.position,
    velocity: initialized.velocity,
    seed: randf.sample(),
    timeLeft: configAccess.$.lifetimeSeconds,
    generation,
    visual: packVisual(),
  });
  particlesAccess.$[slotIndex] = ParticleData(particle);

  appendLiveParticle(ActiveToken({ slotIndex, generation }), particle);
});

export const updateCompute = tgpu.computeFn({
  in: { gid: d.builtin.globalInvocationId },
  workgroupSize: [WORKGROUP_SIZE],
})(({ gid }) => {
  'use gpu';
  const sourceIndex = gid.x;
  if (sourceIndex >= controlAccess.$.sourceCount) {
    return;
  }

  let token = ActiveToken({ slotIndex: 0, generation: 0 });
  if (controlAccess.$.sourceParity === 0) {
    token = std.copy(activeTokensAAccess.$[sourceIndex]);
  } else {
    token = std.copy(activeTokensBAccess.$[sourceIndex]);
  }
  if (particlesAccess.$[token.slotIndex].generation !== token.generation) {
    return;
  }

  let particle = std.copy(particlesAccess.$[token.slotIndex]);
  if (particle.timeLeft <= 0) {
    return;
  }

  const deltaSeconds = frameAccess.$.deltaSeconds;
  const phase = frameAccess.$.elapsedSeconds / 0.3 + particle.seed;
  particle.velocity = particle.velocity + gravitySlot.$(particle.position) * deltaSeconds;
  particle.position =
    particle.position +
    particle.velocity * deltaSeconds +
    d.vec2f(std.sin(phase) * 0.1, std.cos(phase) * 0.12) * deltaSeconds;
  particle.timeLeft -= deltaSeconds;
  particlesAccess.$[token.slotIndex] = ParticleData(particle);

  if (particle.timeLeft > 0) {
    appendLiveParticle(token, particle);
  }
});

/** Single invocation: publishes the compacted list and writes indirect draw arguments. */
export const finalizeCompute = tgpu.computeFn({ workgroupSize: [1] })(() => {
  'use gpu';
  const count = std.min(std.atomicLoad(controlAccess.$.destCount), capacityAccess.$);
  controlAccess.$.sourceCount = count;
  controlAccess.$.sourceParity = 1 - controlAccess.$.sourceParity;
  controlAccess.$.pendingCount = 0;
  drawArgsAccess.$ = DrawArgs({
    vertexCount: 4,
    instanceCount: count,
    firstVertex: 0,
    firstInstance: 0,
  });
});

export const renderVertex = tgpu.vertexFn({
  in: {
    position: d.vec2f,
    opacity: d.f32,
    visual: d.u32,
    vertexIndex: d.builtin.vertexIndex,
  },
  out: VertexOutput,
})(({ position, opacity, visual, vertexIndex }) => {
  'use gpu';
  let corner = d.vec2f(-0.5, -0.25);
  if (vertexIndex === 1) {
    corner = d.vec2f(0.5, -0.25);
  } else if (vertexIndex === 2) {
    corner = d.vec2f(-0.5, 0.25);
  } else if (vertexIndex === 3) {
    corner = d.vec2f(0.5, 0.25);
  }

  const paletteIndex = std.extractBits(visual, 0, 8);
  const sizeByte = std.extractBits(visual, 8, 8);
  const phaseByte = std.extractBits(visual, 16, 8);
  const spinByte = std.extractBits(visual, 24, 8);
  const size = (configAccess.$.size * d.f32(sizeByte)) / 350;
  const phase = (d.f32(phaseByte) / 255) * 6.283_185_5;
  const spin = (d.f32(spinByte) / 255) * 2 - 1;
  let offset = rotate(corner * size, phase + frameAccess.$.elapsedSeconds * spin * 4);
  if (frameAccess.$.aspectRatio < 1) {
    offset.x /= frameAccess.$.aspectRatio;
  } else {
    offset.y *= frameAccess.$.aspectRatio;
  }

  const baseColor = configAccess.$.colors[paletteIndex];
  const alpha = baseColor.a * opacity;
  return {
    position: d.vec4f(position + offset, 0, 1),
    color: d.vec4f(baseColor.rgb * alpha, alpha),
  };
});

export const renderFragment = tgpu.fragmentFn({ in: VertexOutput, out: d.vec4f })(({ color }) => {
  'use gpu';
  return color;
});
