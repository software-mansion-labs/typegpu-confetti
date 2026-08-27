import {
  useBuffer,
  useConfigureContext,
  useFrame,
  useMutable,
  useRoot,
  useUniform,
} from '@typegpu/react';
import type React from 'react';
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { d, type TgpuMutable, type TgpuRoot } from 'typegpu';

import { defaults } from './defaults.ts';
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
  MAX_PALETTE_COLORS,
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
import { createPipelines, type Pipelines } from './pipelines.ts';
import type { ConfettiProps, ConfettiRef } from './types.ts';
import {
  accumulateRequest,
  buildConfig,
  MAX_FRAME_DELTA_SECONDS,
  normalizeCapacity,
  normalizeEmissionCount,
  normalizePalette,
  pausePlayback,
  type PlaybackState,
  restartRequest,
  resumePlayback,
  type RequestState,
} from './utils.ts';

type CanvasRef = ReturnType<typeof useConfigureContext>['ref'];

interface InternalCanvasProps {
  canvasRef: CanvasRef;
  ended: boolean;
}

/**
 * A value written from the React side and read from the frame callback.
 * On React Native this is a `react-native-worklets` Shareable hosted on the UI runtime,
 * so the frame worklet closure can stay stable while state flows through the cell.
 */
export interface FrameCell<T> {
  /** Readable from the frame callback. */
  readonly current: T;
  /** Writable from the React side. */
  setSync(value: T): void;
}

export function createPlainFrameCell<T>(initial: T): FrameCell<T> {
  const cell = {
    value: initial,
    get current() {
      return cell.value;
    },
    setSync(value: T) {
      cell.value = value;
    },
  };
  return cell;
}

interface CreateConfettiComponentOptions<T extends Record<string, unknown>> {
  Canvas: (props: T & InternalCanvasProps) => React.ReactElement;
  /** Defaults to a plain object; React Native provides a UI-runtime Shareable. */
  createFrameCell?: <V>(initial: V) => FrameCell<V>;
  /** Called once per root; React Native uses it to verify device features. */
  onRoot?: (root: TgpuRoot) => void;
}

declare const process: { env: { NODE_ENV?: string | undefined } };
const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production';

