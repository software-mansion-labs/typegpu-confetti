import { randf } from '@typegpu/noise';
import { type ReactNode, useRef, useState } from 'react';
import { d } from 'typegpu';
import { type ConfettiRef, type GravityFn, ParticleInit, type SpawnFn } from 'typegpu-confetti';
import { Confetti, ConfettiProvider, useConfetti } from 'typegpu-confetti/react';

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

const customGravity: GravityFn = (pos) => {
  'use gpu';
  return d.vec2f(-pos.x, -3);
};

export default function App() {
  return (
    <ConfettiProvider maxParticleAmount={2000}>
      <div className="container">
        <h1>typegpu-confetti</h1>
        <div className="row">
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

          <ButtonRow label="Typed spawn" icon="⛲️">
            <Confetti spawn={fountainSpawn} lifetime={4} />
          </ButtonRow>

          <ButtonRow label="No auto-timeout" icon="♾️">
            <Confetti spawn={fountainSpawn} autoStop={false} />
          </ButtonRow>

          <ImperativeConfettiButtonRow label="Imperative" icon="🏛️" />
        </div>
      </div>
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
      <button type="button" onClick={() => setConfettiKey((key) => key + 1)}>
        <div className="row">
          <div className="icon">{icon ?? '🎉'} </div>
          <div className="label">{label}</div>
        </div>
      </button>

      {confettiKey > 0 && (
        <div
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
        </div>
      )}
    </>
  );
}

function ConfettiContextButton() {
  const confetti = useConfetti();

  return (
    <button type="button" onClick={() => confetti?.current?.emit(200)}>
      <div className="row">
        <div className="icon">🌨️</div>
        <div className="label">Default (using hook)</div>
      </div>
    </button>
  );
}

function ImperativeConfettiButtonRow({ icon, label }: { icon?: string; label?: string }) {
  const confettiRef = useRef<ConfettiRef>(null);
  const [alternateStyle, setAlternateStyle] = useState(false);

  const rapidEmit = () => {
    confettiRef.current?.emit(250);
    confettiRef.current?.emit(750);
  };

  return (
    <>
      <button type="button" onClick={() => confettiRef.current?.emit(10_000)}>
        <div className="row">
          <div className="icon">{icon ?? '🎉'} </div>
          <div className="label">{label}</div>
        </div>
      </button>

      <button type="button" onClick={rapidEmit}>
        Rapid emits
      </button>
      <button type="button" onClick={() => confettiRef.current?.pause()}>
        Pause
      </button>
      <button type="button" onClick={() => confettiRef.current?.resume()}>
        Resume
      </button>
      <button type="button" onClick={() => confettiRef.current?.restart()}>
        Restart
      </button>
      <button type="button" onClick={() => setAlternateStyle((value) => !value)}>
        Change props
      </button>

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
