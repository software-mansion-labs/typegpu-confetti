import React, {
  type ForwardedRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Canvas, useDevice } from 'react-native-wgpu';

import tgpu, { type TgpuFn } from 'typegpu';
import * as d from 'typegpu/data';
import {
  ParticleData,
  ParticleGeometry,
  addParticleCompute,
  dataLayout,
  geometryLayout,
  getGravity,
  mainCompute,
  mainFrag,
  mainVert,
} from './confetti-schemas';
import { RootContext } from './context';
import { useBuffer, useFrame, useGPUSetup, useRoot } from './utils';

const defaultColorPalette = [
  [154, 177, 155, 1],
  [67, 129, 193, 1],
  [99, 71, 77, 1],
  [239, 121, 138, 1],
  [255, 166, 48, 1],
] as [number, number, number, number][];

function defaultInitParticleData(particleAmount: number) {
  return Array(particleAmount)
    .fill(0)
    .map(() => ({
      position: d.vec2f(Math.random() * 2 - 1, Math.random() / 1.5 + 1),
      velocity: d.vec2f(
        Math.random() * 2 - 1,
        -(Math.random() / 25 + 0.01) * 50,
      ),
    }));
}

const defaultGravity = tgpu['~unstable']
  .fn([d.vec2f], d.vec2f)
  .does(/* wgsl */ `(pos: vec2f) -> vec2f {
    return vec2f(0, -0.3);
  }`);

export type ConfettiPropTypes = {
  gravity?: TgpuFn<[d.Vec2f], d.Vec2f>;
  colorPalette?: [number, number, number, number][];
  initParticleAmount?: number;
  maxParticleAmount?: number;
  size?: number;
  initParticleData?: (
    particleAmount: number,
  ) => Omit<d.Infer<typeof ParticleData>, 'seed' | 'age'>[];
  maxDurationTime?: number | null;
};

export type ConfettiRef = {
  stop: () => void;
  restart: () => void;
  addParticles: (amount: number) => void;
};

