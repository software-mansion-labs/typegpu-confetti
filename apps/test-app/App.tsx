import { type ReactNode, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import tgpu from 'typegpu';
import Confetti, {
  ConfettiProvider,
  gravityFn,
  useConfetti,
} from 'typegpu-confetti';
import * as d from 'typegpu/data';
import * as std from 'typegpu/std';

const t = tgpu;

const centerGravity = gravityFn.does((pos) =>
  std.mul(0.00005, d.vec2f(-pos.x, -pos.y)),
);
const rightGravity = gravityFn.does((pos) => d.vec2f(0.00005, 0));
const upGravity = gravityFn.does((pos) => d.vec2f(0, 0.00001));
const customGravity = gravityFn.does((pos) => d.vec2f(0, -0.00006));
const customGravity2 = gravityFn.does(
  '(pos: vec2f) -> vec2f { return vec2f(0, -0.00001);}',
);

export default function App() {
  return (
    <ConfettiProvider>
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
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

          <ButtonRow label="Particle amount" icon="▫️">
            <Confetti particleAmount={50} />
          </ButtonRow>

          <ButtonRow label="Particle amount" icon="⬜️">
            <Confetti particleAmount={1000} />
          </ButtonRow>

          <ButtonRow label="Size" icon="▪️">
            <Confetti size={0.5} />
          </ButtonRow>

          <ButtonRow label="Size" icon="⬛️">
            <Confetti size={1.5} />
          </ButtonRow>

          <ButtonRow label="Color, Size, Amount" icon="🌨️">
            <Confetti
              colorPalette={[[255, 255, 255, 0.8]]}
              size={0.5}
              particleAmount={400}
            />
          </ButtonRow>

          <ButtonRow label="Gravity" icon="➡️">
            <Confetti gravity={rightGravity} />
          </ButtonRow>

          <ButtonRow label="Gravity" icon="⬆️">
            <Confetti gravity={upGravity} />
          </ButtonRow>

          <ButtonRow label="Gravity, Max duration" icon="↕️">
            <Confetti gravity={centerGravity} maxDurationTime={5000} />
          </ButtonRow>

          <ButtonRow label="Initial state, Gravity" icon="💣">
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
                      (Math.random() * 2 - 1) / 35 / 0.5,
                      (Math.random() * 2 - 1) / 30 + 0.05,
                    ),
                    seed: Math.random(),
                  }))
              }
              gravity={customGravity}
            />
          </ButtonRow>

          <ButtonRow label="Initial state, Gravity" icon="🌈">
            <Confetti
              initParticleData={(particleAmount: number) =>
                Array(particleAmount)
                  .fill(0)
                  .map(() => {
                    const radius = ((Math.random() + 0.5) * Math.PI) / 2;
                    return {
                      position: d.vec2f(
                        (2 * Math.random() - 1) / 20,
                        (2 * Math.random() - 1) / 20,
                      ),
                      velocity: std.mul(
                        0.01,
                        std.normalize(
                          d.vec2f(Math.cos(radius), Math.sin(radius)),
                        ),
                      ),
                      seed: Math.random(),
                    };
                  })
              }
              gravity={customGravity2}
            />
          </ButtonRow>
        </View>
      </SafeAreaView>
    </ConfettiProvider>
  );
}

function ConfettiContextButton() {
  const confetti = useConfetti();

  return (
    <Pressable
      onPress={() => confetti.rerun()}
      onLongPress={() => confetti.dispose()}
      style={{
        borderRadius: 20,
        backgroundColor: 'rgb(82 89 238)',
        padding: 20,
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
        <Text style={{ fontSize: 15, fontWeight: 600, color: 'white' }}>
          Default (using hook)
        </Text>
      </View>
    </Pressable>
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
          backgroundColor: 'rgb(82 89 238)',
          padding: 20,
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
          <Text style={{ fontSize: 15, fontWeight: 600, color: 'white' }}>
            {label}
          </Text>
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

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
    width: '100%',
    position: 'static',
    flexWrap: 'wrap',
    flexDirection: 'row',
    paddingHorizontal: 10,
  },
});
