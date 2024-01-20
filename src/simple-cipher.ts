import { Buffer } from "node:buffer";


/**
 * XORs the buffer using the entire rhv
*/
const xorBuffer = (lhv: Buffer, rhv: Buffer) => {
  let result = Buffer.from(lhv);

  for (let i = 0; i < rhv.length; i += lhv.length) {
    const part = rhv.subarray(i, i + lhv.length)
    for (let i = 0; i < result.length && i < part.length; i++) {
      result[i] = result[i] ^ part[i];
    }
  }

  return result;
};


const createPrng = (seed: number) => {
  return function () {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };
};

const shuffle = (buffer: Buffer, seed: Buffer) => {
  let result = Buffer.from(buffer);
  for (const seedByte of seed) {
    let prng = createPrng(seedByte);

    for (let i = result.length - 1; i > 0; i--) {
      let j = Math.floor(prng() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
  }
  return result;
};

const unshuffle = (block: Buffer, seed: Buffer) => {
  let result = Buffer.from(block);
  for (const seedByte of seed.reverse()) {
    let prng = createPrng(seedByte);
    let indices = [];

    for (let i = result.length - 1; i > 0; i--) {
      indices[i] = Math.floor(prng() * (i + 1));
    }

    for (let i = 1; i < result.length; i++) {
      let j = indices[i];
      [result[i], result[j]] = [result[j], result[i]];
    }
  }
  return result;
};

/**
 * Encrypts the block using the key and seed.
 */
export const encrypt = (block: Buffer, key: Buffer, seed: Buffer) => {
  if (block.length !== 4 || key.length !== 4) {
    throw new Error("Block and key must be 4 bytes long.");
  }
  let xorWithKey = xorBuffer(block, key);
  let xorWithSeed = xorBuffer(xorWithKey, seed);
  return shuffle(xorWithSeed, seed);
}

/**
 * Decrypts the encrypted buffer using the key and seed.
 */
export const decrypt = (encrypted: Buffer, key: Buffer, seed: Buffer) => {
  const block = Buffer.alloc(encrypted.length);
  encrypted.subarray(0, encrypted.length - 1).copy(block);
  let shuffledBack = unshuffle(block, seed);
  let xorWithSeed = xorBuffer(shuffledBack, seed);
  return xorBuffer(xorWithSeed, key);
}

/**
 * Calculates the number of digits required to represent buffer in a given base.
 */
export const calcBaseNDigits = (byteCount: number, baseN: number) => {
  const base = BigInt(baseN);
  let digits = 0;
  let value = BigInt(256) ** BigInt(byteCount) - 1n;
  while (value > 0) {
    digits++;
    value /= base;
  }
  return digits;
}
