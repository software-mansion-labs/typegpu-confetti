import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { PixelRatio } from 'react-native';
import { type RNCanvasContext, useCanvasEffect } from 'react-native-wgpu';
import type { AnyData, Infer } from 'typegpu/data';

import type { TgpuBuffer, TgpuRoot } from 'typegpu';
import { RootContext } from './context';

export function useRoot(): TgpuRoot {
  const root = useContext(RootContext);

  if (root === null) {
    throw new Error('please provide root');
  }
  return root;
}

export function useGPUSetup(
  presentationFormat: GPUTextureFormat = navigator.gpu.getPreferredCanvasFormat(),
) {
  const root = useRoot();
  const [context, setContext] = useState<RNCanvasContext | null>(null);

  const ref = useCanvasEffect(() => {
    const ctx = ref.current?.getContext('webgpu');

    if (!ctx) {
      setContext(null);
      return;
    }

    const canvas = ctx.canvas as HTMLCanvasElement;
    canvas.width = canvas.clientWidth * PixelRatio.get();
    canvas.height = canvas.clientHeight * PixelRatio.get();

    ctx.configure({
      device: root.device,
      format: presentationFormat,
      alphaMode: 'premultiplied',
    });

    setContext(ctx);
  });

  return { ref, context };
}

export function useBuffer<T extends AnyData>(
  schema: T,
  value: Infer<T> | undefined,
  usage: ('uniform' | 'storage' | 'vertex')[],
  label?: string,
) {
  const root = useRoot();
  const bufferRef = useRef<TgpuBuffer<T> | null>();

  const buffer = useMemo(() => {
    if (bufferRef.current) {
      bufferRef.current.destroy();
    }
    const buffer = root
      .createBuffer(schema, value)
      //@ts-ignore
      .$usage(...usage)
      .$name(label);
    bufferRef.current = buffer;
    return buffer;
  }, [root, schema, label, usage, value]);

  useLayoutEffect(() => {
    if (value !== undefined && buffer && !buffer.destroyed) {
      buffer.write(value);
    }
  }, [value, buffer]);

  const cleanupRef = useRef<ReturnType<typeof setTimeout> | null>();

  useEffect(() => {
    if (cleanupRef.current !== null) {
      clearTimeout(cleanupRef.current);
    }

    return () => {
      cleanupRef.current = setTimeout(() => {
        buffer.destroy();
      }, 1000);
    };
  }, [buffer]);

  return buffer;
}

// biome-ignore lint/suspicious/noExplicitAny: it's fine
function useEvent<TFunction extends (...params: any[]) => any>(
  handler: TFunction,
) {
  const handlerRef = useRef(handler);

  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  return useCallback((...args: Parameters<TFunction>) => {
    const fn = handlerRef.current;
    return fn(...args);
  }, []) as TFunction;
}

export function useFrame(
  loop: (deltaTime: number) => unknown,
  isRunning = true,
) {
  const loopEvent = useEvent(loop);
  useEffect(() => {
    if (!isRunning) {
      return;
    }

    let lastTime = Date.now();

    const runner = () => {
      const now = Date.now();
      const dt = now - lastTime;
      lastTime = now;
      loopEvent(dt);
      frame = requestAnimationFrame(runner);
    };

    let frame = requestAnimationFrame(runner);

    return () => cancelAnimationFrame(frame);
  }, [loopEvent, isRunning]);
}
