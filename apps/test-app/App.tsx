import { randf } from '@typegpu/noise';
import { type ReactNode, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { d } from 'typegpu';
import { type ConfettiRef, type GravityFn, ParticleInit, type SpawnFn } from 'typegpu-confetti';
import { Confetti, ConfettiProvider, useConfetti } from 'typegpu-confetti/react-native';

const centerGravity: GravityFn = (pos) => {
  'use gpu';
  return d.vec2f(-pos.x * 2, -pos.y * 2);
};

const rightGravity: GravityFn = () => {
  'use gpu';
  return d.vec2f(2.5, 0);
};
const upGravity: GravityFn = () => {
  'use gpu';
  return d.vec2f(0, 0.5);
};
const strongGravity: GravityFn = () => {
  'use gpu';
  return d.vec2f(0, -3);
};

const pointSpawn: SpawnFn = () => {
  'use gpu';
  return ParticleInit({
    position: d.vec2f((2 * randf.sample() - 1) / 100, (2 * randf.sample() - 1) / 100),
    velocity: d.vec2f(
      50 * ((randf.sample() * 2 - 1) / 35 / 0.5),
      50 * ((randf.sample() * 2 - 1) / 30 + 0.05),
    ),
  });
};

const twoSidesSpawn: SpawnFn = ({ emissionIndex }) => {
  'use gpu';
  const jitter = d.vec2f((2 * randf.sample() - 1) / 100, (2 * randf.sample() - 1) / 100);
  if (emissionIndex % 2 === 0) {
    return ParticleInit({
      position: jitter + d.vec2f(1, 0),
      velocity: d.vec2f(-1 + (randf.sample() * 2 - 1), 1.5 + (randf.sample() * 2 - 1)),
    });
  }
  return ParticleInit({
    position: jitter - d.vec2f(1, 0),
    velocity: d.vec2f(1 + (randf.sample() * 2 - 1), 1.5 + (randf.sample() * 2 - 1)),
  });
};

const customGravity: GravityFn = (pos) => {
  'use gpu';
  return d.vec2f(-pos.x, -3);
};

const fountainSpawn: SpawnFn = ({ emissionIndex }) => {
  'use gpu';
  let direction = d.f32(1);
  if (emissionIndex % 2 === 0) {
    direction = -1;
  }
  return ParticleInit({
    position: d.vec2f(direction, -0.9),
    velocity: d.vec2f(-direction * (0.8 + randf.sample()), 1.5 + randf.sample()),
  });
};

export default function App() {
  return (
    <ConfettiProvider maxParticleAmount={2000}>
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: 'center',
          backgroundColor: 'rgb(239 239 249)',
        }}
      >
        <Text
          style={{
            fontWeight: 900,
            fontSize: 25,
            textAlign: 'left',
            paddingLeft: '10%',
            paddingBottom: 40,
            fontStyle: 'italic',
            width: '100%',
            color: 'rgb(82 89 238)',
          }}
        >
          typegpu-confetti
        </Text>
        <View style={styles.container}>
          <ConfettiContextButton />
          <ButtonRow label="Color" icon="💜">
            <Confetti
              colorPalette={[
                [68, 23, 82, 1],
                [129, 116, 160, 1],
                [168, 136, 181, 1],
                [239, 182, 200, 1],
              ]}
            />
          </ButtonRow>

          <ButtonRow label="Typed spawn" icon="⛲️">
            <Confetti spawn={fountainSpawn} lifetime={4} />
          </ButtonRow>

          <ButtonRow label="No auto-timeout" icon="♾️">
            <Confetti spawn={fountainSpawn} autoStop={false} />
          </ButtonRow>

          <ButtonRow label="Amount" icon="▫️">
            <Confetti initParticleAmount={50} />
          </ButtonRow>

          <ButtonRow label="Amount" icon="⬜️">
            <Confetti initParticleAmount={1000} maxParticleAmount={1000} />
          </ButtonRow>

          <ButtonRow label="Size" icon="▪️">
            <Confetti size={0.5} />
          </ButtonRow>

          <ButtonRow label="Size" icon="⬛️">
            <Confetti size={1.5} />
          </ButtonRow>

          <ButtonRow label="Color, Size, Amount" icon="🌨️">
            <Confetti colorPalette={[[255, 255, 255, 0.8]]} size={0.5} initParticleAmount={400} />
          </ButtonRow>

          <ButtonRow label="Gravity" icon="➡️">
            <Confetti gravity={rightGravity} />
          </ButtonRow>

          <ButtonRow label="Gravity" icon="⬆️">
            <Confetti gravity={upGravity} lifetime={5} />
          </ButtonRow>

          <ButtonRow label="Gravity" icon="↕️">
            <Confetti gravity={centerGravity} lifetime={5} />
          </ButtonRow>

          <ButtonRow label="Initial state, Gravity" icon="💣">
            <Confetti spawn={pointSpawn} gravity={strongGravity} />
          </ButtonRow>

          <ButtonRow label="Initial state" icon="2️⃣">
            <Confetti spawn={twoSidesSpawn} gravity={customGravity} lifetime={4} />
          </ButtonRow>

          <ImperativeConfettiButtonRow label="Imperative" icon="🏛️" />
        </View>
      </SafeAreaView>
    </ConfettiProvider>
  );
}

