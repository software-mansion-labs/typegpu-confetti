import type { StyleProp, ViewStyle } from 'react-native';
import { Canvas as RNCanvas } from 'react-native-webgpu';
import { createShareable, UIRuntimeId } from 'react-native-worklets';
import type { TgpuRoot } from 'typegpu';

import createConfettiComponent, { type FrameCell } from '../core/create-confetti-component.tsx';

const DEVICE_SYNC_FEATURE = 'implicit-device-synchronization' as GPUFeatureName;
const checkedDevices = new WeakSet<GPUDevice>();

/**
 * The frame loop runs on the UI runtime while React writes buffers from the JS thread.
 * Dawn devices are not thread-safe unless this feature is enabled, so a missing feature
 * means silent races on device and Metal asserts on the simulator.
 */
function checkDeviceSynchronization(root: TgpuRoot) {
  const device = root.device;
  if (checkedDevices.has(device)) {
    return;
  }
  checkedDevices.add(device);
  if (!device.features.has(DEVICE_SYNC_FEATURE)) {
    console.error(
      'typegpu-confetti: the GPU device lacks the "implicit-device-synchronization" feature, ' +
        'which is required when the frame loop runs on the UI runtime. Request it with ' +
        '<Root options={{ device: { optionalFeatures: ["implicit-device-synchronization"] } }}>.',
    );
  }
}

interface CurrentDecoration<T> {
  readonly current: T;
}

/** A Shareable hosted on the UI runtime, exposing `.current` on both sides. */
function createFrameCell<T>(initial: T): FrameCell<T> {
  return createShareable<T, CurrentDecoration<T>, CurrentDecoration<T>>(UIRuntimeId, initial, {
    initSynchronously: true,
    hostDecorator(shareable) {
      'worklet';
      Object.defineProperty(shareable, 'current', {
        get() {
          return shareable.value;
        },
        enumerable: true,
      });
      return shareable;
    },
    guestDecorator(shareable) {
      'worklet';
      Object.defineProperty(shareable, 'current', {
        get() {
          return shareable.getSync();
        },
        enumerable: true,
      });
      return shareable;
    },
  }) as unknown as FrameCell<T>;
}

const Confetti = createConfettiComponent<{ style?: StyleProp<ViewStyle> | undefined }>({
  createFrameCell,
  onRoot: checkDeviceSynchronization,
  Canvas: function Canvas({ canvasRef, ended, style, ...rest }) {
    return (
      <RNCanvas
        transparent
        ref={canvasRef}
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            zIndex: 50,
            pointerEvents: 'none',
            cursor: 'auto',
          },
          style,
          ended ? { opacity: 0 } : undefined,
        ]}
        {...rest}
      />
    );
  },
});

export default Confetti;
