import type { ConfettiPropTypes, ConfettiRef } from '../types';

describe('types', () => {
  describe('ConfettiPropTypes', () => {
    it('should allow optional colorPalette property', () => {
      const validProps: ConfettiPropTypes = {
        colorPalette: [[255, 0, 0, 1], [0, 255, 0, 1]]
      };
      expect(validProps.colorPalette).toBeDefined();
    });

    it('should allow optional size property', () => {
      const validProps: ConfettiPropTypes = {
        size: 2
      };
      expect(validProps.size).toBe(2);
    });

    it('should allow optional maxDurationTime property', () => {
      const validProps: ConfettiPropTypes = {
        maxDurationTime: 5
      };
      expect(validProps.maxDurationTime).toBe(5);
    });

    it('should allow maxDurationTime to be null', () => {
      const validProps: ConfettiPropTypes = {
        maxDurationTime: null
      };
      expect(validProps.maxDurationTime).toBeNull();
    });

    it('should allow optional particle amount properties', () => {
      const validProps: ConfettiPropTypes = {
        initParticleAmount: 100,
        maxParticleAmount: 500
      };
      expect(validProps.initParticleAmount).toBe(100);
      expect(validProps.maxParticleAmount).toBe(500);
    });

    it('should allow empty object as valid ConfettiPropTypes', () => {
      const validProps: ConfettiPropTypes = {};
      expect(typeof validProps).toBe('object');
    });
  });

  describe('ConfettiRef', () => {
    it('should define required methods', () => {
      // This is a type test - if it compiles, the type is correctly defined
      const mockRef: ConfettiRef = {
        pause: () => {},
        resume: () => {},
        restart: () => {},
        addParticles: (amount: number) => {}
      };

      expect(typeof mockRef.pause).toBe('function');
      expect(typeof mockRef.resume).toBe('function');
      expect(typeof mockRef.restart).toBe('function');
      expect(typeof mockRef.addParticles).toBe('function');
    });

    it('should have addParticles method that accepts number parameter', () => {
      const mockRef: ConfettiRef = {
        pause: () => {},
        resume: () => {},
        restart: () => {},
        addParticles: (amount: number) => {
          expect(typeof amount).toBe('number');
        }
      };

      mockRef.addParticles(10);
    });
  });
});
