import React, {
  type ForwardedRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

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
import { useBuffer, useDevice, useFrame, useRoot } from '../utils';

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

const ConfettiViz = React.forwardRef(
  (
    {
      width,
      height,
      gravity = defaultGravity,
      colorPalette = defaultColorPalette,
      initParticleAmount = 200,
      maxParticleAmount: maxParticleAmount_ = 1000,
      size = 1,
      maxDurationTime = defaultMaxDurationTime,
      initParticle = defaultInitParticle,
    }: ConfettiPropTypes & { width: number; height: number },
    ref: ForwardedRef<ConfettiRef>,
  ) => {
    const root = useRoot();

    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [context, setContext] = useState<GPUCanvasContext | null>(null);

    useEffect(() => {
      if (root && !context && canvasRef.current) {
        const ctx = canvasRef.current?.getContext('webgpu') as GPUCanvasContext;
        ctx.configure({
          device: root.device,
          format: presentationFormat,
          alphaMode: 'premultiplied',
        });
        setContext(ctx);
      }
    }, [context, root, presentationFormat]);

    const [ended, setEnded] = useState(false);
    const [timeoutKey, setTimeoutKey] = useState(0);

    const particleAmount = useRef(initParticleAmount);

    const maxParticleAmount = useMemo(
      () => Math.max(maxParticleAmount_, initParticleAmount, 0),
      [maxParticleAmount_, initParticleAmount],
    );

    // biome-ignore lint/correctness/useExhaustiveDependencies: <trigger timeout reset by changing timeoutKey>
    useEffect(() => {
      let timeout: ReturnType<typeof setTimeout> | undefined;
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
    const timeStorage = useMemo(() => timeBuffer.as('mutable'), [timeBuffer]);

    //#endregion

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
            .withCompute(initCompute)
            .createPipeline(),
        ),
      [
        particleDataStorage,
        root,
        maxDurationTime,
        validatePipeline,
        initParticle,
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
      ],
    );

    // #endregion

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
      [
        ended,
        maxParticleAmount,
        initParticleAmount,
        addParticleComputePipeline,
        initComputePipeline,
      ],
    );

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
    };

    useFrame(frame, !ended);

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          inset: 0,
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

    const [height, setHeight] = useState(200);
    const [width, setWidth] = useState(200);

    const measuredRef = useRef<HTMLDivElement | null>(null);

    // biome-ignore lint/correctness/useExhaustiveDependencies: ref is null on first render
    useEffect(() => {
      if (measuredRef.current) {
        setWidth(
          measuredRef.current.getBoundingClientRect().width *
            window.devicePixelRatio,
        );
        setHeight(
          measuredRef.current.getBoundingClientRect().height *
            window.devicePixelRatio,
        );

        const observer = new ResizeObserver((e) => {
          setWidth((width) =>
            e[0] ? e[0].contentRect.width * window.devicePixelRatio : width,
          );
          setHeight((height) =>
            e[0] ? e[0].contentRect.height * window.devicePixelRatio : height,
          );
        });

        observer.observe(measuredRef.current);
      }
    }, [root]);

    if (root === null) {
      return null;
    }

    return (
      <RootContext.Provider value={root}>
        <div
          ref={measuredRef}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            inset: 0,
            zIndex: 20,
            pointerEvents: 'none',
            cursor: 'auto',
          }}
        >
          <ConfettiViz {...props} ref={ref} width={width} height={height} />
        </div>
      </RootContext.Provider>
    );
  },
);

export default Confetti;
