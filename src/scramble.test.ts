import { describe, expect, it } from "vitest";
import { deriveSeed, scramble, unscramble } from "./scramble.js";

const seed = deriveSeed("test-key", 5);

const randomBlock = (size: number): Uint8Array => {
  const block = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    block[i] = Math.floor(Math.random() * 256);
  }
  return block;
};

describe("scramble", () => {
  it("keeps the block size", () => {
    for (const size of [1, 2, 5, 9, 17, 64]) {
      expect(scramble(new Uint8Array(size), deriveSeed("k", size))).toHaveLength(size);
    }
  });

  it("round-trips every block size", () => {
    for (const size of [1, 2, 3, 5, 8, 9, 16, 33]) {
      const s = deriveSeed("test-key", size);
      for (let i = 0; i < 200; i++) {
        const block = randomBlock(size);
        expect(unscramble(scramble(block, s), s)).toEqual(block);
      }
    }
  });

  it("does not modify its input", () => {
    const block = randomBlock(5);
    const copy = Uint8Array.from(block);
    scramble(block, seed);
    unscramble(block, seed);
    expect(block).toEqual(copy);
  });

  it("spreads a one-byte change over the whole block", () => {
    const a = scramble(new Uint8Array([1, 0, 0, 0, 0]), seed);
    const b = scramble(new Uint8Array([2, 0, 0, 0, 0]), seed);
    const same = a.filter((byte, i) => {
      return byte === b[i];
    });
    expect(same.length).toBeLessThanOrEqual(1);
  });

  it("gives unrelated results for different keys", () => {
    const block = new Uint8Array([1, 2, 3, 4, 5]);
    expect(scramble(block, deriveSeed("key-a", 5))).not.toEqual(
      scramble(block, deriveSeed("key-b", 5)),
    );
  });

  it("gives unrelated results for the same key at different widths", () => {
    const block = new Uint8Array([0, 0, 0, 0, 1]);
    expect(scramble(block, deriveSeed("k", 5))).not.toEqual(scramble(block, deriveSeed("k", 6)));
  });
});
