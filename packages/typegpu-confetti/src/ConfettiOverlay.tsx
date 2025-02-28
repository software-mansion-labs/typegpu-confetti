import {
  type ReactNode,
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react';
import { View } from 'react-native';
import Confetti, { type ConfettiPropTypes } from './Confetti';

const ConfettiContext = createContext({
  rerun: () => {},
  dispose: () => {},
});

export function ConfettiOverlay(
  props: { children: ReactNode } & ConfettiPropTypes,
) {
  const { children, ...confettiProps } = props;
  const [confettiKey, setConfettiKey] = useState(0);

  const confettiContext = useMemo(
    () => ({
      rerun: () => setConfettiKey((key) => key + 1),
      dispose: () => setConfettiKey(0),
    }),
    [],
  );

  return (
    <ConfettiContext.Provider value={confettiContext}>
      <View style={{ position: 'static', width: '100%', height: '100%' }}>
        {children}
        {confettiKey > 0 && <Confetti key={confettiKey} {...confettiProps} />}
      </View>
    </ConfettiContext.Provider>
  );
}

export function useConfetti() {
  return useContext(ConfettiContext);
}
