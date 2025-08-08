import { defaults } from '../defaults';

describe('defaults', () => {
  it('should have correct default values', () => {
    expect(defaults.maxDurationTime).toBe(2);
    expect(defaults.initParticleAmount).toBe(200);
    expect(defaults.maxParticleAmount).toBe(1000);
    expect(defaults.size).toBe(1);
  });

  it('should have default color palette with correct structure', () => {
    expect(Array.isArray(defaults.colorPalette)).toBe(true);
    expect(defaults.colorPalette).toHaveLength(5);
    
    // Check each color is an array of 4 numbers (RGBA)
    for (const color of defaults.colorPalette) {
      expect(Array.isArray(color)).toBe(true);
      expect(color).toHaveLength(4);
      for (const component of color) {
        expect(typeof component).toBe('number');
        // RGB values should be 0-255, alpha should be 0-1
        expect(component).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('should have gravity function', () => {
    expect(typeof defaults.gravity).toBe('function');
  });

  it('should have initParticle function', () => {
    expect(typeof defaults.initParticle).toBe('function');
  });

  it('should contain all required properties from ConfettiPropTypes', () => {
    const expectedKeys = [
      'maxDurationTime',
      'initParticleAmount', 
      'maxParticleAmount',
      'size',
      'colorPalette',
      'gravity',
      'initParticle'
    ];
    
    for (const key of expectedKeys) {
      expect(defaults).toHaveProperty(key);
      expect(defaults[key as keyof typeof defaults]).toBeDefined();
    }
  });
});
