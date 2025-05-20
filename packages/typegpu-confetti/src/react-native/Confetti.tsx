import React, {
  type ForwardedRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Canvas, useDevice } from 'react-native-wgpu';

import tgpu, {
  type TgpuComputePipeline,
  type TgpuRenderPipeline,
} from 'typegpu';
import * as d from 'typegpu/data';
import { RootContext } from '../context';
import {
  type GravityFn,
  ParticleData,
  ParticleGeometry,
  addParticleCompute,
  canvasAspectRatio,
  dataLayout,
  defaultInitParticle,
  deltaTime,
  geometryLayout,
  gravityFn,
  gravity as gravitySlot,
  initCompute,
  initParticleFn,
  initParticle as initParticleSlot,
  mainCompute,
  mainFrag,
  mainVert,
  maxDurationTime as maxDurationTimeSlot,
  maxParticleAmount as maxParticleAmountSlot,
  particles,
  time,
} from '../schemas';
import type { ConfettiPropTypes, ConfettiRef } from '../types';
import { useBuffer, useFrame, useGPUSetup, useRoot } from './utils';

const defaultMaxDurationTime = 2;
const defaultColorPalette = [
  [154, 177, 155, 1],
  [67, 129, 193, 1],
  [99, 71, 77, 1],
  [239, 121, 138, 1],
  [255, 166, 48, 1],
] as [number, number, number, number][];

const defaultGravity: GravityFn = () => {
  'kernel';
  return d.vec2f(0, -0.3);
};

const startTime = Date.now();

