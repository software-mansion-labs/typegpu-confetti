import * as d from 'typegpu/data';
import {
  VertexOutput,
  ParticleGeometry,
  ParticleData,
  canvasAspectRatio,
  particles,
  maxDurationTime,
  initParticle,
  maxParticleAmount,
  deltaTime,
  time,
  gravity,
  gravityFn,
  initParticleFn,
  rotate,
} from '../schemas';

describe('schemas', () => {
  describe('data structures', () => {
    it('should define VertexOutput correctly', () => {
      expect(VertexOutput).toBeDefined();
      expect(VertexOutput.position).toBe(d.builtin.position);
      expect(VertexOutput.color).toBe(d.vec4f);
      expect(VertexOutput.isExpired).toBeDefined();
    });

    it('should define ParticleGeometry struct', () => {
      expect(ParticleGeometry).toBeDefined();
      expect(typeof ParticleGeometry).toBe('function');
    });

    it('should define ParticleData struct', () => {
      expect(ParticleData).toBeDefined();
      expect(typeof ParticleData).toBe('function');
    });
  });

  describe('slots and accessors', () => {
    it('should define canvasAspectRatio accessor', () => {
      expect(canvasAspectRatio).toBeDefined();
    });

    it('should define particles accessor', () => {
      expect(particles).toBeDefined();
    });

    it('should define slots', () => {
      expect(maxDurationTime).toBeDefined();
      expect(initParticle).toBeDefined();
      expect(maxParticleAmount).toBeDefined();
      expect(gravity).toBeDefined();
    });

    it('should define time-related accessors', () => {
      expect(deltaTime).toBeDefined();
      expect(time).toBeDefined();
    });
  });

  describe('functions', () => {
    it('should define gravityFn', () => {
      expect(gravityFn).toBeDefined();
      expect(typeof gravityFn).toBe('function');
    });

    it('should define initParticleFn', () => {
      expect(initParticleFn).toBeDefined();
      expect(typeof initParticleFn).toBe('function');
    });

    it('should define rotate function', () => {
      expect(rotate).toBeDefined();
      expect(typeof rotate).toBe('function');
    });
  });
});
