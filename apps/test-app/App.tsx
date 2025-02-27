import { type ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import tgpu from 'typegpu';
import Confetti from 'typegpu-confetti';
import * as d from 'typegpu/data';

export default function App() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text
        style={{
          fontWeight: 'bold',
          fontSize: 25,
          textAlign: 'left',
          width: '100%',
          paddingLeft: '10%',
          paddingBottom: 20,
          paddingTop: 100,
        }}
      >
        Confetti Test App
      </Text>
      <ButtonRow label="Default">
        <Confetti />
      </ButtonRow>

      <ButtonRow label="Particle amount" icon="▫️">
        <Confetti particleAmount={50} />
      </ButtonRow>

      <ButtonRow label="Particle amount" icon="⬜️">
        <Confetti particleAmount={1000} />
      </ButtonRow>

      <ButtonRow label="Color palette" icon="💜">
        <Confetti
          colorPalette={[
            [68, 23, 82, 1],
            [129, 116, 160, 1],
            [168, 136, 181, 1],
            [239, 182, 200, 1],
          ]}
        />
      </ButtonRow>

      <ButtonRow label="Size" icon="▪️">
        <Confetti size={0.5} />
      </ButtonRow>

      <ButtonRow label="Size" icon="⬛️">
        <Confetti size={1.5} />
      </ButtonRow>

      <ButtonRow label="Gravity" icon="➡️">
        <Confetti
          gravity={tgpu['~unstable']
            .fn([d.vec2f], d.vec2f)
            .does(/* wgsl */ `(pos: vec2f) -> vec2f {
                return vec2f(0.00005, 0);
            }`)}
        />
      </ButtonRow>

      <ButtonRow label="Gravity" icon="⬆️">
        <Confetti
          gravity={tgpu['~unstable']
            .fn([d.vec2f], d.vec2f)
            .does(/* wgsl */ `(pos: vec2f) -> vec2f {
                return vec2f(0, 0.00001);
            }`)}
        />
      </ButtonRow>

      <ButtonRow label="Gravity" icon="↕️">
        <Confetti
          gravity={tgpu['~unstable']
            .fn([d.vec2f], d.vec2f)
            .does(/* wgsl */ `(pos: vec2f) -> vec2f {
                return vec2f(-pos.x, -pos.y) / 20000;
            }`)}
          maxDurationTime={2000}
        />
      </ButtonRow>

      <ButtonRow label="Initial state" icon="💣">
        <Confetti
          initParticleData={(particleAmount: number) =>
            Array(particleAmount)
              .fill(0)
              .map(() => ({
                position: d.vec2f(
                  (2 * Math.random() - 1) / 2 / 50,
                  (2 * Math.random() - 1) / 2 / 50,
                ),
                velocity: d.vec2f(
                  (Math.random() * 2 - 1) / 30,
                  (Math.random() * 2 - 1) / 30,
                ),
                seed: Math.random(),
              }))
          }
          gravity={tgpu['~unstable']
            .fn([d.vec2f], d.vec2f)
            .does(/* wgsl */ `(pos: vec2f) -> vec2f {
                return vec2f(0, -0.00002);
            }`)}
        />
      </ButtonRow>

      <Text style={{ marginBottom: 20 }} />
    </ScrollView>
  );
}

function ButtonRow({
  icon,
  label,
  children,
}: { icon?: string; label?: string; children: ReactNode }) {
  const [confettiKey, setConfettiKey] = useState(0);
  return (
    <>
      <Pressable
        onPress={() => setConfettiKey((key) => key + 1)}
        onLongPress={() => setConfettiKey(0)}
        style={{
          borderRadius: 20,
          backgroundColor: 'rgba(215, 179, 77, 0.4)',
          padding: 20,
          width: '80%',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <Text style={{ fontSize: 30 }}>{icon ?? '🎉'} </Text>
          <Text style={{ fontSize: 17, fontWeight: 600, opacity: 0.7 }}>
            {label}
          </Text>
        </View>
      </Pressable>

      {confettiKey > 0 && (
        <View
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            cursor: 'auto',
          }}
          key={confettiKey}
        >
          {children}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    width: '100%',
  },
});
