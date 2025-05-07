import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  createContext,
  useContext,
  useRef,
} from 'react';
import type { ConfettiPropTypes, ConfettiRef } from '../types';
import Confetti from './Confetti';

const ConfettiContext = createContext<RefObject<ConfettiRef | null> | null>(
  null,
);

export function ConfettiProvider(
  props: { children: ReactNode, style?: CSSProperties } & ConfettiPropTypes,
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
