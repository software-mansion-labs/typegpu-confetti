import tgpu from 'typegpu';
import * as d from 'typegpu/data';

import Confetti from './Confetti';
export { ConfettiPropTypes } from './Confetti';

export const gravityFn = tgpu['~unstable'].fn([d.vec2f], d.vec2f);

export { ConfettiOverlay, useConfetti } from './ConfettiOverlay';

export default Confetti;
