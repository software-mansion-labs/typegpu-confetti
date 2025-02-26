import { useMemo, useState } from 'react';
import { Canvas, useDevice } from 'react-native-wgpu';

import tgpu from 'typegpu';
import * as d from 'typegpu/data';
import { RootContext } from './context';
import { useBuffer, useFrame, useGPUSetup, useRoot } from './utils';

// #region constants

const PARTICLE_AMOUNT = 200;
const COLOR_PALETTE: d.v4f[] = [
  [154, 177, 155],
  [67, 129, 193],
  [99, 71, 77],
  [239, 121, 138],
  [255, 166, 48],
].map(([r, g, b]) => d.vec4f(r / 255, g / 255, b / 255, 1));

// #endregion

// #region data structures

const VertexOutput = {
  position: d.builtin.position,
  color: d.vec4f,
};

const ParticleGeometry = d.struct({
  tilt: d.f32,
  angle: d.f32,
  color: d.vec4f,
});

const ParticleData = d.struct({
  position: d.vec2f,
  velocity: d.vec2f,
  seed: d.f32,
});

const ParticleGeometryArray = d.arrayOf(ParticleGeometry, PARTICLE_AMOUNT);
const ParticleDataArray = d.arrayOf(ParticleData, PARTICLE_AMOUNT);

// #endregion

// #region functions

const rotate = tgpu['~unstable'].fn([d.vec2f, d.f32], d.vec2f).does(/* wgsl */ `
  (v: vec2f, angle: f32) -> vec2f {
    let pos = vec2(
      (v.x * cos(angle)) - (v.y * sin(angle)),
      (v.x * sin(angle)) + (v.y * cos(angle))
    );

    return pos;
}`);

const mainVert = tgpu['~unstable']
  .vertexFn({
    in: {
      tilt: d.f32,
      angle: d.f32,
      color: d.vec4f,
      center: d.vec2f,
      index: d.builtin.vertexIndex,
    },
    out: VertexOutput,
  })
  .does(
    /* wgsl */ `(in: VertexInput) -> VertexOutput {
      let width = in.tilt;
      let height = in.tilt / 2;

      var pos = rotate(array<vec2f, 4>(
        vec2f(0, 0),
        vec2f(width, 0),
        vec2f(0, height),
        vec2f(width, height),
      )[in.index] / 350, in.angle) + in.center;

      if (canvasAspectRatio < 1) {
        pos.x /= canvasAspectRatio;
      } else {
        pos.y *= canvasAspectRatio;
      }

      return VertexOutput(vec4f(pos, 0.0, 1.0), in.color);
  }`,
  )
  .$uses({ rotate });

const mainFrag = tgpu['~unstable']
  .fragmentFn({
    in: VertexOutput,
    out: d.vec4f,
  })
  .does(/* wgsl */ `
  (in: FragmentIn) -> @location(0) vec4f {
    return in.color;
}`);

const mainCompute = tgpu['~unstable']
  .computeFn({
    in: { gid: d.builtin.globalInvocationId },
    workgroupSize: [1],
  })
  .does(/* wgsl */ `(in: ComputeIn) {
  let index = in.gid.x;
  if index == 0 {
    time += deltaTime;
  }
  let phase = (time / 300) + particleData[index].seed; 
  particleData[index].position += particleData[index].velocity * deltaTime / 20 + vec2f(sin(phase) / 600, cos(phase) / 500);
}`);

// #endregion

// #region layouts

const geometryLayout = tgpu['~unstable'].vertexLayout(
  (n: number) => d.arrayOf(ParticleGeometry, n),
  'instance',
);

const dataLayout = tgpu['~unstable'].vertexLayout(
  (n: number) => d.arrayOf(ParticleData, n),
  'instance',
);

// #endregion

