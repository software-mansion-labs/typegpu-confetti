import React, { useMemo } from 'react';
import { Canvas, useDevice } from 'react-native-wgpu';

import tgpu, { type TgpuFn } from 'typegpu';
import * as d from 'typegpu/data';
import { RootContext } from './context';
import { useBuffer, useFrame, useGPUSetup, useRoot } from './utils';

// #region default props

const defaultParticleAmount = 200;
const defaultColorPalette: d.v4f[] = (
  [
    [154, 177, 155],
    [67, 129, 193],
    [99, 71, 77],
    [239, 121, 138],
    [255, 166, 48],
  ] as [number, number, number][]
).map(([r, g, b]) => d.vec4f(r / 255, g / 255, b / 255, 1));

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

const defaultGetGravity = tgpu['~unstable']
  .fn([d.vec2f], d.vec2f)
  .does(/* wgsl */ `(pos: vec2f) -> vec2f {
    return vec2f(0, -0.000005);
  }`);

const getGravity = tgpu['~unstable'].slot(defaultGetGravity);

const mainCompute = tgpu['~unstable']
  .computeFn({
    in: { gid: d.builtin.globalInvocationId },
    workgroupSize: [64],
  })
  .does(/* wgsl */ `(in: ComputeIn) {
  let index = in.gid.x;
  if index == 0 {
    time += deltaTime;
  }
  let phase = (time / 300) + particleData[index].seed;

  particleData[index].velocity += getGravity(particleData[index].position) * deltaTime;
  particleData[index].position += particleData[index].velocity * deltaTime / 20 + vec2f(sin(phase) / 600, cos(phase) / 500);
}`)
  .$uses({ getGravity });

// #endregion

// #region layouts

const geometryLayout = tgpu.vertexLayout(
  (n: number) => d.arrayOf(ParticleGeometry, n),
  'instance',
);

const dataLayout = tgpu.vertexLayout(
  (n: number) => d.arrayOf(ParticleData, n),
  'instance',
);

// #endregion

type PropTypes = {
  gravity?: TgpuFn<[d.Vec2f], d.Vec2f>;
  colorPalette?: d.v4f[];
  particleAmount?: number;
};

function ConfettiViz(props: PropTypes) {
  const root = useRoot();
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  const { ref, context } = useGPUSetup(presentationFormat);

  const {
    gravity = defaultGetGravity,
    colorPalette = defaultColorPalette,
    particleAmount = defaultParticleAmount,
  } = props;

  const [ended, setEnded] = React.useState(false);

  // buffers

  const canvasAspectRatioBuffer = useBuffer(
    d.f32,
    context ? context.canvas.width / context.canvas.height : 1,
    ['uniform'],
    'aspect_ratio',
  ).$usage('uniform');

  const canvasAspectRatioUniform = useMemo(
    () =>
      canvasAspectRatioBuffer
        ? canvasAspectRatioBuffer.as('uniform')
        : undefined,
    [canvasAspectRatioBuffer],
  );

  const particleGeometry = useMemo(
    () =>
      Array(particleAmount)
        .fill(0)
        .map(() => ({
          angle: Math.floor(Math.random() * 50) - 10,
          tilt: Math.floor(Math.random() * 10) - 10 - 10,
          color: colorPalette[
            Math.floor(Math.random() * colorPalette.length)
          ] as d.v4f,
        })),
    [colorPalette, particleAmount],
  );

  const ParticleGeometryArray = useMemo(
    () => d.arrayOf(ParticleGeometry, particleAmount),
    [particleAmount],
  );
  const ParticleDataArray = useMemo(
    () => d.arrayOf(ParticleData, particleAmount),
    [particleAmount],
  );

  const particleGeometryBuffer = useBuffer(
    ParticleGeometryArray,
    particleGeometry,
    ['vertex'],
    'particle_geometry',
  ).$usage('vertex');

  const particleInitialData = useMemo(
    () =>
      Array(particleAmount)
        .fill(0)
        .map(() => ({
          position: d.vec2f(Math.random() * 2 - 1, Math.random() * 2 + 1),
          velocity: d.vec2f(
            (Math.random() * 2 - 1) / 50,
            -(Math.random() / 25 + 0.01),
          ),
          seed: Math.random(),
        })),
    [particleAmount],
  );

  const particleDataBuffer = useBuffer(
    ParticleDataArray,
    particleInitialData,
    ['storage', 'uniform', 'vertex'],
    'particle_data',
  ).$usage('storage', 'uniform', 'vertex');

  const deltaTimeBuffer = useBuffer(
    d.f32,
    undefined,
    ['uniform'],
    'delta_time',
  ).$usage('uniform');
  const timeBuffer = useBuffer(d.f32, undefined, ['storage'], 'time').$usage(
    'storage',
  );

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

  const renderPipeline = useMemo(() => {
    const pipeline = root['~unstable']
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
      .with(dataLayout, particleDataBuffer);

    root.device.pushErrorScope('validation');
    root.unwrap(pipeline);
    root.device.popErrorScope().then((error) => {
      if (error) {
        setEnded(true);
        console.error('error compiling render pipeline', error.message);
      } else {
        console.log('render pipeline creation: no error');
      }
    });
    return pipeline;
  }, [
    canvasAspectRatioUniform,
    particleDataBuffer,
    particleGeometryBuffer,
    presentationFormat,
    root,
  ]);

  const computePipeline = useMemo(() => {
    const pipeline = root['~unstable']
      .with(getGravity, gravity)
      .withCompute(
        mainCompute.$uses({
          particleData: particleDataStorage,
          deltaTime: deltaTimeUniform,
          time: timeStorage,
        }),
      )
      .createPipeline();

    root.device.pushErrorScope('validation');
    root.unwrap(pipeline);
    root.device.popErrorScope().then((error) => {
      if (error) {
        setEnded(true);
        console.error('error compiling compute pipeline', error.message);
      } else {
        console.log('compute pipeline creation: no error');
      }
    });
    return pipeline;
  }, [deltaTimeUniform, particleDataStorage, root, timeStorage, gravity]);

  const frame = async (deltaTime: number) => {
    if (!context) {
      return;
    }
    root.device.pushErrorScope('validation');

    deltaTimeBuffer.write(deltaTime);
    canvasAspectRatioBuffer.write(context.canvas.width / context.canvas.height);
    computePipeline.dispatchWorkgroups(Math.ceil(particleAmount / 64));

    const data = await particleDataBuffer.read();
    if (
      data.every(
        (particle) =>
          particle.position.x < -1 ||
          particle.position.x > 1 ||
          particle.position.y < -1.5,
      )
    ) {
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
      .draw(4, particleAmount);

    root['~unstable'].flush();

    root.device.popErrorScope().then((error) => {
      if (error) {
        console.error('error in loop', error.message);
        setEnded(true);
      }
    });
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

export default function Confetti(props: PropTypes) {
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
      <ConfettiViz {...props} />
    </RootContext.Provider>
  );
}
