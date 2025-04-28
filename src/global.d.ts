// filepath: d:\AskAI\AskAI\src\global.d.ts
export {};

declare global {
  interface Window {
    MathJax: {
      typesetPromise: () => Promise<void>;
    };
  }
}