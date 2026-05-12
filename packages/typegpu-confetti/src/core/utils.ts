import type { TgpuRoot } from 'typegpu';

function warn(error: unknown) {
  if (error) {
    console.warn(error);
  }
}

export function withDeferredValidation<T>(root: TgpuRoot, cb: () => T): T {
  root.device.pushErrorScope('internal');
  root.device.pushErrorScope('out-of-memory');
  root.device.pushErrorScope('validation');
  try {
    const result = cb();
    root.unwrap(result as Parameters<TgpuRoot['unwrap']>[0]);
    return result;
  } finally {
    root.device.popErrorScope().then(warn);
    root.device.popErrorScope().then(warn);
    root.device.popErrorScope().then(warn);
  }
}
