import {
  type CSSProperties,
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
  useRef,
} from 'react';
import type { ConfettiProps, ConfettiRef } from '../core/types.ts';
import Confetti from './Confetti.tsx';

const ConfettiContext = createContext<RefObject<ConfettiRef | null> | null>(null);

export function ConfettiProvider(
  props: { children: ReactNode; style?: CSSProperties } & ConfettiProps,
) {
  const { children, ...confettiProps } = props;
  const ref = useRef<ConfettiRef>(null);

  return (
    <ConfettiContext.Provider value={ref}>
      <div style={{ width: '100%', height: '100%' }}>
        {children}

        <Confetti
          {...confettiProps}
          initParticleAmount={confettiProps.initParticleAmount ?? 0}
          maxParticleAmount={confettiProps.maxParticleAmount ?? 500}
          ref={ref}
        />
      </div>
    </ConfettiContext.Provider>
  );
}

export function useConfetti() {
  return useContext(ConfettiContext);
}
