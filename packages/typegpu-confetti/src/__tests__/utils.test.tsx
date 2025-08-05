import type React from 'react';
import { StrictMode } from 'react';
import { renderHook, act } from '@testing-library/react';
import { RootContext } from '../context';
import { useBuffer } from '../utils';
import type { TgpuRoot } from 'typegpu';
import type { AnyData } from 'typegpu/data';

const mockRoot = {
  createBuffer: jest.fn().mockReturnValue({
    write: jest.fn(),
    destroy: jest.fn(),
    destroyed: false,
  }),
} as unknown as TgpuRoot;

const mockSchema = {
  type: 'buffer',
  size: 16,
} as unknown as AnyData;

describe('useBuffer Hook', () => {
  beforeEach(() => {
    (mockRoot.createBuffer as jest.Mock).mockClear();
    const newBuffer = {
      write: jest.fn(),
      destroy: jest.fn(),
      destroyed: false,
    };
    (mockRoot.createBuffer as jest.Mock).mockReturnValue(newBuffer);
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('without StrictMode', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RootContext.Provider value={mockRoot}>{children}</RootContext.Provider>
    );

    it('should match snapshot for initial render', () => {
      const { result } = renderHook(() => useBuffer(mockSchema), { wrapper });
      expect({
        createBufferCalls: (mockRoot.createBuffer as jest.Mock).mock.calls.length,
        destroyCalls: (result.current.destroy as jest.Mock).mock.calls.length,
      }).toMatchSnapshot();
    });

    it('should match snapshot when schema changes', () => {
      const schema1 = { type: 'buffer', size: 16 } as unknown as AnyData;
      const schema2 = { type: 'buffer', size: 32 } as unknown as AnyData;
      const { result, rerender } = renderHook(({ schema }) => useBuffer(schema), {
        initialProps: { schema: schema1 },
        wrapper,
      });
      const initialDestroyCalls = (result.current.destroy as jest.Mock).mock.calls.length;
      act(() => {
        rerender({ schema: schema2 });
      });
      expect({
        initial: {
          createBufferCalls: 1,
          destroyCalls: initialDestroyCalls,
        },
        afterSchemaChange: {
          createBufferCalls: (mockRoot.createBuffer as jest.Mock).mock.calls.length,
          destroyCalls: (result.current.destroy as jest.Mock).mock.calls.length,
        },
      }).toMatchSnapshot();
    });
  });

  describe('with StrictMode', () => {
    const strictModeWrapper = ({ children }: { children: React.ReactNode }) => (
      <StrictMode>
        <RootContext.Provider value={mockRoot}>{children}</RootContext.Provider>
      </StrictMode>
    );

    it('should match snapshot for initial render', () => {
      const { result } = renderHook(() => useBuffer(mockSchema), {
        wrapper: strictModeWrapper,
      });
      // In StrictMode, effects run twice, so we expect more calls
      expect({
        createBufferCalls: (mockRoot.createBuffer as jest.Mock).mock.calls.length,
        destroyCalls: (result.current.destroy as jest.Mock).mock.calls.length,
      }).toMatchSnapshot();
    });

    it('should match snapshot when schema changes', () => {
      const schema1 = { type: 'buffer', size: 16 } as unknown as AnyData;
      const schema2 = { type: 'buffer', size: 32 } as unknown as AnyData;
      const { result, rerender } = renderHook(({ schema }) => useBuffer(schema), {
        initialProps: { schema: schema1 },
        wrapper: strictModeWrapper,
      });
      const initialDestroyCalls = (result.current.destroy as jest.Mock).mock.calls.length;
      const initialCreateCalls = (mockRoot.createBuffer as jest.Mock).mock.calls.length;
      act(() => {
        rerender({ schema: schema2 });
      });
      expect({
        initial: {
          createBufferCalls: initialCreateCalls,
          destroyCalls: initialDestroyCalls,
        },
        afterSchemaChange: {
          createBufferCalls: (mockRoot.createBuffer as jest.Mock).mock.calls.length,
          destroyCalls: (result.current.destroy as jest.Mock).mock.calls.length,
        },
      }).toMatchSnapshot();
    });
  });
});