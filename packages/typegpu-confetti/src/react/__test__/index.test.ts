import * as ReactIndex from '../index';

describe('React index exports', () => {
  it('should export Confetti component', () => {
    expect(ReactIndex.Confetti).toBeDefined();
    expect(typeof ReactIndex.Confetti).toBe('object');
  });

  it('should export ConfettiProvider component', () => {
    expect(ReactIndex.ConfettiProvider).toBeDefined();
    expect(typeof ReactIndex.ConfettiProvider).toBe('function');
  });

  it('should export useConfetti hook', () => {
    expect(ReactIndex.useConfetti).toBeDefined();
    expect(typeof ReactIndex.useConfetti).toBe('function');
  });

  it('should export all expected members', () => {
    const expectedExports = ['Confetti', 'ConfettiProvider', 'useConfetti'];
    const actualExports = Object.keys(ReactIndex);
    
    for (const expectedExport of expectedExports) {
      expect(actualExports).toContain(expectedExport);
    }
  });
});
