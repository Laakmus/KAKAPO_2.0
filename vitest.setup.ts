import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

// Radix UI (Select) uses Pointer Capture APIs which are missing in JSDOM
// (https://github.com/jsdom/jsdom/issues/3168). We polyfill minimal surface.
const elementProto = HTMLElement.prototype as unknown as {
  hasPointerCapture?: (pointerId: number) => boolean;
  setPointerCapture?: (pointerId: number) => void;
  releasePointerCapture?: (pointerId: number) => void;
};

elementProto.hasPointerCapture ??= () => false;
elementProto.setPointerCapture ??= () => {};
elementProto.releasePointerCapture ??= () => {};

// JSDOM doesn't implement scrollIntoView; Radix Select calls it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Element.prototype as any).scrollIntoView ??= () => {};

afterEach(() => {
  cleanup();
});
