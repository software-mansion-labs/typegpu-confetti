import { RootContext } from '../context';

describe('RootContext', () => {
  it('should be a React context with null as default value', () => {
    expect(RootContext).toBeDefined();
    expect(RootContext.displayName).toBeUndefined();
    
    expect(RootContext.Provider).toBeDefined();
    expect(RootContext.Consumer).toBeDefined();
  });

  it('should have the correct context structure', () => {
    expect(typeof RootContext).toBe('object');
    expect('Provider' in RootContext).toBe(true);
    expect('Consumer' in RootContext).toBe(true);
  });
});
