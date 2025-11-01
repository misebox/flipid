import { Buffer } from 'node:buffer';

/**
 * XORs the buffer using the entire rhv
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
  shuffleTable.reverse();
  for (const pairs of shuffleTable) {
    pairs.reverse();
    for (const [i, j] of pairs) {
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
