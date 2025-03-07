
# typegpu-confetti

`typegpu-confetti` is a package for highly-customizable confetti animations in React Native, computed and rendered exclusively on the GPU. Written using [react-native-wgpu](https://github.com/wcandillon/react-native-webgpu/) and [TypeGPU](https://github.com/software-mansion/TypeGPU).

<img src="https://github.com/user-attachments/assets/27e26fc5-b2f5-408b-bf81-de43fa3d7049" width=200>
<img src="https://github.com/user-attachments/assets/447951d2-1d10-4f1d-8d01-c7ce78dbe2e3" width=200>

## Usage

### `Confetti` component

```tsx
import Confetti from 'typegpu-confetti';

function SomeComponent() {
  return (
    <View>
      <Confetti initParticleAmount={200} />
    </View>
  );
}
```

### Imperative handle

```tsx
import Confetti, { type ConfettiRef } from 'typegpu-confetti';

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

Ref exposes the following functions, that can update the already created confetti simulation, without restarting it:

```ts
type ConfettiRef = {
  pause: () => void;
  resume: () => void;
  restart: () => void;
  addParticles: (amount: number) => void;
};
```

## Alternative usage

### `useConfetti` hook

```tsx
import { useConfetti } from 'typegpu-confetti';

function SomeInnerComponent() {
  const confettiRef = useConfetti();

  return (
    <View>
      <Button
        title="run confetti"
        onPress={() => confettiRef.current?.addParticles(50)}
      />
    </View>
  );
}
```

To use the hook, the component needs to be descendent from the *ConfettiProvider* component, which accepts the same props as *Confetti*. It's recommended to wrap a top-level component with the provider, to make sure the confetti covers the whole screen, if that's the desired effect, and make the hook accessible anywhere inside the app.

```tsx
import { ConfettiProvider } from 'typegpu-confetti';

function SomeHighLevelContainerComponent() {
  return (
    <ConfettiProvider>
      <App/>
    </ConfettiProvider>
  );
}
```

## Props

```ts
type ConfettiPropTypes = {
  colorPalette?: [number, number, number, number][];
  size?: number;
  maxDurationTime?: number;

  initParticleAmount?: number;
  maxParticleAmount?: number;

  gravity?: TgpuFn<[d.Vec2f], d.Vec2f>;
  initParticle?: TgpuFn<[d.I32], undefined>;
};
```

* **colorPalette**: JavaScript array of *[r, g, b, a]* colors, from which particles will have their colors randomly assigned.

* **size**: multiplier allowing customizing the sizes of particles, while keeping their the random variation. *size < 1*: particles smaller than default, *size > 1*: bigger

* **maxDurationTime**: time in seconds around which the animation should end. 
  
  One second before this time the particles gradually lose their opacity until completely transparent. 

  It is *maxDurationTime*, instead of just *durationTime*, because if all of the particles leave the screen, then the animation technically ends earlier, though frames are still being rendered to the canvas until the end of *maxDurationTime*. 
  
  Running *addParticles* function on the ref will reset the time counter to zero each call.

* **initParticleAmount**: the number of particles that will be drawn whenever the component mounts.
  
  To not run the animation automatically on mount, but after manually invoking the *addParticles* function on some event, set this prop to 0.

* **maxParticleAmount**: the maximum number of particles that can be part of the simulation at any time.

  If this number is smaller than *initParticleAmount*, then it's ignored and *initParticleAmount* is used instead.

  When invoking *addParticles* would result in passing this limit, then the oldest simulated particles are replaced with the new ones. They are replaced instantly, without the fading-out animation.

* **gravity**: *tgpu* function accepting one *vec2f* vector (particle position) and returning one *vec2f* vector (acceleration for the particle).

  To define this function, you can use the *gravityFn* shell to which you pass the implementation via the *does* method as a WGSL code string or just a JavaScript function (experimental).

* **initParticle**: tgpu function accepting one *i32* argument (particle index), which is to be used for initializing particle age, position, velocity, random number generator seed.

  To access the necessary data inside the function, you should use the *particles* and *maxDurationTime* tgpu accessors.

  *particles* value is a *TgpuArray* with *maxParticleAmount* elements of type *ParticleData*, *maxDurationTime* value is of type *number*.

  ```ts
  const ParticleData = d.struct({
    position: d.vec2f,
    velocity: d.vec2f,
    seed: d.f32,
    age: d.f32,
  });
  ```

> [!NOTE] Changing any of the props will restart the animation.
