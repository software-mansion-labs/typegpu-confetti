import { type ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import tgpu from 'typegpu';
import Confetti from 'typegpu-confetti/dist';
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

      <ButtonRow label="size ▪️">
        <Confetti size={0.5} />
      </ButtonRow>

      <ButtonRow label="size ⬛️">
        <Confetti size={1.5} />
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

      <Text style={{ marginBottom: 20 }} />
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    width: '100%',
  },
});
