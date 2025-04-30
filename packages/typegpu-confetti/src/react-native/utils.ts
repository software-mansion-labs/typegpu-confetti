import { useState } from 'react';
import { PixelRatio } from 'react-native';
import { type RNCanvasContext, useCanvasEffect } from 'react-native-wgpu';
import { useRoot } from '../utils';

export function useGPUSetup(
  presentationFormat: GPUTextureFormat = navigator.gpu.getPreferredCanvasFormat(),
) {
  const root = useRoot();
  const [context, setContext] = useState<RNCanvasContext | null>(null);

  const ref = useCanvasEffect(() => {
    const ctx = ref.current?.getContext('webgpu');

    if (!ctx) {
      setContext(null);
      return;
    }

    const canvas = ctx.canvas as HTMLCanvasElement;
    canvas.width = canvas.clientWidth * PixelRatio.get();
    canvas.height = canvas.clientHeight * PixelRatio.get();

    ctx.configure({
      device: root.device,
      format: presentationFormat,
      alphaMode: 'premultiplied',
    });

    setContext(ctx);
  });

  return { canvasRef: ref, context };
}
