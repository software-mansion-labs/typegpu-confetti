import {
  type ReactNode,
  type RefObject,
  createContext,
  useContext,
  useRef,
} from 'react';
import React from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';
import type { ConfettiPropTypes, ConfettiRef } from '../types';
import Confetti from './Confetti';

const react = React;

const ConfettiContext = createContext<RefObject<ConfettiRef | null> | null>(null);

export function ConfettiProvider(
  props: { children: ReactNode } &  ConfettiPropTypes & { style?: StyleProp<ViewStyle> },
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
