const crypto = require('node:crypto');
if (typeof crypto.getRandomValues !== 'function' && crypto.webcrypto && typeof crypto.webcrypto.getRandomValues === 'function') {
  crypto.getRandomValues = crypto.webcrypto.getRandomValues.bind(crypto.webcrypto);
}

(async () => {
  const { build } = await import('vite');
  await build();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
