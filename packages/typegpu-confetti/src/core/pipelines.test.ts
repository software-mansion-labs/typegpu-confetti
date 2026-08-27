import { describe, expect, it } from 'vitest';
import { d, tgpu } from 'typegpu';

import { defaultGravity, defaultSpawn } from './defaults.ts';
import { createPipelines } from './pipelines.ts';
import {
  ActiveToken,
  activeTokensAAccess,
  activeTokensBAccess,
  capacityAccess,
  Config,
  configAccess,
  controlAccess,
  DispatchArgs,
  drawArgsAccess,
  DrawArgs,
  EmissionRequest,
  frameAccess,
  FrameData,
  GpuControl,
  gravityFn,
  gravitySlot,
  ParticleData,
  particlesAccess,
  RenderInstance,
  renderInstancesAccess,
  requestAccess,
  spawnDispatchAccess,
  spawnFn,
  spawnSlot,
  updateDispatchAccess,
} from './schemas.ts';

// WebGPU flag enums that TypeGPU reads while describing buffers and layouts.
Object.assign(globalThis, {
  GPUBufferUsage: {
    MAP_READ: 0x1,
    MAP_WRITE: 0x2,
    COPY_SRC: 0x4,
    COPY_DST: 0x8,
    INDEX: 0x10,
    VERTEX: 0x20,
    UNIFORM: 0x40,
    STORAGE: 0x80,
    INDIRECT: 0x100,
    QUERY_RESOLVE: 0x200,
  },
  GPUShaderStage: { VERTEX: 0x1, FRAGMENT: 0x2, COMPUTE: 0x4 },
  GPUTextureUsage: {
    COPY_SRC: 0x1,
    COPY_DST: 0x2,
    TEXTURE_BINDING: 0x4,
    STORAGE_BINDING: 0x8,
    RENDER_ATTACHMENT: 0x10,
  },
});

/**
 * A GPUDevice stand-in that is just enough for TypeGPU to resolve shaders and describe
 * pipeline layouts. No GPU work is issued; buffers are never materialized.
 */
function createStubDevice(shaders: string[]) {
  const passthrough = <T>(descriptor: T) => descriptor;
  return {
    features: new Set<string>(),
    limits: {},
    label: 'stub',
    lost: new Promise(() => undefined),
    queue: { submit() {}, writeBuffer() {} },
    createShaderModule({ code }: { code: string }) {
      shaders.push(code);
      return { label: 'stub-module' };
    },
    createBindGroupLayout: passthrough,
    createPipelineLayout: passthrough,
    createComputePipeline: passthrough,
    createRenderPipeline: passthrough,
    addEventListener() {},
    removeEventListener() {},
    pushErrorScope() {},
    popErrorScope: () => Promise.resolve(null),
  } as unknown as GPUDevice;
}

describe('pipelines', () => {
  it('resolve every shader with the default gravity and spawn callbacks', () => {
    const shaders: string[] = [];
    const root = tgpu.initFromDevice({ device: createStubDevice(shaders) });
    const capacity = 16;

    const renderInstances = root.createMutable(d.arrayOf(RenderInstance, capacity));
    const configuredRoot = root
      .with(frameAccess, root.createUniform(FrameData))
      .with(configAccess, root.createUniform(Config))
      .with(requestAccess, root.createUniform(EmissionRequest))
      .with(controlAccess, root.createMutable(GpuControl))
      .with(particlesAccess, root.createMutable(d.arrayOf(ParticleData, capacity)))
      .with(activeTokensAAccess, root.createMutable(d.arrayOf(ActiveToken, capacity)))
      .with(activeTokensBAccess, root.createMutable(d.arrayOf(ActiveToken, capacity)))
      .with(renderInstancesAccess, renderInstances)
      .with(spawnDispatchAccess, root.createMutable(DispatchArgs))
      .with(updateDispatchAccess, root.createMutable(DispatchArgs))
      .with(drawArgsAccess, root.createMutable(DrawArgs))
      .with(capacityAccess, capacity)
      .with(gravitySlot, gravityFn(defaultGravity))
      .with(spawnSlot, spawnFn(defaultSpawn));

    const pipelines = createPipelines(
      configuredRoot,
      'bgra8unorm',
      renderInstances.buffer.$usage('vertex'),
    );

    for (const pipeline of Object.values(pipelines)) {
      expect(() => pipeline.initSync()).not.toThrow();
    }
    expect(shaders).toHaveLength(5);

    const [prepare, spawn, update, finalize, render] = shaders;
    expect(prepare).toContain('@compute @workgroup_size(1)');
    expect(spawn).toContain(`@workgroup_size(64)`);
    expect(update).toContain('atomicAdd');
    expect(finalize).toContain('instanceCount');
    expect(render).toContain('@vertex');
    expect(render).toContain('@fragment');
  });
});
