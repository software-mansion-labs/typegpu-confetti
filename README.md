
# typegpu-confetti

`typegpu-confetti` is a package for highly customizable confetti animations in React Native, computed and rendered exclusively on the GPU. Written using `react-native-wgpu` and `TypeGPU`

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

### `useConfetti` hook

```tsx
import { useConfetti } from 'typegpu-confetti';

function SomeInnerComponent() {
  const confetti = useConfetti();

  return (
    <View>
      <Button
        title="run confetti"
        onPress={() => confetti.rerun()}
      />
    </View>
  );
}
```

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
  maxDurationTime?: number | null;

  initParticleAmount?: number;
  maxParticleAmount?: number;

  gravity?: TgpuFn<[d.Vec2f], d.Vec2f>;
  initParticle?: TgpuFn<[d.I32], undefined>;
};
```