function ButtonRow({
  icon,
  label,
  children,
}: {
  icon?: string;
  label?: string;
  children: ReactNode;
}) {
  const [confettiKey, setConfettiKey] = useState(0);
  return (
    <>
      <Pressable
        onPress={() => setConfettiKey((key) => key + 1)}
        onLongPress={() => setConfettiKey(0)}
        style={{
          borderRadius: 20,
          backgroundColor: 'rgb(82 89 238)',
          padding: 15,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 25 }}>{icon ?? '🎉'} </Text>
          <Text style={{ fontSize: 15, fontWeight: 600, color: 'white' }}>{label}</Text>
        </View>
      </Pressable>

      {confettiKey > 0 && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            top: 0,
            pointerEvents: 'none',
            cursor: 'auto',
            zIndex: 1,
          }}
          key={confettiKey}
        >
          {children}
        </View>
      )}
    </>
  );
}

function ConfettiContextButton() {
  const confetti = useConfetti();

  return (
    <Pressable
      onPress={() => confetti?.current?.emit(200)}
      onLongPress={() => confetti?.current?.pause()}
      style={{
        borderRadius: 20,
        backgroundColor: 'rgb(82 89 238)',
        padding: 15,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Text style={{ fontSize: 25 }}>🌨️</Text>
        <Text style={{ fontSize: 15, fontWeight: 600, color: 'white' }}>Default (using hook)</Text>
      </View>
    </Pressable>
  );
}

function ImperativeConfettiButtonRow({ icon, label }: { icon?: string; label?: string }) {
  const confettiRef = useRef<ConfettiRef>(null);
  const [alternateStyle, setAlternateStyle] = useState(false);

  const rapidEmit = () => {
    confettiRef.current?.emit(250);
    confettiRef.current?.emit(750);
  };

  const stressReactNativeThread = () => {
    confettiRef.current?.emit(1000);
    setTimeout(() => {
      const deadline = Date.now() + 1500;
      let iterations = 0;
      while (Date.now() < deadline) {
        iterations += 1;
      }
      void iterations;
    }, 150);
  };

  return (
    <>
      <ImperativeButton
        icon={icon ?? '🎉'}
        label={label ?? 'Emit 10k'}
        onPress={() => confettiRef.current?.emit(10_000)}
      />
      <ImperativeButton label="Rapid emits" onPress={rapidEmit} />
      <ImperativeButton label="Pause" onPress={() => confettiRef.current?.pause()} />
      <ImperativeButton label="Resume" onPress={() => confettiRef.current?.resume()} />
      <ImperativeButton label="Restart" onPress={() => confettiRef.current?.restart()} />
      <ImperativeButton label="Change props" onPress={() => setAlternateStyle((value) => !value)} />
      <ImperativeButton label="Stress RN thread" onPress={stressReactNativeThread} />

      <Confetti
        ref={confettiRef}
        initParticleAmount={0}
        maxParticleAmount={1000}
        lifetime={2}
        size={alternateStyle ? 1.5 : 0.75}
        colorPalette={alternateStyle ? [[255, 96, 150, 0.75]] : undefined}
      />
    </>
  );
}

function ImperativeButton({
  icon,
  label,
  onPress,
}: {
  icon?: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 20,
        backgroundColor: 'rgb(82 89 238)',
        padding: 15,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon && <Text style={{ fontSize: 25 }}>{icon} </Text>}
        <Text style={{ fontSize: 15, fontWeight: 600, color: 'white' }}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    position: 'static',
    flexWrap: 'wrap',
    flexDirection: 'row',
    paddingHorizontal: 10,
  },
});
