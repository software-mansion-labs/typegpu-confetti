import { act, renderHook } from '@testing-library/react';
import React, { StrictMode } from 'react';
import { vi } from 'vitest';
import type { TgpuRoot, TgpuBuffer } from 'typegpu';
import * as d from 'typegpu/data';
import { RootContext } from '../context';
import {
  useRoot,
  useBuffer,
  useFrame,
  useDevice,
} from '../utils';

// Mock typegpu buffer
interface MockBuffer extends TgpuBuffer<d.F32> {
  write: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  destroyed: boolean;
}

const mockBuffer: MockBuffer = {
  write: vi.fn(),
  destroy: vi.fn(),
  destroyed: false,
} as MockBuffer;

const mockCreateBuffer = vi.fn(() => mockBuffer);

const mockRoot = {
  createBuffer: mockCreateBuffer,
  device: {} as GPUDevice,
} as unknown as TgpuRoot;

// Mock WebGPU
Object.defineProperty(navigator, 'gpu', {
  value: {
    requestAdapter: vi.fn(() => Promise.resolve({})),
  },
  writable: true,
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => 
  React.createElement(RootContext.Provider, { value: mockRoot }, children);

const StrictModeWrapper = ({ children }: { children: React.ReactNode }) => 
  React.createElement(
    StrictMode, 
    {}, 
    React.createElement(RootContext.Provider, { value: mockRoot }, children)
  );

describe('utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuffer.destroyed = false;
  });

  describe('useRoot', () => {
    it('should return root from context', () => {
      const { result } = renderHook(() => useRoot(), {
        wrapper: TestWrapper,
      });

      expect(result.current).toBe(mockRoot);
    });

    it('should throw error when no root provided', () => {
      expect(() => {
        renderHook(() => useRoot());
      }).toThrow('No root (tgpu.init) object passed via context to the component.');
    });
  });

  describe('useBuffer', () => {
    const testSchema = d.f32;
    const testValue = 42;

    it('should create buffer with schema and value', () => {
      const { result } = renderHook(() => useBuffer(testSchema, testValue), {
        wrapper: TestWrapper,
      });

      expect(mockCreateBuffer).toHaveBeenCalledWith(testSchema, testValue);
      expect(result.current).toBe(mockBuffer);
    });

    it('should create buffer without initial value', () => {
      const { result } = renderHook(() => useBuffer(testSchema), {
        wrapper: TestWrapper,
      });

      expect(mockCreateBuffer).toHaveBeenCalledWith(testSchema, undefined);
      expect(result.current).toBe(mockBuffer);
    });

    it('should write to buffer when value changes', () => {
      let value = 42;
      const { rerender } = renderHook(() => useBuffer(testSchema, value), {
        wrapper: TestWrapper,
      });

      expect(mockBuffer.write).toHaveBeenCalledWith(42);

      value = 84;
      rerender();

      expect(mockBuffer.write).toHaveBeenCalledWith(84);
    });

    it('should not recreate buffer on value change', () => {
      let value = 42;
      const { rerender } = renderHook(() => useBuffer(testSchema, value), {
        wrapper: TestWrapper,
      });

      const initialCallCount = mockCreateBuffer.mock.calls.length;

      value = 84;
      rerender();

      expect(mockCreateBuffer).toHaveBeenCalledTimes(initialCallCount);
    });

    it('should destroy buffer on unmount after timeout', async () => {
      vi.useFakeTimers();
      
      const { unmount } = renderHook(() => useBuffer(testSchema, testValue), {
        wrapper: TestWrapper,
      });

      unmount();

      // Fast-forward timer
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(mockBuffer.destroy).toHaveBeenCalled();
      
      vi.useRealTimers();
    });

    describe('StrictMode behavior snapshots', () => {
      it('should handle buffer creation in normal mode', () => {
        const { result } = renderHook(() => useBuffer(testSchema, testValue), {
          wrapper: TestWrapper,
        });

        expect({
          createBufferCallCount: mockCreateBuffer.mock.calls.length,
          writeCallCount: mockBuffer.write.mock.calls.length,
          buffer: result.current,
        }).toMatchInlineSnapshot(`
          {
            "buffer": {
              "destroy": [MockFunction spy],
              "destroyed": false,
              "write": [MockFunction spy] {
                "calls": [
                  [
                    42,
                  ],
                ],
                "results": [
                  {
                    "type": "return",
                    "value": undefined,
                  },
                ],
              },
            },
            "createBufferCallCount": 1,
            "writeCallCount": 1,
          }
        `);
      });

      it('should handle buffer creation in StrictMode', () => {
        const { result } = renderHook(() => useBuffer(testSchema, testValue), {
          wrapper: StrictModeWrapper,
        });

        expect({
          createBufferCallCount: mockCreateBuffer.mock.calls.length,
          writeCallCount: mockBuffer.write.mock.calls.length,
          buffer: result.current,
          bufferDestroyed: result.current.destroyed,
        }).toMatchInlineSnapshot(`
          {
            "buffer": {
              "destroy": [MockFunction spy] {
                "calls": [
                  [],
                ],
                "results": [
                  {
                    "type": "return",
                    "value": undefined,
                  },
                ],
              },
              "destroyed": false,
              "write": [MockFunction spy] {
                "calls": [
                  [
                    42,
                  ],
                ],
                "results": [
                  {
                    "type": "return",
                    "value": undefined,
                  },
                ],
              },
            },
            "bufferDestroyed": false,
            "createBufferCallCount": 2,
            "writeCallCount": 1,
          }
        `);
      });

      it('should handle value updates in StrictMode', () => {
        let value = 42;
        const { rerender } = renderHook(() => useBuffer(testSchema, value), {
          wrapper: StrictModeWrapper,
        });

        const initialState = {
          createBufferCallCount: mockCreateBuffer.mock.calls.length,
          writeCallCount: mockBuffer.write.mock.calls.length,
        };

        value = 84;
        rerender();

        expect({
          initial: initialState,
          afterUpdate: {
            createBufferCallCount: mockCreateBuffer.mock.calls.length,
            writeCallCount: mockBuffer.write.mock.calls.length,
          },
          bufferNotRecreated: initialState.createBufferCallCount === mockCreateBuffer.mock.calls.length,
        }).toMatchInlineSnapshot(`
          {
            "afterUpdate": {
              "createBufferCallCount": 2,
              "writeCallCount": 2,
            },
            "bufferNotRecreated": true,
            "initial": {
              "createBufferCallCount": 2,
              "writeCallCount": 1,
            },
          }
        `);
      });

      it('should handle cleanup timeouts in StrictMode', async () => {
        vi.useFakeTimers();
        
        const { unmount } = renderHook(() => useBuffer(testSchema, testValue), {
          wrapper: StrictModeWrapper,
        });

        const preUnmountState = {
          destroyCallCount: mockBuffer.destroy.mock.calls.length,
        };

        unmount();

        const postUnmountPreTimeout = {
          destroyCallCount: mockBuffer.destroy.mock.calls.length,
        };

        act(() => {
          vi.advanceTimersByTime(1000);
        });

        expect({
          preUnmount: preUnmountState,
          postUnmountPreTimeout,
          afterTimeout: {
            destroyCallCount: mockBuffer.destroy.mock.calls.length,
          },
        }).toMatchInlineSnapshot(`
          {
            "afterTimeout": {
              "destroyCallCount": 2,
            },
            "postUnmountPreTimeout": {
              "destroyCallCount": 1,
            },
            "preUnmount": {
              "destroyCallCount": 1,
            },
          }
        `);
        
        vi.useRealTimers();
      });
    });
  });

  describe('useFrame', () => {
    it('should call loop function with delta time when running', async () => {
      const mockLoop = vi.fn();
      
      renderHook(() => useFrame(mockLoop, true));

      // Wait for requestAnimationFrame to be called
      await act(async () => {
        await new Promise(resolve => requestAnimationFrame(resolve));
      });

      expect(mockLoop).toHaveBeenCalled();
      expect(mockLoop.mock.calls.length).toBeGreaterThan(0);
      expect(typeof mockLoop.mock.calls[0]?.[0]).toBe('number');
    });

    it('should not call loop function when not running', () => {
      const mockLoop = vi.fn();
      
      renderHook(() => useFrame(mockLoop, false));

      expect(mockLoop).not.toHaveBeenCalled();
    });
  });

  describe('useDevice', () => {
    const mockDevice = { destroy: vi.fn() };
    const mockAdapter = { requestDevice: vi.fn(() => Promise.resolve(mockDevice)) };
    
    beforeEach(() => {
      (navigator.gpu.requestAdapter as ReturnType<typeof vi.fn>) = vi.fn(() => Promise.resolve(mockAdapter));
    });

    it('should initially return null device and adapter', () => {
      const { result } = renderHook(() => useDevice());

      expect(result.current.device).toBeNull();
      expect(result.current.adapter).toBeNull();
    });

    it('should request adapter and device', async () => {
      const adapterOptions = { powerPreference: 'high-performance' as const };
      const deviceDescriptor = { label: 'test-device' };

      renderHook(() => useDevice(adapterOptions, deviceDescriptor));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(navigator.gpu.requestAdapter).toHaveBeenCalledWith(adapterOptions);
      expect(mockAdapter.requestDevice).toHaveBeenCalledWith(deviceDescriptor);
    });
  });
});
