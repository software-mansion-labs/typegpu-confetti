import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import type { AnyData, Infer } from 'typegpu/data';

import type { TgpuBuffer, TgpuRoot } from 'typegpu';
import { RootContext } from '../context';

export function useRoot(): TgpuRoot {
  const root = useContext(RootContext);

  if (root === null) {
    throw new Error('please provide root');
  }
  return root;
}

type State<T extends AnyData> = {
  buffer: TgpuBuffer<T>;
};
type Action<T extends AnyData> = { type: 'write'; value: Infer<T> };
type Initial<T extends AnyData> = {
  value: Infer<T> | undefined;
  label: string | undefined;
  root: TgpuRoot;
  schema: T;
};

function reducer<T extends AnyData>(
  state: State<T>,
  action: Action<T>,
): State<T> {
  if (action.type === 'write') {
    return state;
  }

  return state;
}

function createBuffer<T extends AnyData>({
  root,
  schema,
  label,
  value,
}: Initial<T>): State<T> {
  const buffer = root.createBuffer(schema, value).$name(label);

  return {
    buffer,
  };
}

export function useBuffer<T extends AnyData>(
  schema: T,
  value: Infer<T> | undefined,
  label?: string,
): TgpuBuffer<T> {
  const root = useRoot();

  const [{ buffer }] = useReducer(
    reducer,
    { root, schema, value, label },
    createBuffer<T>,
  );

  useEffect(() => {
    if (value !== undefined && buffer && !buffer.destroyed) {
      buffer.write(value);
    }
  }, [value, buffer]);

  const cleanupRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

interface DeviceContext {
  device: GPUDevice;
  adapter: GPUAdapter;
}

export const useDevice = (
  adapterOptions?: GPURequestAdapterOptions,
  deviceDescriptor?: GPUDeviceDescriptor,
) => {
  const [state, setState] = useState<DeviceContext | null>(null);

  useEffect(() => {
    setState(null); // resetting old adapter and device

    let deviceContext: Promise<DeviceContext> | DeviceContext = (async () => {
      const adapter = await navigator.gpu.requestAdapter(adapterOptions);
      if (!adapter) {
        throw new Error('No appropriate GPUAdapter found.');
      }
      const device = await adapter.requestDevice(deviceDescriptor);
      if (!device) {
        throw new Error('No appropriate GPUDevice found.');
      }
      deviceContext = { adapter, device };
      setState(deviceContext);
      return deviceContext;
    })();

    return () => {
      if (deviceContext instanceof Promise) {
        deviceContext.then((dev) => dev.device.destroy());
      } else {
        deviceContext.device.destroy();
      }
    };
  }, [adapterOptions, deviceDescriptor]);

  return { adapter: state?.adapter ?? null, device: state?.device ?? null };
};
