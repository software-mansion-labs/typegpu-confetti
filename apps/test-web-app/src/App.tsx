import { randf } from '@typegpu/noise';
import { type ReactNode, useRef, useState } from 'react';
import tgpu from 'typegpu';
import {
  type ConfettiRef,
  type GravityFn,
  type InitParticleFn,
  particles,
} from 'typegpu-confetti';
import {
  Confetti,
  ConfettiProvider,
  useConfetti,
} from 'typegpu-confetti/react';
import * as d from 'typegpu/data';
import * as std from 'typegpu/std';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const t = tgpu;

const centerGravity: GravityFn = (args) => {
  'kernel';
  return std.mul(2, d.vec2f(-args.pos.x, -args.pos.y));
};

const rightGravity: GravityFn = () => {
  'kernel';
  return d.vec2f(2.5, 0);
};
const upGravity: GravityFn = () => {
  'kernel';
  return d.vec2f(0, 0.5);
};
const strongGravity: GravityFn = () => {
  'kernel';
  return d.vec2f(0, -3);
};

const pointInitParticle: InitParticleFn = (args) => {
  'kernel';
  particles.value[args.index].position = d.vec2f(
    (2 * randf.sample() - 1) / 2 / 50,
    (2 * randf.sample() - 1) / 2 / 50,
  );
  particles.value[args.index].velocity = d.vec2f(
    50 * ((randf.sample() * 2 - 1) / 35 / 0.5),
    50 * ((randf.sample() * 2 - 1) / 30 + 0.05),
  );
};

const twoSidesInitParticle: InitParticleFn = ({ index: i }) => {
  'kernel';

  if (i % 2 === 0) {
    particles.value[i].position = d.vec2f(
      (2 * randf.sample() - 1) / 2 / 50 + 1,
      (2 * randf.sample() - 1) / 2 / 50,
    );

    particles.value[i].velocity = d.vec2f(
      -1 + (randf.sample() * 2 - 1),
      1.5 + (randf.sample() * 2 - 1),
    );
  } else {
    particles.value[i].position = d.vec2f(
      (2 * randf.sample() - 1) / 2 / 50 - 1,
      (2 * randf.sample() - 1) / 2 / 50,
    );

    particles.value[i].velocity = d.vec2f(
      1 + (randf.sample() * 2 - 1),
      1.5 + (randf.sample() * 2 - 1),
    );
  }
};

const customGravity: GravityFn = ({ pos }) => {
  'kernel';
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
            <Confetti
              colorPalette={[[255, 255, 255, 0.8]]}
              size={0.5}
              initParticleAmount={400}
            />
          </ButtonRow>

          <ButtonRow label="Gravity" icon="➡️">
            <Confetti gravity={rightGravity} />
          </ButtonRow>

          <ButtonRow label="Gravity" icon="⬆️">
            <Confetti gravity={upGravity} maxDurationTime={5} />
          </ButtonRow>

          <ButtonRow label="Gravity" icon="↕️">
            <Confetti gravity={centerGravity} maxDurationTime={5} />
          </ButtonRow>

          <ButtonRow label="Initial state, Gravity" icon="💣">
            <Confetti
              initParticle={pointInitParticle}
              gravity={strongGravity}
            />
          </ButtonRow>

          <ButtonRow label="Initial state" icon="2️⃣">
            <Confetti
              initParticle={twoSidesInitParticle}
              gravity={customGravity}
              maxDurationTime={4}
            />
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
}: { icon?: string; label?: string; children: ReactNode }) {
  const [confettiKey, setConfettiKey] = useState(0);
  return (
    <>
      <button type="button" onClick={() => setConfettiKey((key) => key + 1)}>
        <div className="row">
          <div className='icon'>{icon ?? '🎉'} </div>
          <div className='label'>
            {label}
          </div>
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
    <button type="button" onClick={() => confetti?.current?.addParticles(200)}>
      <div className="row">
        <div className='icon'>🌨️</div>
        <div className='label'>
          Default (using hook)
        </div>
      </div>
    </button>
  );
}

function ImperativeConfettiButtonRow({
  icon,
  label,
}: { icon?: string; label?: string }) {
  const confettiRef = useRef<ConfettiRef>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => confettiRef.current?.addParticles(50)}
      >
        <div className="row">
          <div className='icon'>{icon ?? '🎉'} </div>
          <div className='label'>
            {label}
          </div>
        </div>
      </button>

      <Confetti
        ref={confettiRef}
        initParticleAmount={0}
        maxParticleAmount={1000}
        maxDurationTime={2}
      />
    </>
  );
}
