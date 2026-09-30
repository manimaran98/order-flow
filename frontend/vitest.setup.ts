import '@testing-library/jest-dom/vitest';

// Server-only modules are imported (never executed on a real server) by action and api tests.
vi.mock('server-only', () => ({}));

// jsdom gaps that Radix primitives touch.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= () => {};
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => {};
