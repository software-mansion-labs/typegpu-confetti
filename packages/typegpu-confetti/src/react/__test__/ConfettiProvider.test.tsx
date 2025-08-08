import { render, screen } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import type { ConfettiPropTypes, ConfettiRef } from '../../types';
import { ConfettiProvider, useConfetti } from '../ConfettiProvider';

globalThis.React = React;

vi.mock('../Confetti', () => ({
  default: React.forwardRef<ConfettiRef, ConfettiPropTypes & { width: number; height: number }>((props, ref) => {
    return React.createElement('div', { 
      'data-testid': 'confetti-component',
      'data-props': JSON.stringify(props)
    });
  })
}));

describe('ConfettiProvider', () => {
  it('should render children correctly', () => {
    render(
      <ConfettiProvider>
        <div data-testid="child-content">Test Content</div>
      </ConfettiProvider>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByTestId('confetti-component')).toBeInTheDocument();
  });

  it('should pass props to Confetti component with defaults', () => {
    render(
      <ConfettiProvider colorPalette={[[255, 0, 0, 1]]} size={2}>
        <div>Content</div>
      </ConfettiProvider>
    );

    const confettiComponent = screen.getByTestId('confetti-component');
    const props = JSON.parse(confettiComponent.getAttribute('data-props') || '{}');
    
    expect(props.colorPalette).toEqual([[255, 0, 0, 1]]);
    expect(props.size).toBe(2);
    expect(props.initParticleAmount).toBe(0); // default
    expect(props.maxParticleAmount).toBe(500); // default
  });

  it('should override default particle amounts when provided', () => {
    render(
      <ConfettiProvider initParticleAmount={100} maxParticleAmount={1000}>
        <div>Content</div>
      </ConfettiProvider>
    );

    const confettiComponent = screen.getByTestId('confetti-component');
    const props = JSON.parse(confettiComponent.getAttribute('data-props') || '{}');
    
    expect(props.initParticleAmount).toBe(100);
    expect(props.maxParticleAmount).toBe(1000);
  });
});

describe('useConfetti', () => {
  it('should return context value when inside ConfettiProvider', () => {
    let confettiRef: ReturnType<typeof useConfetti> = null;
    
    function TestComponent() {
      confettiRef = useConfetti();
      return <div data-testid="test-component">Test</div>;
    }

    render(
      <ConfettiProvider>
        <TestComponent />
      </ConfettiProvider>
    );

    expect(confettiRef).not.toBeNull();
    expect(confettiRef).toHaveProperty('current');
  });

  it('should return null when outside ConfettiProvider', () => {
    let confettiRef: ReturnType<typeof useConfetti> = null;
    
    function TestComponent() {
      confettiRef = useConfetti();
      return <div data-testid="test-component">Test</div>;
    }

    render(<TestComponent />);

    expect(confettiRef).toBeNull();
  });
});
