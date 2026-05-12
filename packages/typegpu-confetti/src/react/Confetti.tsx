import React, {
  type CSSProperties,
  type ForwardedRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useBuffer, useConfigureContext, useFrame, useRoot, useUniform } from '@typegpu/react';
import { d } from 'typegpu';

import { defaults } from '../defaults.ts';
import {
  addParticleCompute,
  canvasAspectRatio,
  dataLayout,
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
  ParticleData,
  ParticleGeometry,
  particles,
  time,
} from '../schemas.ts';
import type { ConfettiProps, ConfettiRef } from '../types.ts';

const Confetti = React.forwardRef(
  (
    {
      width,
      height,
      gravity = defaults.gravity,
      colorPalette = defaults.colorPalette,
      initParticleAmount = defaults.initParticleAmount,
      maxParticleAmount: maxParticleAmount_ = defaults.maxParticleAmount,
      size = defaults.size,
      maxDurationTime = defaults.maxDurationTime,
      initParticle = defaults.initParticle,
      style = {},
    }: ConfettiProps & { style?: CSSProperties } & {
      width: number;
      height: number;
    },
    ref: ForwardedRef<ConfettiRef>,
  ) => {
    const root = useRoot();

    const [ended, setEnded] = useState(false);
    const [timeoutKey, setTimeoutKey] = useState(0);

    const particleAmount = useRef(initParticleAmount);

    const maxParticleAmount = useMemo(
      () => Math.max(maxParticleAmount_, initParticleAmount, 0),
      [maxParticleAmount_, initParticleAmount],
    );

    useEffect(() => {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      if (maxDurationTime !== null) {
        timeout = setTimeout(() => setEnded(true), (maxDurationTime + 0.01) * 1000);
      }
      return () => {
        if (timeout) {
          clearTimeout(timeout);
        }
      };
    }, [maxDurationTime, timeoutKey]);

    // #region buffers

    const aspectRatioUniform = useUniform(d.f32, { initial: 1 });

    const particleGeometry = useMemo(
      () =>
        Array(maxParticleAmount)
          .fill(0)
          .map(() => ({
            angle: Math.floor(Math.random() * 50) - 10,
            tilt: (Math.floor(Math.random() * 10) - 20) * size,
            color: colorPalette.map(([r, g, b, a]) => d.vec4f(r / 255, g / 255, b / 255, a))[
              Math.floor(Math.random() * colorPalette.length)
            ] as d.v4f,
          })),
      [colorPalette, maxParticleAmount, size],
    );

    const particleGeometryBuffer = useBuffer(d.arrayOf(ParticleGeometry, maxParticleAmount), {
      initial: particleGeometry,
    }).$usage('vertex');

    const particleDataBuffer = useBuffer(d.arrayOf(ParticleData, maxParticleAmount)).$usage(
      'storage',
      'vertex',
    );

    const deltaTimeUniform = useUniform(d.f32);
    const timeUniform = useUniform(d.f32);

    const particleDataStorage = useMemo(
      () => particleDataBuffer.as('mutable'),
      [particleDataBuffer],
    );

    //#endregion

    // #region pipelines

    const renderPipeline = useMemo(
      () =>
        root.with(canvasAspectRatio, aspectRatioUniform).createRenderPipeline({
          attribs: {
            tilt: geometryLayout.attrib.tilt,
            angle: geometryLayout.attrib.angle,
            color: geometryLayout.attrib.color,
            center: dataLayout.attrib.position,
            timeLeft: dataLayout.attrib.timeLeft,
          },
          vertex: mainVert,
          fragment: mainFrag,
          primitive: {
            topology: 'triangle-strip',
          },
        }),
      [aspectRatioUniform, root],
    );

    const computePipeline = useMemo(
      () =>
        root
          .with(particles, particleDataStorage)
          .with(maxDurationTimeSlot, maxDurationTime ?? defaults.maxDurationTime)
          .with(gravitySlot, gravityFn(gravity))
          .with(time, timeUniform)
          .with(deltaTime, deltaTimeUniform)
          .createComputePipeline({ compute: mainCompute }),
      [particleDataStorage, root, timeUniform, gravity, maxDurationTime, deltaTimeUniform],
    );

    const initComputePipeline = useMemo(
      () =>
        root
          .with(particles, particleDataStorage)
          .with(maxDurationTimeSlot, maxDurationTime ?? defaults.maxDurationTime)
          .with(initParticleSlot, initParticleFn(initParticle))
          .with(time, timeUniform)
          .createComputePipeline({ compute: initCompute })
          .$name('init'),
      [particleDataStorage, root, maxDurationTime, initParticle, timeUniform],
    );

    const addParticleComputePipeline = useMemo(
      () =>
        root
          .with(particles, particleDataStorage)
          .with(maxDurationTimeSlot, maxDurationTime ?? defaults.maxDurationTime)
          .with(initParticleSlot, initParticleFn(initParticle))
          .with(maxParticleAmountSlot, maxParticleAmount)
          .with(time, timeUniform)
          .createComputePipeline({ compute: addParticleCompute })
          .$name('addParticle'),
      [particleDataStorage, root, maxParticleAmount, maxDurationTime, initParticle, timeUniform],
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

            particleAmount.current = Math.min(particleAmount.current + amount, maxParticleAmount);

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

    const { ref: canvasRef, ctxRef } = useConfigureContext({ alphaMode: 'premultiplied' });
    useFrame(({ deltaSeconds, elapsedSeconds }) => {
      const ctx = ctxRef.current;
      if (!ctx || particleAmount.current < 1) {
        return;
      }

      deltaTimeUniform.write(deltaSeconds * 1000);
      timeUniform.write(elapsedSeconds * 1000);
      aspectRatioUniform.write(ctx.canvas.width / ctx.canvas.height);
      computePipeline.dispatchWorkgroups(Math.ceil(particleAmount.current / 64));

      renderPipeline
        .with(geometryLayout, particleGeometryBuffer)
        .with(dataLayout, particleDataBuffer)
        .withColorAttachment({ view: ctx })
        .draw(4, particleAmount.current);

      ctx.present?.();
    });

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          position: 'fixed',
          width: '100%',
          height: '100%',
          inset: 0,
          pointerEvents: 'none',
          ...style,
        }}
      />
    );
  },
);

export default Confetti;