const ConfettiViz = React.forwardRef(
  (
    {
      gravity = defaultGravity,
      colorPalette = defaultColorPalette,
      initParticleAmount = 200,
      maxParticleAmount: maxParticleAmount_ = 1000,
      size = 1,
      maxDurationTime = defaultMaxDurationTime,
      initParticle = defaultInitParticle,
      style,
    }: ConfettiPropTypes,
    ref: ForwardedRef<ConfettiRef>,
  ) => {
    const root = useRoot();
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    const { canvasRef, context } = useGPUSetup(presentationFormat);

    const [ended, setEnded] = useState(false);
    const [timeoutKey, setTimeoutKey] = useState(0);

    const particleAmount = useRef(initParticleAmount);

    const maxParticleAmount = useMemo(
      () => Math.max(maxParticleAmount_, initParticleAmount, 0),
      [maxParticleAmount_, initParticleAmount],
    );

    // biome-ignore lint/correctness/useExhaustiveDependencies: <trigger timeout reset by changing timeoutKey>
    useEffect(() => {
      let timeout: NodeJS.Timeout | undefined;
      if (maxDurationTime !== null) {
        timeout = setTimeout(
          () => setEnded(true),
          (maxDurationTime + 0.01) * 1000,
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
      () => canvasAspectRatioBuffer.as('uniform'),
      [canvasAspectRatioBuffer],
    );

    const particleGeometry = useMemo(
      () =>
        Array(maxParticleAmount)
          .fill(0)
          .map(() => ({
            angle: Math.floor(Math.random() * 50) - 10,
            tilt: (Math.floor(Math.random() * 10) - 20) * size,
            color: colorPalette.map(([r, g, b, a]) =>
              d.vec4f(r / 255, g / 255, b / 255, a),
            )[Math.floor(Math.random() * colorPalette.length)] as d.v4f,
          })),
      [colorPalette, maxParticleAmount, size],
    );

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

    const particleDataBuffer = useBuffer(
      ParticleDataArray,
      undefined,
      'particle_data',
    ).$usage('storage', 'vertex');

    const deltaTimeBuffer = useBuffer(d.f32, undefined, 'delta_time').$usage(
      'uniform',
    );
    const timeBuffer = useBuffer(d.f32, undefined, 'time').$usage('storage');

    const particleDataStorage = useMemo(
      () => particleDataBuffer.as('mutable'),
      [particleDataBuffer],
    );
    const deltaTimeUniform = useMemo(
      () => deltaTimeBuffer.as('uniform'),
      [deltaTimeBuffer],
    );
    const timeStorage = useMemo(() => timeBuffer.as('readonly'), [timeBuffer]);

    //#endregion

    useImperativeHandle(
      ref,
      () =>
        ({
          pause: () => setEnded(true),
          resume: () => setEnded(false),
          restart: () => {
            particleAmount.current = initParticleAmount;

            if (initParticleAmount > 0) {
              initComputePipeline.dispatchWorkgroups(initParticleAmount);
            }

            if (ended) {
              setEnded(false);
            }
          },

          addParticles: (amount: number) => {
            for (let i = 0; i < amount; i++) {
              addParticleComputePipeline.dispatchWorkgroups(1);
            }

            particleAmount.current = Math.min(
              particleAmount.current + amount,
              maxParticleAmount,
            );

            if (ended) {
              setEnded(false);
            }
            setTimeoutKey((key) => key + 1);
          },
        }) satisfies ConfettiRef,
      [ended, maxParticleAmount, initParticleAmount],
    );

    // #region pipelines

    const validatePipeline = useCallback(
      <T extends TgpuRenderPipeline | TgpuComputePipeline>(pipeline: T) => {
        root.device.pushErrorScope('validation');
        try {
          root.unwrap(pipeline as TgpuComputePipeline);
        } catch (error) {
          console.error(error);
          if (typeof error === 'object' && error && 'cause' in error) {
            console.log(error.cause);
          }
        }

        root.device.popErrorScope().then((error) => {
          if (error) {
            setEnded(true);
            console.error('error compiling pipeline', error.message);
          } else {
            // console.log('pipeline creation: no error');
          }
        });
        return pipeline;
      },
      [root],
    );

    const renderPipeline = useMemo(
      () =>
        validatePipeline(
          root['~unstable']
            .with(canvasAspectRatio, canvasAspectRatioUniform)
            .withVertex(mainVert, {
              tilt: geometryLayout.attrib.tilt,
              angle: geometryLayout.attrib.angle,
              color: geometryLayout.attrib.color,
              center: dataLayout.attrib.position,
              timeLeft: dataLayout.attrib.timeLeft,
            })
            .withFragment(mainFrag, {
              format: presentationFormat,
            })
            .withPrimitive({
              topology: 'triangle-strip',
            })
            .createPipeline(),
        ),
      [canvasAspectRatioUniform, presentationFormat, root, validatePipeline],
    );

    const computePipeline = useMemo(
      () =>
        validatePipeline(
          root['~unstable']
            .with(particles, particleDataStorage)
            .with(
              maxDurationTimeSlot,
              maxDurationTime ?? defaultMaxDurationTime,
            )
            .with(initParticleSlot, initParticleFn(initParticle))
            .with(gravitySlot, gravityFn(gravity))
            .with(time, timeStorage)
            .with(deltaTime, deltaTimeUniform)
            .withCompute(mainCompute)
            .createPipeline(),
        ),
      [
        particleDataStorage,
        root,
        timeStorage,
        gravity,
        validatePipeline,
        initParticle,
        maxDurationTime,
        deltaTimeUniform,
      ],
    );

    const initComputePipeline = useMemo(
      () =>
        validatePipeline(
          root['~unstable']
            .with(particles, particleDataStorage)
            .with(
              maxDurationTimeSlot,
              maxDurationTime ?? defaultMaxDurationTime,
            )
            .with(initParticleSlot, initParticleFn(initParticle))
            .with(time, timeStorage)
            .withCompute(initCompute)
            .createPipeline(),
        ),
      [
        particleDataStorage,
        root,
        maxDurationTime,
        validatePipeline,
        initParticle,
        timeStorage,
      ],
    );

    const addParticleComputePipeline = useMemo(
      () =>
        validatePipeline(
          root['~unstable']
            .with(particles, particleDataStorage)
            .with(
              maxDurationTimeSlot,
              maxDurationTime ?? defaultMaxDurationTime,
            )
            .with(initParticleSlot, initParticleFn(initParticle))
            .with(maxParticleAmountSlot, maxParticleAmount)
            .with(time, timeStorage)
            .withCompute(addParticleCompute)
            .createPipeline(),
        ),
      [
        particleDataStorage,
        root,
        maxParticleAmount,
        maxDurationTime,
        validatePipeline,
        initParticle,
        timeStorage,
      ],
    );

    // #endregion

    useEffect(() => {
      if (initParticleAmount > 0) {
        initComputePipeline.dispatchWorkgroups(initParticleAmount);
      }
    }, [initComputePipeline, initParticleAmount]);

    const frame = async (deltaTime: number) => {
      if (!context || particleAmount.current < 1) {
        return;
      }

      root.device.pushErrorScope('validation');

      deltaTimeBuffer.write(deltaTime);
      timeBuffer.write(Date.now() - startTime);
      canvasAspectRatioBuffer.write(
        context.canvas.width / context.canvas.height,
      );
      computePipeline.dispatchWorkgroups(
        Math.ceil(particleAmount.current / 64),
      );

      renderPipeline
        .with(geometryLayout, particleGeometryBuffer)
        .with(dataLayout, particleDataBuffer)
        .withColorAttachment({
          view: context.getCurrentTexture().createView(),
          clearValue: [0, 0, 0, 0],
          loadOp: 'clear',
          storeOp: 'store',
        })
        .draw(4, particleAmount.current);

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
      <>
        <Canvas
          transparent
          style={{ position: 'absolute', width: 0, height: 0, opacity: 0 }}
        />
        {/* ^ hopefully fixes first confetti being invisible */}
        <Canvas
          transparent
          ref={canvasRef}
          style={[
            {
              opacity: ended ? 0 : 1,
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              zIndex: 20,
              pointerEvents: 'none',
              cursor: 'auto',
            },
            style,
          ]}
        />
      </>
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
