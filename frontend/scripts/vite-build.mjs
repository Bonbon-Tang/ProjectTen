import nodeCrypto from 'node:crypto';

if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== 'function') {
  globalThis.crypto = nodeCrypto.webcrypto;
}

const { build } = await import('vite');
await build();
