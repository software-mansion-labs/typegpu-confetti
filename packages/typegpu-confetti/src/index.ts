import Confetti from './Confetti';
export { ConfettiPropTypes, ConfettiRef } from './Confetti';

export {
  // slots
  canvasAspectRatio,
  particles,
  maxDurationTime,
  initParticle,
  maxParticleAmount,
  deltaTime,
  time,
  gravity,
  // function shells
  gravityFn,
  initParticleFn,
} from './confetti-schemas';

export {
  ConfettiProvider,
  useConfetti,
} from './ConfettiProvider';

export default Confetti;
