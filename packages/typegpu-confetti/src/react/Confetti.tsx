import React, { type CSSProperties } from 'react';

import createConfettiComponent from '../core/create-confetti-component.tsx';

const Confetti = createConfettiComponent<{ style?: CSSProperties | undefined }>({
  Canvas: function Canvas({ canvasRef, ended, style, ...rest }) {
    return (
      <canvas
        ref={canvasRef as React.RefCallback<HTMLCanvasElement>}
        style={{
          position: 'fixed',
          width: '100%',
          height: '100%',
          inset: 0,
          pointerEvents: 'none',
          ...style,
          visibility: ended ? 'hidden' : style?.visibility,
        }}
        {...rest}
      />
    );
  },
});

export default Confetti;
