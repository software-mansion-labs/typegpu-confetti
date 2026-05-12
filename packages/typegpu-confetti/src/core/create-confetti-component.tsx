import type React from 'react';
import { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { d } from 'typegpu';
import { useRoot, useBuffer, useFrame, useConfigureContext, useUniform } from '@typegpu/react';

import { defaults } from './defaults.ts';
import {
  addParticleCompute,
  canvasAspectRatio,
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
  maxParticleAmountAccess,
  ParticleData,
  ParticleGeometry,
  particlesAccess,
  time,
} from './schemas.ts';
import type { ConfettiProps, ConfettiRef } from './types.ts';
import { withDeferredValidation } from './utils.ts';

type CanvasRef = ReturnType<typeof useConfigureContext>['ref'];

interface InternalCanvasProps {
  canvasRef: CanvasRef;
  ended: boolean;
}

interface CreateConfettiComponentOptions<T extends Record<string, unknown>> {
  Canvas: (props: T & InternalCanvasProps) => React.ReactElement;
}

/**
 * @internal
 */
function createConfettiComponent<T extends Record<string, unknown>>({
  Canvas,
}: CreateConfettiComponentOptions<T>) {
  return function Confetti(
    props: ConfettiProps & T & { ref?: React.Ref<ConfettiRef> | undefined },
  ) {
    const {
      gravity = defaults.gravity,
      colorPalette = defaults.colorPalette,
      initParticleAmount = defaults.initParticleAmount,
      maxParticleAmount: maxParticleAmount_ = defaults.maxParticleAmount,
      size = defaults.size,
      maxDurationTime = defaults.maxDurationTime,
      initParticle = defaults.initParticle,
      ref,
      ...rest
    } = props;

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
        Array.from({ length: maxParticleAmount }, () => ({
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
    );

    const deltaTimeUniform = useUniform(d.f32);
    const timeUniform = useUniform(d.f32);

    //#endregion

    // #region pipelines

    const renderPipeline = useMemo(
      () =>
        withDeferredValidation(root, () =>
          root
            .with(particlesAccess, particleDataBuffer.as('readonly'))
            .with(canvasAspectRatio, aspectRatioUniform)
            .createRenderPipeline({
              attribs: {
                tilt: geometryLayout.attrib.tilt,
                angle: geometryLayout.attrib.angle,
                color: geometryLayout.attrib.color,
              },
              vertex: mainVert,
              fragment: mainFrag,
              primitive: {
                topology: 'triangle-strip',
              },
            }),
        ),
      [aspectRatioUniform, root, particleDataBuffer],
    );

    const computePipeline = useMemo(
      () =>
        withDeferredValidation(root, () =>
          root
            .with(particlesAccess, particleDataBuffer.as('mutable'))
            .with(maxDurationTimeSlot, maxDurationTime ?? defaults.maxDurationTime)
            .with(gravitySlot, gravityFn(gravity))
            .with(time, timeUniform)
            .with(deltaTime, deltaTimeUniform)
            .createComputePipeline({ compute: mainCompute }),
        ),
      [particleDataBuffer, root, timeUniform, gravity, maxDurationTime, deltaTimeUniform],
    );

    const initComputePipeline = useMemo(
      () =>
        withDeferredValidation(root, () =>
          root
            .with(particlesAccess, particleDataBuffer.as('mutable'))
            .with(maxDurationTimeSlot, maxDurationTime ?? defaults.maxDurationTime)
            .with(initParticleSlot, initParticleFn(initParticle))
            .with(time, timeUniform)
            .createComputePipeline({ compute: initCompute })
            .$name('init'),
        ),
      [root, particleDataBuffer, maxDurationTime, initParticle, timeUniform],
    );

    const addParticleComputePipeline = useMemo(
      () =>
        withDeferredValidation(root, () =>
          root
            .with(particlesAccess, particleDataBuffer.as('mutable'))
            .with(maxDurationTimeSlot, maxDurationTime ?? defaults.maxDurationTime)
            .with(initParticleSlot, initParticleFn(initParticle))
            .with(maxParticleAmountAccess, maxParticleAmount)
            .with(time, timeUniform)
            .createGuardedComputePipeline(addParticleCompute)
            .$name('addParticle'),
        ),
      [particleDataBuffer, root, maxParticleAmount, maxDurationTime, initParticle, timeUniform],
    );

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
              addParticleComputePipeline.dispatchThreads();
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
        initComputePipeline,
        addParticleComputePipeline,
      ],
    );

    // #endregion

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
        .withColorAttachment({ view: ctx })
        .draw(4, particleAmount.current);

      ctx.present?.();
    });

    return <Canvas {...(rest as T)} canvasRef={canvasRef} ended={ended} />;
  };
}
export default createConfettiComponent;
