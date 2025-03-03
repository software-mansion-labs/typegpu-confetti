import tgpu from 'typegpu';
import * as d from 'typegpu/data';

import Confetti from './Confetti';
export { ConfettiPropTypes, ConfettiRef } from './Confetti';

export const gravityFn = tgpu['~unstable'].fn([d.vec2f], d.vec2f);

export {
  ConfettiProvider,
  useConfetti,
} from './ConfettiProvider';

export default Confetti;
