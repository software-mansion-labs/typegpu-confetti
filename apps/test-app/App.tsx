import { type ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import tgpu from 'typegpu';
import Confetti from 'typegpu-confetti/dist';
import * as d from 'typegpu/data';

export default function App() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ButtonRow label="default">
        <Confetti />
      </ButtonRow>

      <ButtonRow label="particle amount ▫️">
        <Confetti particleAmount={50} />
      </ButtonRow>

      <ButtonRow label="particle amount ⬜️">
        <Confetti particleAmount={1000} />
      </ButtonRow>

      <ButtonRow label="color palette 💜">
        <Confetti
          colorPalette={[
            [68, 23, 82],
            [129, 116, 160],
            [168, 136, 181],
            [239, 182, 200],
          ].map(([r, g, b]) => d.vec4f(r / 255, g / 255, b / 255, 1))}
        />
      </ButtonRow>

      <ButtonRow label="gravity ➡️">
        <Confetti
          gravity={tgpu['~unstable']
            .fn([d.vec2f], d.vec2f)
            .does(/* wgsl */ `(pos: vec2f) -> vec2f {
                return vec2f(0.00005, 0);
            }`)}
        />
      </ButtonRow>

      <ButtonRow label="gravity ⬆️">
        <Confetti
          gravity={tgpu['~unstable']
            .fn([d.vec2f], d.vec2f)
            .does(/* wgsl */ `(pos: vec2f) -> vec2f {
                return vec2f(0, 0.00001);
            }`)}
        />
      </ButtonRow>

      <ButtonRow label="gravity ↕️">
        <Confetti
          gravity={tgpu['~unstable']
            .fn([d.vec2f], d.vec2f)
            .does(/* wgsl */ `(pos: vec2f) -> vec2f {
                return vec2f(-pos.x, -pos.y) / 20000;
            }`)}
        />
      </ButtonRow>
    </ScrollView>
  );
}

function ButtonRow({
  label,
  children,
}: { label?: string; children: ReactNode }) {
  const [confettiKey, setConfettiKey] = useState(0);
  return (
    <>
      <Pressable
        onPress={() => setConfettiKey((key) => key + 1)}
        style={{
          borderRadius: 20,
          boxShadow: 'rgba(132, 181, 240, 0.4) 0px 2px 8px 0px',
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
          <Text style={{ fontSize: 30 }}>🎉</Text>
          <Text style={{ fontSize: 17 }}>{label}</Text>
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
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  row: {},
});