function ConfettiViz() {
  const root = useRoot();
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  const { ref, context } = useGPUSetup(presentationFormat);

  // buffers

  const canvasAspectRatioBuffer = useBuffer(
    d.f32,
    context ? context.canvas.width / context.canvas.height : 1,
    ['uniform'],
    'aspect_ratio',
  );

  const canvasAspectRatioUniform = useMemo(
    () =>
      canvasAspectRatioBuffer
        ? canvasAspectRatioBuffer.as('uniform')
        : undefined,
    [canvasAspectRatioBuffer],
  );

  const particleGeometry = useMemo(
    () =>
      Array(PARTICLE_AMOUNT)
        .fill(0)
        .map(() => ({
          angle: Math.floor(Math.random() * 50) - 10,
          tilt: Math.floor(Math.random() * 10) - 10 - 10,
          color:
            COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)],
        })),
    [],
  );

  const particleGeometryBuffer = useBuffer(
    ParticleGeometryArray,
    particleGeometry,
    ['vertex'],
    'particle_geometry',
  );

  const particleInitialData = useMemo(
    () =>
      Array(PARTICLE_AMOUNT)
        .fill(0)
        .map(() => ({
          position: d.vec2f(Math.random() * 2 - 1, Math.random() * 2 + 1),
          velocity: d.vec2f(
            (Math.random() * 2 - 1) / 50,
            -(Math.random() / 25 + 0.01),
          ),
          seed: Math.random(),
        })),
    [],
  );

  const particleDataBuffer = useBuffer(
    ParticleDataArray,
    particleInitialData,
    ['storage', 'uniform', 'vertex'],
    'particle_data',
  );

  const deltaTimeBuffer = useBuffer(
    d.f32,
    undefined,
    ['uniform'],
    'delta_time',
  );
  const timeBuffer = useBuffer(d.f32, undefined, ['storage'], 'time');

  const particleDataStorage = useMemo(
    () => particleDataBuffer.as('mutable'),
    [particleDataBuffer],
  );
  const deltaTimeUniform = useMemo(
    () => (deltaTimeBuffer ? deltaTimeBuffer.as('uniform') : undefined),
    [deltaTimeBuffer],
  );
  const timeStorage = useMemo(
    () => (timeBuffer ? timeBuffer.as('mutable') : timeBuffer),
    [timeBuffer],
  );

  // pipelines

  const renderPipeline = useMemo(
    () =>
      root['~unstable']
        .withVertex(
          mainVert.$uses({
            canvasAspectRatio: canvasAspectRatioUniform,
          }),
          {
            tilt: geometryLayout.attrib.tilt,
            angle: geometryLayout.attrib.angle,
            color: geometryLayout.attrib.color,
            center: dataLayout.attrib.position,
          },
        )
        .withFragment(mainFrag, {
          format: presentationFormat,
        })
        .withPrimitive({
          topology: 'triangle-strip',
        })
        .createPipeline()
        .with(geometryLayout, particleGeometryBuffer)
        .with(dataLayout, particleDataBuffer),
    [
      canvasAspectRatioUniform,
      particleDataBuffer,
      particleGeometryBuffer,
      presentationFormat,
      root,
    ],
  );

  const computePipeline = useMemo(
    () =>
      root['~unstable']
        .withCompute(
          mainCompute.$uses({
            particleData: particleDataStorage,
            deltaTime: deltaTimeUniform,
            time: timeStorage,
          }),
        )
        .createPipeline(),
    [deltaTimeUniform, particleDataStorage, root, timeStorage],
  );

  const [ended, setEnded] = useState(false);

  const frame = async (deltaTime: number) => {
    if (!context) {
      return;
    }

    deltaTimeBuffer.write(deltaTime);
    canvasAspectRatioBuffer.write(context.canvas.width / context.canvas.height);
    computePipeline.dispatchWorkgroups(PARTICLE_AMOUNT);

    const data = await particleDataBuffer.read();
    if (
      data.every(
        (particle) =>
          particle.position.x < -1 ||
          particle.position.x > 1 ||
          particle.position.y < -1.5,
      )
    ) {
      console.log('confetti animation ended');
      setEnded(true);
    }

    const texture = context.getCurrentTexture();
    renderPipeline
      .withColorAttachment({
        view: texture.createView(),
        clearValue: [0, 0, 0, 0],
        loadOp: 'clear' as const,
        storeOp: 'store' as const,
      })
      .draw(4, PARTICLE_AMOUNT);

    root['~unstable'].flush();
    context.present();
  };

  useFrame(frame, !ended);

  return (
    <Canvas
      transparent
      ref={ref}
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        zIndex: 20,
        pointerEvents: 'none',
        cursor: 'auto',
      }}
    />
  );
}

export default function Confetti() {
  const { device } = useDevice();
  const root = useMemo(
    () => (device ? tgpu.initFromDevice({ device }) : null),
    [device],
  );

  if (root === null) {
    return null;
  }

  return (
    <RootContext.Provider value={root}>
      <ConfettiViz />
    </RootContext.Provider>
  );
}