/** @internal */
function createConfettiComponent<T extends Record<string, unknown>>({
  Canvas,
  createFrameCell = createPlainFrameCell,
  onRoot,
}: CreateConfettiComponentOptions<T>) {
  return function Confetti(
    props: ConfettiProps & T & { ref?: React.Ref<ConfettiRef> | undefined },
  ) {
    const {
      gravity = defaults.gravity,
      spawn = defaults.spawn,
      colorPalette,
      size = defaults.size,
      lifetime = defaults.lifetime,
      autoStop = defaults.autoStop,
      initParticleAmount: requestedInitialAmount = defaults.initParticleAmount,
      maxParticleAmount: requestedCapacity = defaults.maxParticleAmount,
      onEnd,
      ref,
      ...rest
    } = props;

    const onEndRef = useRef(onEnd);
    onEndRef.current = onEnd;

    const root = useRoot();
    useEffect(() => {
      onRoot?.(root);
    }, [root]);

    const presentationFormat = useMemo(() => navigator.gpu.getPreferredCanvasFormat(), []);
    const initialAmount = normalizeEmissionCount(requestedInitialAmount);
    const capacity = normalizeCapacity(requestedCapacity, initialAmount);
    const palette = useMemo(() => normalizePalette(colorPalette), [colorPalette]);

    useEffect(() => {
      if (IS_DEVELOPMENT && palette.truncated) {
        console.warn(
          `typegpu-confetti supports at most ${MAX_PALETTE_COLORS} palette colors; extras were ignored.`,
        );
      }
    }, [palette]);

    const [playback, setPlayback] = useState<PlaybackState>(initialAmount > 0 ? 'running' : 'idle');
    const [timeoutKey, setTimeoutKey] = useState(0);
    const requestState = useRef<RequestState>({ epoch: 1, requestedTotal: initialAmount });

    // #region GPU resources

    const frameUniform = useUniform(FrameData);
    const configUniform = useUniform(Config);
    const requestUniform = useUniform(EmissionRequest, { initial: requestState.current });
    const gpuControl = useMutable(GpuControl);

    const particleSchema = useMemo(() => d.arrayOf(ParticleData, capacity), [capacity]);
    const tokenSchema = useMemo(() => d.arrayOf(ActiveToken, capacity), [capacity]);
    const renderInstanceSchema = useMemo(() => d.arrayOf(RenderInstance, capacity), [capacity]);

    const particlePool = useMutable(particleSchema);
    const activeTokensA = useMutable(tokenSchema);
    const activeTokensB = useMutable(tokenSchema);
    const renderInstances: TgpuMutable<typeof renderInstanceSchema> =
      useMutable(renderInstanceSchema);
    const renderInstanceBuffer = useMemo(
      () => renderInstances.buffer.$usage('vertex'),
      [renderInstances],
    );
    // Usage flags are applied once per buffer instance; hook-owned buffers materialize lazily.
    const spawnDispatchBuffer = useBuffer(DispatchArgs);
    const spawnDispatch = useMemo(
      () => spawnDispatchBuffer.$usage('storage', 'indirect'),
      [spawnDispatchBuffer],
    );
    const updateDispatchBuffer = useBuffer(DispatchArgs);
    const updateDispatch = useMemo(
      () => updateDispatchBuffer.$usage('storage', 'indirect'),
      [updateDispatchBuffer],
    );
    const drawArgsBuffer = useBuffer(DrawArgs);
    const drawArgs = useMemo(() => drawArgsBuffer.$usage('storage', 'indirect'), [drawArgsBuffer]);

    // Visual props live in a uniform, so changing them never rebuilds pipelines.
    useEffect(() => {
      configUniform.write(buildConfig(palette.colors, size, lifetime));
    }, [configUniform, lifetime, palette, size]);

    const configuredRoot = useMemo(
      () =>
        root
          .with(frameAccess, frameUniform)
          .with(configAccess, configUniform)
          .with(requestAccess, requestUniform)
          .with(controlAccess, gpuControl)
          .with(particlesAccess, particlePool)
          .with(activeTokensAAccess, activeTokensA)
          .with(activeTokensBAccess, activeTokensB)
          .with(renderInstancesAccess, renderInstances)
          .with(spawnDispatchAccess, spawnDispatch.as('mutable'))
          .with(updateDispatchAccess, updateDispatch.as('mutable'))
          .with(drawArgsAccess, drawArgs.as('mutable'))
          .with(capacityAccess, capacity)
          .with(gravitySlot, gravityFn(gravity))
          .with(spawnSlot, spawnFn(spawn)),
      [
        activeTokensA,
        activeTokensB,
        capacity,
        configUniform,
        drawArgs,
        frameUniform,
        gpuControl,
        gravity,
        particlePool,
        renderInstances,
        requestUniform,
        root,
        spawn,
        spawnDispatch,
        updateDispatch,
      ],
    );

    const pipelines = useMemo(
      () => createPipelines(configuredRoot, presentationFormat, renderInstanceBuffer),
      [configuredRoot, presentationFormat, renderInstanceBuffer],
    );

    // #endregion

    // #region frame-loop state
    // The frame callback never closes over React state; it reads these cells instead, so its
    // closure is packed once per resource set rather than on every render.

    const [pipelinesCell] = useState(() => createFrameCell<Pipelines | null>(null));
    const [runningCell] = useState(() => createFrameCell(false));
    const [readyPipelines, setReadyPipelines] = useState<Pipelines | null>(null);
    const ready = readyPipelines === pipelines;

    useEffect(() => {
      let cancelled = false;
      pipelinesCell.setSync(null);
      Promise.all(Object.values(pipelines).map((pipeline) => pipeline.initAsync())).then(
        () => {
          if (cancelled) {
            return;
          }
          // Only initialized pipelines cross to the frame runtime; packing an uninitialized
          // one would force a synchronous compile.
          pipelinesCell.setSync(pipelines);
          setReadyPipelines(pipelines);
        },
        (error: unknown) => {
          if (!cancelled) {
            console.error('typegpu-confetti failed to initialize its GPU pipelines.', error);
          }
        },
      );
      return () => {
        cancelled = true;
        pipelinesCell.setSync(null);
      };
    }, [pipelines, pipelinesCell]);

    useEffect(() => {
      runningCell.setSync(playback === 'running');
    }, [playback, runningCell]);

    // #endregion

    // #region emission control

    const writeRequest = useCallback(
      (next: RequestState) => {
        requestState.current = next;
        requestUniform.write(next);
      },
      [requestUniform],
    );

    const restart = useCallback(() => {
      writeRequest(restartRequest(requestState.current.epoch, initialAmount));
      setPlayback(initialAmount > 0 ? 'running' : 'idle');
      setTimeoutKey((key) => key + 1);
    }, [initialAmount, writeRequest]);

    const emit = useCallback(
      (amount: number) => {
        const next = accumulateRequest(requestState.current, amount);
        if (next === requestState.current) {
          return;
        }
        writeRequest(next);
        setPlayback('running');
        setTimeoutKey((key) => key + 1);
      },
      [writeRequest],
    );

    useImperativeHandle(
      ref,
      () => ({
        pause: () => setPlayback(pausePlayback),
        resume: () => setPlayback(resumePlayback),
        restart,
        emit,
      }),
      [emit, restart],
    );

    // A new pool or new simulation shaders invalidate the GPU-side state; restart the burst.
    const didMount = useRef(false);
    useEffect(() => {
      if (!didMount.current) {
        didMount.current = true;
        return;
      }
      restart();
    }, [pipelines, restart]);

    useEffect(() => {
      if (!ready || !autoStop || playback !== 'running') {
        return;
      }
      const timeout = setTimeout(
        () => {
          writeRequest(restartRequest(requestState.current.epoch, 0));
          setPlayback('idle');
          onEndRef.current?.();
        },
        Math.max(0, lifetime + MAX_FRAME_DELTA_SECONDS) * 1000,
      );
      return () => clearTimeout(timeout);
    }, [autoStop, lifetime, playback, ready, timeoutKey, writeRequest]);

    // #endregion

    const { ref: canvasRef, ctxRef } = useConfigureContext({
      alphaMode: 'premultiplied',
      format: presentationFormat,
    });

    const onFrame = useCallback(
      ({ deltaSeconds, elapsedSeconds }: { deltaSeconds: number; elapsedSeconds: number }) => {
        'worklet';
        const activePipelines = pipelinesCell.current;
        if (!activePipelines || !runningCell.current) {
          return;
        }
        const ctx = ctxRef.current;
        if (!ctx || ctx.canvas.height === 0) {
          return;
        }

        frameUniform.write({
          deltaSeconds: Math.min(Math.max(deltaSeconds, 0), MAX_FRAME_DELTA_SECONDS),
          elapsedSeconds,
          aspectRatio: ctx.canvas.width / ctx.canvas.height,
          reserved: 0,
        });

        const encoder = root['~unstable'].createCommandEncoder();
        const preparePass = encoder.beginComputePass();
        activePipelines.prepare.with(preparePass).dispatchWorkgroups(1);
        preparePass.end();

        const simulationPass = encoder.beginComputePass();
        activePipelines.spawn.with(simulationPass).dispatchWorkgroupsIndirect(spawnDispatch);
        activePipelines.update.with(simulationPass).dispatchWorkgroupsIndirect(updateDispatch);
        activePipelines.finalize.with(simulationPass).dispatchWorkgroups(1);
        simulationPass.end();

        const renderPass = encoder.beginRenderPass({
          colorAttachments: {
            view: ctx,
            clearValue: [0, 0, 0, 0],
            loadOp: 'clear',
            storeOp: 'store',
          },
        });
        activePipelines.render.with(renderPass).drawIndirect(drawArgs);
        renderPass.end();
        encoder.submit();
        ctx.present?.();
      },
      [
        ctxRef,
        drawArgs,
        frameUniform,
        pipelinesCell,
        root,
        runningCell,
        spawnDispatch,
        updateDispatch,
      ],
    );
    useFrame(onFrame);

    return <Canvas {...(rest as T)} canvasRef={canvasRef} ended={playback !== 'running'} />;
  };
}

export default createConfettiComponent;
