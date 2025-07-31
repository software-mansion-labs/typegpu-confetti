import type React from 'react';
import { renderHook, act } from '@testing-library/react';
import { RootContext } from '../context';
import { useBuffer } from '../utils';

// Mock the useRoot hook
const mockRoot = {
  createBuffer: jest.fn().mockReturnValue({
    write: jest.fn(),
    destroy: jest.fn(),
    destroyed: false,
  }),
};

// Create a wrapper component to provide the mocked context value
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <RootContext.Provider value={mockRoot}>
    {children}
  </RootContext.Provider>
);

// Mock schema type for testing
const mockSchema = {
  type: 'buffer',
  size: 16,
} as any;

describe('useBuffer Hook', () => {
  beforeEach(() => {
    // Clear mock history before each test
    (mockRoot.createBuffer as jest.Mock).mockClear();
    (mockRoot.createBuffer().write as jest.Mock).mockClear();
    (mockRoot.createBuffer().destroy as jest.Mock).mockClear();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should match snapshot for initial render', () => {
    const { result } = renderHook(() => useBuffer(mockSchema), { wrapper });
    
    expect({
      root: mockRoot,
      createBufferCalled: mockRoot.createBuffer.mock.calls.length,
      bufferMethods: {
        write: result.current.write,
        destroy: result.current.destroy,
        destroyed: result.current.destroyed,
      },
    }).toMatchSnapshot();
  });

  it('should match snapshot when value is provided', () => {
    const testValue = { x: 1, y: 2, z: 3 };
    const { result } = renderHook(() => useBuffer(mockSchema, testValue), {
      wrapper,
    });
    
    expect({
      root: mockRoot,
      createBufferCalled: mockRoot.createBuffer.mock.calls.length,
      providedValue: testValue,
      bufferMethods: {
        write: result.current.write,
        destroy: result.current.destroy,
        destroyed: result.current.destroyed,
      },
    }).toMatchSnapshot();
  });

  it('should match snapshot after value update', () => {
    const initialValue = { x: 1, y: 2 };
    const updatedValue = { x: 3, y: 4 };
    
    const { result, rerender } = renderHook(
      ({ value }) => useBuffer(mockSchema, value),
      {
        initialProps: { value: initialValue },
        wrapper,
      },
    );
    // Capture initial state
    const initialSnapshot = {
      createBufferCalls: mockRoot.createBuffer.mock.calls.length,
      writeCalls: (result.current.write as jest.Mock).mock?.calls?.length || 0,
    };

    // Update value
    act(() => {
      rerender({ value: updatedValue });
    });

    const finalSnapshot = {
      initial: initialSnapshot,
      afterUpdate: {
        createBufferCalls: mockRoot.createBuffer.mock.calls.length,
        writeCalls: (result.current.write as jest.Mock).mock?.calls?.length || 0,
        finalValue: updatedValue,
      },
    };

    expect(finalSnapshot).toMatchSnapshot();
  });

  it('should match snapshot for cleanup behavior', () => {
    const { result, unmount } = renderHook(() => useBuffer(mockSchema), {
      wrapper,
    });

    const beforeUnmount = {
      destroyCalled: (result.current.destroy as jest.Mock).mock?.calls?.length || 0,
      pendingTimers: jest.getTimerCount(),
    };

    act(() => {
      unmount();
    });

    const afterUnmount = {
      destroyCalled: (result.current.destroy as jest.Mock).mock?.calls?.length || 0,
      pendingTimers: jest.getTimerCount(),
    };

    // Fast-forward cleanup timeout
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    const afterTimeout = {
      destroyCalled: (result.current.destroy as jest.Mock).mock?.calls?.length || 0,
      pendingTimers: jest.getTimerCount(),
    };

    expect({
      beforeUnmount,
      afterUnmount,
      afterTimeout,
    }).toMatchSnapshot();
  });

  it('should match snapshot when schema changes', () => {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    const schema1 = { type: 'buffer', size: 16 } as any;
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    const schema2 = { type: 'buffer', size: 32 } as any;
    
    const { result, rerender } = renderHook(
      ({ schema }) => useBuffer(schema),
      {
        initialProps: { schema: schema1 },
        wrapper,
      },
    );

    const initialState = {
      createBufferCalls: mockRoot.createBuffer.mock.calls.length,
      destroyCalls: (result.current.destroy as jest.Mock).mock?.calls?.length || 0,
    };

    act(() => {
      rerender({ schema: schema2 });
    });

    const finalState = {
      initial: initialState,
      afterSchemaChange: {
        createBufferCalls: mockRoot.createBuffer.mock.calls.length,
        destroyCalls: (result.current.destroy as jest.Mock).mock?.calls?.length || 0,
      },
    };

    expect(finalState).toMatchSnapshot();
  });
});