import nodeCrypto from 'node:crypto';

const webcrypto = nodeCrypto.webcrypto;
const cryptoObj = webcrypto || nodeCrypto;
const getRandomValues = nodeCrypto.getRandomValues?.bind(nodeCrypto) || webcrypto?.getRandomValues?.bind(webcrypto);

if (typeof getRandomValues === 'function') {
  Object.defineProperty(cryptoObj, 'getRandomValues', {
    value: getRandomValues,
    configurable: true,
    enumerable: true,
    writable: true,
  });
}

Object.defineProperty(globalThis, 'crypto', {
  value: cryptoObj,
  configurable: true,
  enumerable: true,
  writable: true,
});

globalThis.getRandomValues = getRandomValues;

const { build } = await import('vite');
await build();
