import React, { type CSSProperties } from 'react';

import createConfettiComponent from '../core/create-confetti-component.tsx';

const Confetti = createConfettiComponent<{ style?: CSSProperties | undefined }>({
  Canvas: function Canvas({ canvasRef, ended: _ended, ...rest }) {
    return (
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          width: '100%',
          height: '100%',
          inset: 0,
          pointerEvents: 'none',
          ...rest.style,
        }}
        {...rest}
      />
    );
  },
});

export default Confetti;
