import { Root } from '@typegpu/react';
import { registerRootComponent } from 'expo';
import { Suspense } from 'react';

import App from './App';

function RootApp() {
  return (
    <Root
      options={{
        device: {
          // The confetti frame loop runs on the UI runtime while React writes buffers from the
          // JS thread; Dawn serializes device access only with this feature enabled.
          optionalFeatures: ['implicit-device-synchronization' as GPUFeatureName],
        },
      }}
    >
      <Suspense fallback={null}>
        <App />
      </Suspense>
    </Root>
  );
}

registerRootComponent(RootApp);
