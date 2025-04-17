<!-- automd:file src="./packages/typegpu-confetti/README.md" -->

# typegpu-confetti

`typegpu-confetti` is a package for highly-customizable confetti animations in React Native, computed and rendered exclusively on the GPU. Written using [react-native-wgpu](https://github.com/wcandillon/react-native-webgpu/) and [TypeGPU](https://github.com/software-mansion/TypeGPU).

<video width="512" autoplay muted loop playsinline src="https://github.com/user-attachments/assets/02c6fae6-3ffb-47ba-a204-4aacaa96f9b7"></video>


## Installation

In order to use the package in React Native, you need to install the [react-native-wgpu](https://github.com/wcandillon/react-native-webgpu/) package: 
```sh
npm install react-native-wgpu
```

Please refer to the react-native-wgpu documentation for further information about its installation. Note that the package is not supported by Expo Go, so running `expo prebuild` is required.

Then to install the `typegpu-confetti` package, run:
```sh
npm install typegpu-confetti
```

Furthermore, if you want to be able to pass JavaScript functions marked with the "kernel" directive to the Confetti component, you need to include the [unplugin-typegpu](https://www.npmjs.com/package/unplugin-typegpu) babel plugin in your project.

```sh
npm install unplugin-typegpu
```

For further information about the plugin and the overall tgpu functions functionality, please refer to the [TypeGPU documentation](https://docs.swmansion.com/TypeGPU/getting-started/).

## Usage

### 1. Recommended

#### `useConfetti` hook

```tsx
import { useConfetti } from 'typegpu-confetti/react-native';

function SomeInnerComponent() {
  const confettiRef = useConfetti();

  return (
    <View>
      <Button
        title="run confetti"
        onPress={() => confettiRef?.current?.addParticles(50)}
      />
    </View>
  );
}
```

The hook returns a reference to a `Confetti` component, exposing the following functions allowing to control the animation:

```ts
type ConfettiRef = {
  pause: () => void;
  resume: () => void;
  restart: () => void;
  addParticles: (amount: number) => void;
};
```

To use the hook, the component needs to be descendent from the *ConfettiProvider* component, which accepts the same props as *Confetti* (see the Props section). It's recommended to wrap a top-level component with the provider, to make sure the confetti covers the whole screen (if that's the desired effect) and make the hook accessible anywhere inside the app.

```tsx
import { ConfettiProvider } from 'typegpu-confetti/react-native';

function SomeHighLevelContainerComponent() {
  return (
    <ConfettiProvider>
      <App/>
    </ConfettiProvider>
  );
}
```

### 2. Alternative

#### `Confetti` component

```tsx
import { Confetti } from 'typegpu-confetti/react-native';

function SomeComponent() {
  return (
    <View>
      <Confetti initParticleAmount={200} />
    </View>
  );
}
```

The Confetti component is positioned absolutely and will completely cover its container (the closest parent element with position "relative", which is the default value for position in React Native).


#### Imperative handle

```tsx
import type { ConfettiRef } from 'typegpu-confetti';
import { Confetti } from 'typegpu-confetti/react-native';

function SomeComponent() {
  const ref = useRef<ConfettiRef>(null);

  return (
    <View>
      <Confetti initParticleAmount={200} maxParticleAmount={1000} ref={ref} />
      <Button
        title="add particles"
        onPress={() => ref.current?.addParticles(200)}
      />
    </View>
  );
}
```

## Props

```ts
type ConfettiPropTypes = {
  colorPalette?: [number, number, number, number][];
  size?: number;
  maxDurationTime?: number | null;
  initParticleAmount?: number;
  maxParticleAmount?: number;
  gravity?: GravityFn;
  initParticle?: InitParticleFn;
  style?: StyleProp<ViewStyle>;
};

type GravityFn = (args: {
  pos: d.v2f;
}) => d.v2f;

type InitParticleFn = (args: {
  index: number;
}) => void;
```

* **colorPalette**: JavaScript array of *[r, g, b, a]* colors, from which particles will have their colors randomly assigned.

* **size**: multiplier allowing customizing the sizes of particles, while keeping their random variation. *size < 1*: particles smaller than default, *size > 1*: bigger

* **maxDurationTime**: time in seconds around which the animation should end. 
  
  One second before this time the particles gradually lose their opacity until completely transparent. 

  It is *maxDurationTime*, instead of just *durationTime*, because if all of the particles leave the screen, then the animation technically ends earlier, though frames are still being rendered to the canvas until the end of *maxDurationTime*. 
  
  Running *addParticles* function on the ref will reset the time counter to zero each call.

* **initParticleAmount**: the number of particles that will be drawn whenever the component mounts.
  
  To not run the animation automatically on mount, but after manually invoking the *addParticles* function on some event, set this prop to 0.

* **maxParticleAmount**: the maximum number of particles that can be part of the simulation at any time.

  If this number is smaller than *initParticleAmount*, then it's ignored and *initParticleAmount* is used instead.

  When invoking *addParticles* would result in passing this limit, then the oldest simulated particles are replaced with the new ones. They are replaced instantly, without the fading-out animation.

* **gravity**: function accepting one *vec2f* vector (particle position) and returning one *vec2f* vector (acceleration for the particle). 
  
  It will be run on the GPU, so it needs to be marked with a "kernel" directive, in order to make the `unplugin-typegpu` transpile it at build time.

* **initParticle**: function accepting one *i32* argument (particle index), which is to be used for initializing particle age, position, velocity, random number generator seed.

  To access the necessary data inside the function, you should use the *particles* and *maxDurationTime* tgpu accessors.

  *particles* value is a *TgpuArray* with *maxParticleAmount* elements of type *ParticleData*, *maxDurationTime* value is of type *number*.

  ```ts
  const ParticleData = d.struct({
    position: d.vec2f,
    velocity: d.vec2f,
    seed: d.f32,
    timeLeft: d.f32,
  });
  ```

  The function will be run on the GPU, so it needs to be marked with a "kernel" directive, in order to make the `unplugin-typegpu` transpile it at build time.

* **style**: allows overriding the default styling set on the inner Canvas element

>[!NOTE]
> Changing any of the props will restart the animation.

## typegpu-confetti is created by Software Mansion

[![swm](https://logo.swmansion.com/logo?color=white&variant=desktop&width=150&tag=typegpu-github 'Software Mansion')](https://swmansion.com)

Since 2012 [Software Mansion](https://swmansion.com) is a software agency with experience in building web and mobile apps. We are Core React Native Contributors and experts in dealing with all kinds of React Native issues. We can help you build your next dream product – [Hire us](https://swmansion.com/contact/projects?utm_source=typegpu&utm_medium=readme).

<!-- /automd -->
