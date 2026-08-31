/**
 * Keyed, reversible scrambling of a fixed-size byte block.
 *
 * The block keeps its size: no header, no padding, no expansion. Every pass
 * chains each byte into its neighbour, so one round in each direction spreads a
 * single input bit across the whole block, and three rounds leave no visible
 * relation between consecutive inputs.
 *
 * Only 32-bit integer arithmetic is used, so the result is identical on every
 * JavaScript engine and the scheme can be reimplemented in another language.
 */

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/** Number of forward/backward round pairs. */
const ROUNDS = 3;

/** FNV-1a over a byte sequence. */
export const hashBytes = (bytes: Uint8Array, offset: number = FNV_OFFSET): number => {
  let h = offset >>> 0;
  for (const byte of bytes) {
    h = Math.imul(h ^ byte, FNV_PRIME) >>> 0;
  }
  return h >>> 0;
};

/** FNV-1a over the UTF-8 bytes of a string. */
export const hashText = (text: string, offset: number = FNV_OFFSET): number => {
  return hashBytes(new TextEncoder().encode(text), offset);
};

/** The splitmix32 finalizer: spreads every input bit over all 32 output bits. */
const mix = (x: number): number => {
  let h = x >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x21f0aaad) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x735a2d97) >>> 0;
  return (h ^ (h >>> 15)) >>> 0;
};

/** The key material a block is scrambled with. */
export type Seed = {
  readonly a: number;
  readonly b: number;
};

/**
 * Derives the seed from the key and the block layout, so that the same key
 * used at two different widths scrambles unrelated ways.
 */
export const deriveSeed = (key: string, blockSize: number): Seed => {
  const a = mix(hashText(key) ^ mix(blockSize));
  const b = mix(hashText(key, 0x9e3779b9) ^ mix(blockSize + 0x5bf03635));
  return { a, b };
};

/** The byte mixed into position `index` given its neighbour's current value. */
const roundByte = (seed: number, round: number, index: number, neighbour: number): number => {
  const tag = Math.imul(round + 1, 0x9e3779b9) ^ Math.imul(index + 1, 0x85ebca6b) ^ neighbour;
  return mix(seed ^ mix(tag)) & 0xff;
};

/** The value standing in for the neighbour the first byte of a pass does not have. */
const edgeByte = (seed: number, round: number, tag: number): number => {
  return mix(seed ^ mix(Math.imul(round + 1, tag))) & 0xff;
};

const HEAD_TAG = 0x27d4eb2f;
const TAIL_TAG = 0x165667b1;

/** Adds a byte derived from the previous position, walking forwards. */
const addForward = (block: Uint8Array, seed: Seed, round: number): void => {
  let previous = edgeByte(seed.b, round, HEAD_TAG);
  for (let i = 0; i < block.length; i++) {
    block[i] = (block[i] + roundByte(seed.a, round, i, previous)) & 0xff;
    previous = block[i];
  }
};

const subtractForward = (block: Uint8Array, seed: Seed, round: number): void => {
  const head = edgeByte(seed.b, round, HEAD_TAG);
  for (let i = block.length - 1; i >= 0; i--) {
    const previous = i === 0 ? head : block[i - 1];
    block[i] = (block[i] - roundByte(seed.a, round, i, previous)) & 0xff;
  }
};

/** XORs a byte derived from the next position, walking backwards. */
const xorBackward = (block: Uint8Array, seed: Seed, round: number): void => {
  let next = edgeByte(seed.a, round, TAIL_TAG);
  for (let i = block.length - 1; i >= 0; i--) {
    block[i] = block[i] ^ roundByte(seed.b, round, i, next);
    next = block[i];
  }
};

const unxorBackward = (block: Uint8Array, seed: Seed, round: number): void => {
  const tail = edgeByte(seed.a, round, TAIL_TAG);
  for (let i = 0; i < block.length; i++) {
    const next = i === block.length - 1 ? tail : block[i + 1];
    block[i] = block[i] ^ roundByte(seed.b, round, i, next);
  }
};

/** Scrambles a block. The result is the same size as the input. */
export const scramble = (block: Uint8Array, seed: Seed): Uint8Array => {
  const out = Uint8Array.from(block);
  for (let round = 0; round < ROUNDS; round++) {
    addForward(out, seed, round);
    xorBackward(out, seed, round);
  }
  return out;
};

/** Reverses `scramble`. */
export const unscramble = (block: Uint8Array, seed: Seed): Uint8Array => {
  const out = Uint8Array.from(block);
  for (let round = ROUNDS - 1; round >= 0; round--) {
    unxorBackward(out, seed, round);
    subtractForward(out, seed, round);
  }
  return out;
};
