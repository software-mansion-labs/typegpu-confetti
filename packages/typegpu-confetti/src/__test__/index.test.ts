import * as MainIndex from '../index';

describe('Main index exports', () => {
  it('should export schema-related items', () => {
    const schemaExports = [
      'canvasAspectRatio',
      'particles',
      'maxDurationTime',
      'initParticle',
      'maxParticleAmount',
      'deltaTime',
      'time',
      'gravity',
      'gravityFn',
      'initParticleFn'
    ];

    for (const exportName of schemaExports) {
      expect(MainIndex).toHaveProperty(exportName);
      expect(MainIndex[exportName as keyof typeof MainIndex]).toBeDefined();
    }
  });

  it('should export function shells', () => {
    expect(MainIndex.gravityFn).toBeDefined();
    expect(MainIndex.initParticleFn).toBeDefined();
    expect(typeof MainIndex.gravityFn).toBe('function');
    expect(typeof MainIndex.initParticleFn).toBe('function');
  });

  it('should export all expected schema items', () => {
    const expectedExports = [
      'canvasAspectRatio',
      'particles', 
      'maxDurationTime',
      'initParticle',
      'maxParticleAmount',
      'deltaTime',
      'time',
      'gravity',
      'gravityFn',
      'initParticleFn'
    ];

    const actualExports = Object.keys(MainIndex);
    
    for (const expectedExport of expectedExports) {
      expect(actualExports).toContain(expectedExport);
    }
  });
});
