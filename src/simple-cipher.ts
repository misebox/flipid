import { Buffer } from "node:buffer";

const xor = (buffer, key) => {
  let result = Buffer.alloc(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    result[i] = buffer[i] ^ key[i % key.length];
  }
  return result;
};

const createPrng = (seed) => {
  return function () {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };
};

const shuffle = (buffer, seed) => {
  let result = Buffer.from(buffer);
  let prng = createPrng(seed);

  for (let i = result.length - 1; i > 0; i--) {
    let j = Math.floor(prng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const unshuffle = (shuffled, seed) => {
  let result = Buffer.from(shuffled);
  let prng = createPrng(seed);
  let indices = [];

  for (let i = result.length - 1; i > 0; i--) {
    indices[i] = Math.floor(prng() * (i + 1));
  }

  for (let i = 1; i < result.length; i++) {
    let j = indices[i];
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export function encrypt(block, key, seed) {
  if (block.length !== 4 || key.length !== 4) {
    throw new Error("Block and key must be 4 bytes long.");
  }
  let xorWithKey = xor(block, key);
  let xorWithSeed = xor(xorWithKey, Buffer.from([seed, seed, seed, seed]));
  return shuffle(xorWithSeed, seed);
}

export function decrypt(encrypted, key) {
  const seed = encrypted[encrypted.length - 1];
  const block = encrypted.slice(0, encrypted.length - 1);
  let shuffledBack = unshuffle(block, seed); // Reverse shuffle
  let xorWithSeed = xor(shuffledBack, Buffer.from([seed, seed, seed, seed]));
  return xor(xorWithSeed, key);
}
