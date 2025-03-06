import {
  type ReactNode,
  type RefObject,
  createContext,
  useContext,
  useRef,
} from 'react';
import { View } from 'react-native';
import Confetti, { type ConfettiRef, type ConfettiPropTypes } from './Confetti';

const ConfettiContext = createContext<RefObject<ConfettiRef> | null>(null);

export function ConfettiProvider(
  props: { children: ReactNode } & ConfettiPropTypes,
) {
  const { children, ...confettiProps } = props;
  const ref = useRef<ConfettiRef>(null);

  return (
    <ConfettiContext.Provider value={ref}>
      <View style={{ position: 'static', width: '100%', height: '100%' }}>
        {children}

        <Confetti
          {...confettiProps}
          initParticleAmount={confettiProps.initParticleAmount ?? 0}
          maxParticleAmount={confettiProps.maxParticleAmount ?? 500}
          ref={ref}
        />
      </View>
    </ConfettiContext.Provider>
  );
}

export function useConfetti() {
  return useContext(ConfettiContext);
}
