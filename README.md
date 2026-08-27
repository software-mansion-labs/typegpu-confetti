<!-- automd:file src="./packages/typegpu-confetti/README.md" -->

# typegpu-confetti

Performant, customizable confetti for React and React Native. Particle state, spawning, simulation, compaction, and draw counts stay on the GPU through [TypeGPU](https://typegpu.com); one active frame records one queue submission. On React Native the frame loop runs on the UI runtime via `react-native-worklets`, so a busy JS thread does not stutter the animation.

<video width="512" autoplay muted loop playsinline src="https://github.com/user-attachments/assets/02c6fae6-3ffb-47ba-a204-4aacaa96f9b7"></video>

## Installation

```sh
npm install typegpu-confetti typegpu @typegpu/react @typegpu/noise react
```

For React Native, also install the native peers:

```sh
npx expo install react-native-webgpu react-native-reanimated react-native-worklets
```

Expo Go does not include WebGPU, so create a development build with `expo prebuild`.

TypeGPU shader callbacks use the `'use gpu'` directive. Add `unplugin-typegpu` to the app's Vite or Babel configuration.

## Root and entry points

Wrap the app once with `@typegpu/react`'s `Root`, place a Suspense boundary below it, then use the platform entry point.

```tsx
import { Root } from '@typegpu/react';
import { Suspense } from 'react';
import { ConfettiProvider } from 'typegpu-confetti/react-native';
// Web: typegpu-confetti/react

export function RootApp() {
  return (
    <Root
      options={{
        // React Native only, see "Device synchronization" below.
        device: { optionalFeatures: ['implicit-device-synchronization' as GPUFeatureName] },
      }}
    >
      <Suspense fallback={null}>
        <ConfettiProvider maxParticleAmount={10_000}>
          <App />
        </ConfettiProvider>
      </Suspense>
    </Root>
  );
}
```

## Usage

Use `emit()` for imperative bursts and `spawn` for custom starting kinematics. The library seeds `@typegpu/noise` before invoking `spawn` and owns particle lifetime and visual metadata.

```tsx
import { randf } from '@typegpu/noise';
import { useRef } from 'react';
import { d } from 'typegpu';
import { type ConfettiRef, ParticleInit, type SpawnFn } from 'typegpu-confetti';
import { Confetti, useConfetti } from 'typegpu-confetti/react-native';

const fountainSpawn: SpawnFn = ({ emissionIndex }) => {
  'use gpu';
  let side = d.f32(1);
  if (emissionIndex % 2 === 0) {
    side = -1;
  }
  return ParticleInit({
    position: d.vec2f(side, -0.9),
    velocity: d.vec2f(-side * (0.8 + randf.sample()), 1.5 + randf.sample()),
  });
};

function CelebrateButton() {
  const confetti = useConfetti();
  return <Button title="Celebrate" onPress={() => confetti?.current?.emit(10_000)} />;
}

function LocalConfetti() {
  const ref = useRef<ConfettiRef>(null);
  return (
    <Confetti ref={ref} initParticleAmount={0} maxParticleAmount={10_000} spawn={fountainSpawn} />
  );
}
```

### Props

```ts
interface ConfettiProps {
  colorPalette?: [number, number, number, number][];
  size?: number;
  lifetime?: number;
  autoStop?: boolean;
  initParticleAmount?: number;
  maxParticleAmount?: number;
  gravity?: (position: d.v2f) => d.v2f;
  spawn?: (context: SpawnContext) => ParticleInit;
  onEnd?: () => void;
}
```

- `colorPalette`: RGBA colors. RGB channels use 0–255; alpha uses 0–1. At most 256 colors; an empty palette uses the defaults. Updates live.
- `size`: particle-size multiplier. Updates live.
- `lifetime`: particle lifetime in seconds (default 2). Updates live.
- `autoStop`: stop the frame loop once the last emitted particle has expired (default `true`). `resume()`, `restart()` and `emit()` start it again.
- `initParticleAmount`: particles emitted on mount and on `restart()`.
- `maxParticleAmount`: fixed GPU pool capacity. Emissions beyond it overwrite the oldest ring slots. Changing it reallocates the pool and restarts.
- `gravity`: GPU callback from position to acceleration. Changing its identity rebuilds the simulation pipelines and restarts, so define it at module scope.
- `spawn`: GPU callback returning initial position and velocity. Same identity rule as `gravity`.
- `onEnd`: called when `autoStop` stops the frame loop after the last emitted particle has expired. Not called on `pause()` or unmount.
- `style`: canvas style from the platform entry point.

`defaultGravity` and `defaultSpawn` are exported from `typegpu-confetti` for composition. The GPU schemas passed to and returned from `spawn`:

```ts
SpawnContext { slotIndex: u32; emissionIndex: u32; elapsedSeconds: f32 }
ParticleInit { position: vec2f; velocity: vec2f }
```

### Imperative handle

```ts
interface ConfettiRef {
  pause(): void;
  resume(): void;
  restart(): void;
  emit(amount: number): void;
}
```

Non-finite and non-positive counts do no work; fractional counts are floored. `ConfettiProvider` renders one `Confetti` for its subtree and exposes the handle through `useConfetti()`.

## React Native

### Device synchronization

The frame loop runs on the Worklets UI runtime while React writes uniforms (emission requests, palette, size) from the JS thread. Dawn devices are not thread-safe by default, so request the `implicit-device-synchronization` feature when creating the device, as in the `Root` example above. It is a real Dawn feature, not a toggle; the cost is one uncontended mutex per API call. The React Native entry point logs an error at mount when the device lacks it.

### Worklets setup

TypeGPU resources transfer between runtimes automatically; module-scope shader definitions are re-imported through Bundle Mode.

```js
// babel.config.js
module.exports = (api) => {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'unplugin-typegpu/babel',
      [
        'react-native-worklets/plugin',
        {
          bundleMode: true,
          strictGlobal: true,
          importForwarding: {
            moduleNames: ['typegpu', '@typegpu/noise', 'typegpu-confetti'],
            relativePaths: ['apps/my-app'],
          },
        },
      ],
    ],
  };
};
```

```js
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { getBundleModeMetroConfig } = require('react-native-worklets/bundleMode');

module.exports = getBundleModeMetroConfig(getDefaultConfig(__dirname));
```

Enable the static feature flag and rebuild native projects:

```json
{
  "worklets": {
    "staticFeatureFlags": {
      "BUNDLE_MODE_ENABLED": true
    }
  }
}
```

After configuration changes, clear Metro's cache with `npx expo start --clear`.

## GPU execution model

Each particle occupies 32 bytes. Two generation-tagged active lists ping-pong on the GPU, so ring overwrites invalidate stale tokens without scanning capacity. Prepare consumes the emission request and writes indirect spawn/update counts; spawn initializes pending particles; update advances only the dense current list and compacts survivors into dense vertex instances; finalize writes indirect draw arguments. A single indirect instanced draw generates its quad from `vertexIndex` and uses premultiplied-alpha blending.

Visual props (`colorPalette`, `size`, `lifetime`) live in a uniform and never trigger shader compilation. Pipelines initialize asynchronously on both platforms; on React Native only initialized pipelines are handed to the UI runtime, and playback state reaches the frame worklet through Shareables rather than by re-serializing its closure.

There is no steady-state GPU readback, per-particle JavaScript loop, CPU geometry generation, or per-emission dispatch loop.

## Development

Requires Node 22.12+ and pnpm 11.

```sh
pnpm install
pnpm check
pnpm build
pnpm smoke
pnpm expo:check
pnpm --filter test-app prebuild:check
```

The Expo demo's **Stress RN thread** control emits a burst and then occupies the React Native thread for 1.5 seconds; the UI-runtime animation should continue smoothly. Native smoothness must be verified in a development build on the target device.

## typegpu-confetti is created by Software Mansion

[![swm](https://logo.swmansion.com/logo?color=white&variant=desktop&width=150&tag=typegpu-github 'Software Mansion')](https://swmansion.com)

Since 2012 [Software Mansion](https://swmansion.com) is a software agency with experience in building web and mobile apps. We are Core React Native Contributors and experts in dealing with all kinds of React Native issues. We can help you build your next dream product – [Hire us](https://swmansion.com/contact/projects?utm_source=typegpu&utm_medium=readme).

<!-- /automd -->
