import tgpu from 'typegpu';
import * as d from 'typegpu/data';

import Confetti from './Confetti';

export const gravityFn = tgpu['~unstable'].fn([d.vec2f], d.vec2f);

export default Confetti;
