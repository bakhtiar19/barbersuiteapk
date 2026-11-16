import '@testing-library/jest-dom/vitest';

// jsdom has no Canvas 2D implementation; stub it so receipt-image generation
// falls back to the DOM receipt preview quietly during tests.
if (typeof HTMLCanvasElement !== 'undefined') {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: () => null,
  });
}
