import nodeCrypto from 'node:crypto';

const cryptoObj = nodeCrypto.webcrypto || nodeCrypto;
if (typeof cryptoObj.getRandomValues !== 'function' && typeof nodeCrypto.getRandomValues === 'function') {
  cryptoObj.getRandomValues = nodeCrypto.getRandomValues.bind(nodeCrypto);
}

Object.defineProperty(globalThis, 'crypto', {
  value: cryptoObj,
  configurable: true,
  enumerable: true,
  writable: true,
});
