import { createContext } from 'react';
import type { TgpuRoot } from 'typegpu';

export const RootContext = createContext<TgpuRoot | null>(null);
