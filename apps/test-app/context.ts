import { createContext } from "react";
import { TgpuRoot } from "typegpu";

export const RootContext = createContext<TgpuRoot | null>(null);