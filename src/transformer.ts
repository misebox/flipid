import { Buffer } from 'node:buffer';

/**
 * Folds a key buffer to a target size by XORing overlapping chunks.
 *
 * Example: key="ABCDEFGH" (8 bytes), targetSize=3
 * Chunks: [A,B,C], [D,E,F], [G,H,0]
 * Result: [A^D^G, B^E^H, C^F^0]
 *
 * If key is shorter than targetSize, it is padded with zeros.
 * If key is exactly targetSize, it is returned as-is.
 */
export const foldKey = (key: Buffer, targetSize: number): Buffer => {
  if (key.length === targetSize) {
    return key;
  }
  const result = Buffer.alloc(targetSize);
  for (let i = 0; i < key.length; i++) {
    result[i % targetSize] ^= key[i];
  }
  return result;
};

/**
 * XORs lhv with rhv cyclically.
 *
 * Both buffers are cycled to cover max(lhv.length, rhv.length) iterations.
 * If rhv is longer than lhv, some bytes in lhv will be XORed multiple times.
 *
 * Example: lhv=[A,B], rhv=[1,2,3,4]
 * Result: [(A^1^3), (B^2^4)]
 *
 * This is intentional and reversible, but callers should ensure
 * lhv.length >= rhv.length for predictable single-pass XOR behavior.
 */
export const xorBuffer = (lhv: Buffer, rhv: Buffer) => {
  let result = Buffer.from(lhv);

  let i = 0;
  while (i < lhv.length || i < rhv.length) {
    const li = i % lhv.length;
    const ri = i % rhv.length;
    result[li] = result[li] ^ rhv[ri];
    i++;
  }

  return result;
};

/**
 * Creates a pseudo-random number generator based on the seed.
 */
const createPrng = (seedByte: number) => {
  return (): number => {
    let x = Math.sin(seedByte++) * 10000;
    return x - Math.floor(x);
  };
};

const generateShuffleTable = (
  blockSize: number,
  seed: Buffer
): [number, number][][] => {
  const table: [number, number][][] = [];
  for (const seedByte of seed) {
    const prng = createPrng(seedByte);
    const pairs: [number, number][] = [];

    for (let i = blockSize - 1; i > 0; i--) {
      pairs.push([i, Math.floor(prng() * (i + 1))]);
    }
    table.push(pairs);
  }
  return table;
};

export const shuffle = (block: Buffer, seed: Buffer) => {
  let result = Buffer.from(block);
  const shuffleTable = generateShuffleTable(block.length, seed);
  for (const pairs of shuffleTable) {
    for (const [i, j] of pairs) {
      [result[i], result[j]] = [result[j], result[i]];
    }
  }
  return result;
};

export const unshuffle = (block: Buffer, seed: Buffer) => {
  const result = Buffer.from(block);
  const shuffleTable = generateShuffleTable(block.length, seed);
  for (const pairs of [...shuffleTable].reverse()) {
    for (const [i, j] of [...pairs].reverse()) {
      [result[i], result[j]] = [result[j], result[i]];
    }
  }
  return result;
};

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
};

export class BufferTransformer {
  /**
   * Creates a new BufferTransformer.
   */
  constructor(private key: Buffer) {}

  /**
   * Encrypts the block using the key and initialized vector.
   */
  encrypt(block: Buffer, iv: Buffer = Buffer.alloc(0)) {
    const xorWithKey = xorBuffer(block, this.key);
    const xorWithIV = xorBuffer(xorWithKey, iv);
    const shuffled = shuffle(shuffle(xorWithIV, this.key), iv);
    return shuffled;
  }

  /**
   * Decrypts the encrypted buffer using the key and initialized vector.
   */
  decrypt(encrypted: Buffer, iv: Buffer = Buffer.alloc(0)) {
    const shuffledBack = unshuffle(unshuffle(encrypted, iv), this.key);
    const xorWithSeed = xorBuffer(shuffledBack, iv);
    return xorBuffer(xorWithSeed, this.key);
  }
}
