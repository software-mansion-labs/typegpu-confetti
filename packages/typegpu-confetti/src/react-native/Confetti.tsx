import type { StyleProp, ViewStyle } from 'react-native';
import { Canvas as RNCanvas } from 'react-native-wgpu';

import createConfettiComponent from '../core/create-confetti-component.tsx';

const Confetti = createConfettiComponent<{ style?: StyleProp<ViewStyle> | undefined }>({
  Canvas: function Canvas({ canvasRef, ended, ...rest }) {
    return (
      <RNCanvas
        transparent
        ref={canvasRef}
        style={[
          {
            opacity: ended ? 0 : 1,
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            zIndex: 50,
            pointerEvents: 'none',
            cursor: 'auto',
          },
          rest.style,
        ]}
        {...rest}
      />
    );
  },
});

export default Confetti;