const ConfettiViz = React.forwardRef(
  (
    {
      gravity = defaultGravity,
      colorPalette = defaultColorPalette,
      initParticleAmount = 200,
      maxParticleAmount = 1000,
      size = 1,
      initParticleData = defaultInitParticleData,
      maxDurationTime = 2,
    }: ConfettiPropTypes,
    ref: ForwardedRef<ConfettiRef>,
  ) => {
    const root = useRoot();
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    const { canvasRef, context } = useGPUSetup(presentationFormat);

    const [ended, setEnded] = useState(false);
    const [timeoutKey, setTimeoutKey] = useState(0);

    const currentParticleAmount = useRef(initParticleAmount);

    // biome-ignore lint/correctness/useExhaustiveDependencies: <trigger timeout reset by changing timeoutKey>
    useEffect(() => {
      let timeout: NodeJS.Timeout | undefined;
      if (maxDurationTime !== null) {
        timeout = setTimeout(
          () => setEnded(true),
          (maxDurationTime + 1) * 1000,
        );
      }
      return () => {
        if (timeout) {
          clearTimeout(timeout);
        }
      };
    }, [maxDurationTime, timeoutKey]);

    // #region buffers

    const canvasAspectRatioBuffer = useBuffer(
      d.f32,
      context ? context.canvas.width / context.canvas.height : 1,
      'aspect_ratio',
    ).$usage('uniform');

    const canvasAspectRatioUniform = useMemo(
      () =>
        canvasAspectRatioBuffer
          ? canvasAspectRatioBuffer.as('uniform')
          : undefined,
      [canvasAspectRatioBuffer],
    );

    const particleGeometry = useMemo(() => {
      return Array(maxParticleAmount)
        .fill(0)
        .map(() => ({
          angle: Math.floor(Math.random() * 50) - 10,
          tilt: (Math.floor(Math.random() * 10) - 20) * size,
          color: colorPalette.map(([r, g, b, a]) =>
            d.vec4f(r / 255, g / 255, b / 255, a),
          )[Math.floor(Math.random() * colorPalette.length)] as d.v4f,
        }));
    }, [colorPalette, maxParticleAmount, size]);

    const ParticleGeometryArray = useMemo(
      () => d.arrayOf(ParticleGeometry, maxParticleAmount),
      [maxParticleAmount],
    );
    const ParticleDataArray = useMemo(
      () => d.arrayOf(ParticleData, maxParticleAmount),
      [maxParticleAmount],
    );

    const particleGeometryBuffer = useBuffer(
      ParticleGeometryArray,
      particleGeometry,
      'particle_geometry',
    ).$usage('vertex');

    const particleInitialData = useMemo(
      () =>
        initParticleData(maxParticleAmount).map((data, i) => ({
          ...data,
          seed: Math.random(),
          age: i < initParticleAmount ? (maxDurationTime ?? 999) * 1000 : 0,
        })),
      [
        maxParticleAmount,
        initParticleData,
        maxDurationTime,
        initParticleAmount,
      ],
    );

    const particleDataBuffer = useBuffer(
      ParticleDataArray,
      particleInitialData,
      'particle_data',
    ).$usage('storage', 'uniform', 'vertex');

    const deltaTimeBuffer = useBuffer(d.f32, undefined, 'delta_time').$usage(
      'uniform',
    );
    const timeBuffer = useBuffer(d.f32, undefined, 'time').$usage('storage');

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

    //#endregion

    useImperativeHandle(
      ref,
      () =>
        ({
          stop: () => setEnded(false),
          restart: () => {
            particleDataBuffer.write(particleInitialData);
            if (ended) {
              setEnded(false);
            }
          },

          addParticles: (amount: number) => {
            for (let i = 0; i < amount; i++) {
              addParticleComputePipeline.dispatchWorkgroups(1);
            }

            currentParticleAmount.current = Math.min(
              currentParticleAmount.current + amount,
              maxParticleAmount,
            );

            if (ended) {
              setEnded(false);
            }
            setTimeoutKey((key) => key + 1);
          },
        }) satisfies ConfettiRef,
      [particleDataBuffer, particleInitialData, ended, maxParticleAmount],
    );

    // #region pipelines

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
            age: dataLayout.attrib.age,
          },
        )
        .withFragment(mainFrag, {
          format: presentationFormat,
        })
        .withPrimitive({
          topology: 'triangle-strip',
        })
        .createPipeline();

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
    }, [canvasAspectRatioUniform, presentationFormat, root]);

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

    const addParticleComputePipeline = useMemo(() => {
      const pipeline = root['~unstable']
        .withCompute(
          addParticleCompute.$uses({
            particleData: particleDataStorage,
            maxParticleAmount,
            maxDurationTime,
          }),
        )
        .createPipeline();

      root.device.pushErrorScope('validation');
      root.unwrap(pipeline);
      root.device.popErrorScope().then((error) => {
        if (error) {
          setEnded(true);
          console.error(
            'error compiling addParticle compute pipeline',
            error.message,
          );
        } else {
          console.log('compute pipeline add particle creation: no error');
        }
      });
      return pipeline;
    }, [particleDataStorage, root, maxParticleAmount, maxDurationTime]);

    // #endregion

    const frame = async (deltaTime: number) => {
      if (!context || currentParticleAmount.current < 1) {
        return;
      }

      root.device.pushErrorScope('validation');

      deltaTimeBuffer.write(deltaTime);
      canvasAspectRatioBuffer.write(
        context.canvas.width / context.canvas.height,
      );
      computePipeline.dispatchWorkgroups(
        Math.ceil(currentParticleAmount.current / 64),
      );

      const texture = context.getCurrentTexture();
      renderPipeline
        .with(geometryLayout, particleGeometryBuffer)
        .with(dataLayout, particleDataBuffer)
        .withColorAttachment({
          view: texture.createView(),
          clearValue: [0, 0, 0, 0],
          loadOp: 'clear',
          storeOp: 'store',
        })
        .draw(4, currentParticleAmount.current);

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
        ref={canvasRef}
        style={{
          opacity: ended ? 0 : 1,
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          zIndex: 20,
          pointerEvents: 'none',
          cursor: 'auto',
        }}
      />
    );
  },
);

const Confetti = React.forwardRef(
  (props: ConfettiPropTypes, ref: ForwardedRef<ConfettiRef>) => {
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
        <ConfettiViz {...props} ref={ref} />
      </RootContext.Provider>
    );
  },
);

export default Confetti;
