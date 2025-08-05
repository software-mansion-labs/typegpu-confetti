import { render } from '@testing-library/react';
import * as d from 'typegpu/data';
import Confetti from '../Confetti';

jest.mock('../../utils', () => ({
  useDevice: jest.fn(),
  useFrame: jest.fn(),
  useRoot: jest.fn(),
  useBuffer: jest.fn(() => ({ current: null })),
}));

const mockUtils = require('../../utils');

describe('Confetti (React)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUtils.useDevice.mockReturnValue({ device: null });
    mockUtils.useRoot.mockReturnValue(null);
    mockUtils.useFrame.mockImplementation(() => {});
  });

  it('should render null when GPU device is not available', () => {
    const { container } = render(<Confetti />);
    expect(container.firstChild).toBeNull();
  });

  it('should handle props correctly when GPU is not available', () => {
    const { container } = render(
      <Confetti
        initParticleAmount={100}
        colorPalette={[[1, 0, 0, 1], [0, 1, 0, 1]]}
        maxDurationTime={5000}
        gravity={() => {
          'kernel';
          return d.vec2f(0, -0.8);
        }}
        size={2.5}
      />
    );
    
    // Should render null when device is not available, regardless of props
    expect(container.firstChild).toBeNull();
  });

  it('should accept all expected prop types without TypeScript errors', () => {
    expect(() => {
      render(
        <Confetti
          initParticleAmount={50}
          maxParticleAmount={200}
          colorPalette={[
            [1, 0, 0, 1],
            [0, 1, 0, 1],
            [0, 0, 1, 1]
          ]}
          maxDurationTime={3000}
          gravity={() => {
            'kernel';
            return d.vec2f(0, -0.5);
          }}
          size={1.5}
        />
      );
    }).not.toThrow();
  });
});
