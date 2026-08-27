import type { d, TgpuRoot, TgpuVertexBuffer } from 'typegpu';

import { type RenderInstance, renderInstanceLayout } from './schemas.ts';
import {
  finalizeCompute,
  prepareCompute,
  renderFragment,
  renderVertex,
  spawnCompute,
  updateCompute,
} from './shaders.ts';

/** A root with every slot and accessor from `schemas.ts` bound. */
export type ConfiguredRoot = ReturnType<TgpuRoot['with']>;

const PREMULTIPLIED_BLEND: GPUBlendState = {
  color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
  alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
};

export function createPipelines(
  root: ConfiguredRoot,
  presentationFormat: GPUTextureFormat,
  renderInstances: TgpuVertexBuffer<d.WgslArray<typeof RenderInstance>>,
) {
  return {
    prepare: root.createComputePipeline({ compute: prepareCompute }).$name('confetti:prepare'),
    spawn: root.createComputePipeline({ compute: spawnCompute }).$name('confetti:spawn'),
    update: root.createComputePipeline({ compute: updateCompute }).$name('confetti:update'),
    finalize: root.createComputePipeline({ compute: finalizeCompute }).$name('confetti:finalize'),
    render: root
      .createRenderPipeline({
        attribs: { ...renderInstanceLayout.attrib },
        vertex: renderVertex,
        fragment: renderFragment,
        primitive: { topology: 'triangle-strip' },
        // Explicit format: the pipeline may be restored on a worklet runtime.
        targets: { format: presentationFormat, blend: PREMULTIPLIED_BLEND },
      })
      .$name('confetti:render')
      .with(renderInstanceLayout, renderInstances),
  };
}

export type Pipelines = ReturnType<typeof createPipelines>;
