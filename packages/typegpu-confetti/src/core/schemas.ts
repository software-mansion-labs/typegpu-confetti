import { d, tgpu } from 'typegpu';

export const WORKGROUP_SIZE = 64;
export const MAX_PALETTE_COLORS = 256;

/** Context passed to the `spawn` callback. Time is in seconds. */
export const SpawnContext = d.struct({
  slotIndex: d.u32,
  emissionIndex: d.u32,
  elapsedSeconds: d.f32,
});
export type SpawnContext = d.Infer<typeof SpawnContext>;

/** Kinematics returned by the `spawn` callback. */
export const ParticleInit = d.struct({
  position: d.vec2f,
  velocity: d.vec2f,
});
export type ParticleInit = d.Infer<typeof ParticleInit>;

export type GravityFn = (position: d.v2f) => d.v2f;
export type SpawnFn = (context: SpawnContext) => ParticleInit;

/** GPU-resident particle state. Exactly 32 bytes. */
export const ParticleData = d.struct({
  position: d.vec2f,
  velocity: d.vec2f,
  seed: d.f32,
  /** Remaining lifetime in seconds. */
  timeLeft: d.f32,
  generation: d.u32,
  visual: d.u32,
});

export const ActiveToken = d.struct({
  slotIndex: d.u32,
  generation: d.u32,
});

export const RenderInstance = d.struct({
  position: d.vec2f,
  opacity: d.f32,
  visual: d.u32,
});

/** Written once per frame from the frame loop. */
export const FrameData = d.struct({
  deltaSeconds: d.f32,
  elapsedSeconds: d.f32,
  aspectRatio: d.f32,
  reserved: d.f32,
});

/** Written from the React side whenever a visual prop changes. */
export const Config = d.struct({
  size: d.f32,
  lifetimeSeconds: d.f32,
  paletteCount: d.u32,
  reserved: d.u32,
  colors: d.arrayOf(d.vec4f, MAX_PALETTE_COLORS),
});

export const EmissionRequest = d.struct({
  epoch: d.u32,
  requestedTotal: d.u32,
});

export const GpuControl = d.struct({
  epoch: d.u32,
  consumedTotal: d.u32,
  sourceCount: d.u32,
  sourceParity: d.u32,
  pendingCount: d.u32,
  emissionBase: d.u32,
  destCount: d.atomic(d.u32),
  reserved: d.u32,
});

export const DispatchArgs = d.struct({
  x: d.u32,
  y: d.u32,
  z: d.u32,
});

export const DrawArgs = d.struct({
  vertexCount: d.u32,
  instanceCount: d.u32,
  firstVertex: d.u32,
  firstInstance: d.u32,
});

export const VertexOutput = {
  position: d.builtin.position,
  color: d.vec4f,
};

// Shells pin the WGSL signature of user callbacks; they stay internal.
export const gravityFn = tgpu.fn([d.vec2f], d.vec2f);
export const spawnFn = tgpu.fn([SpawnContext], ParticleInit);

export const gravitySlot = tgpu.slot<ReturnType<typeof gravityFn>>();
export const spawnSlot = tgpu.slot<ReturnType<typeof spawnFn>>();

export const capacityAccess = tgpu.accessor(d.u32);
export const frameAccess = tgpu.accessor(FrameData);
export const configAccess = tgpu.accessor(Config);
export const requestAccess = tgpu.accessor(EmissionRequest);
export const controlAccess = tgpu.accessor(GpuControl);
export const particlesAccess = tgpu.accessor(d.arrayOf(ParticleData));
export const activeTokensAAccess = tgpu.accessor(d.arrayOf(ActiveToken));
export const activeTokensBAccess = tgpu.accessor(d.arrayOf(ActiveToken));
export const renderInstancesAccess = tgpu.accessor(d.arrayOf(RenderInstance));
export const spawnDispatchAccess = tgpu.mutableAccessor(DispatchArgs);
export const updateDispatchAccess = tgpu.mutableAccessor(DispatchArgs);
export const drawArgsAccess = tgpu.mutableAccessor(DrawArgs);

export const renderInstanceLayout = tgpu.vertexLayout(d.arrayOf(RenderInstance), 'instance');
