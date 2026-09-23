import { TextDecoder, TextEncoder } from "bare-encoding";

// eslint-disable-next-line
declare var global: Record<string, any>;

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
