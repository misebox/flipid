import { describe, expect, test } from 'vitest';
import {
  BufferTransformer,
  xorBuffer,
  shuffle,
  unshuffle,
} from './transformer.js';

test('a shuffled buffer should be changed from original buffer', () => {
  const original = Buffer.from('hello');
  const seed = Buffer.from('xx');
  const shuffled = shuffle(original, seed);
  expect(shuffled).not.toEqual(original);
});
test('a shuffled buffer can be restored by unshuffle', () => {
  const original = Buffer.from('hello');
  const seed = Buffer.from('xx');
  const shuffled = shuffle(original, seed);
  const unshuffled = unshuffle(shuffled, seed);
  expect(unshuffled).toEqual(original);
});
test('shuffle works correctly if long seed is used', () => {
  const original = Buffer.from('hello');
  const seed = Buffer.from('longeeeeeeeeeeer seed');
  const shuffled = shuffle(original, seed);
  const unshuffled = unshuffle(shuffled, seed);
  expect(unshuffled).toEqual(original);
});
test('a buffer that was shuffled 2 times can be restored by unshuffling 2 times', () => {
  const key = 'hello';
  const original = Buffer.from(key);
  const seed = Buffer.from('ab');
  const shuffled = shuffle(shuffle(original, seed), Buffer.from(key));
  const unshuffled = unshuffle(unshuffle(shuffled, Buffer.from(key)), seed);
  expect(unshuffled).toEqual(original);
});
test('xorBuffer changes buffer and restore it by applying two times', () => {
  const original = Buffer.from('hello');
  const key = Buffer.from('world');
  const afterXor = xorBuffer(original, key);
  expect(afterXor).not.toEqual(original);
  const restored = xorBuffer(afterXor, key);
  expect(restored).toEqual(original);
});
test('xorBuffer works correctly if long key is used', () => {
  const original = Buffer.from('hello');
  const key = Buffer.from('longeeeeeeeeeeeeeeer key');
  const afterXor = xorBuffer(original, key);
  expect(afterXor).not.toEqual(original);
  const restored = xorBuffer(afterXor, key);
  expect(restored).toEqual(original);
});

describe('encrypt', () => {
  test('should return the result that can be decrypt to same buffer', () => {
    const original = Buffer.from('hello');
    const key = Buffer.from('secret');
    const iv = Buffer.from('xyz');
    const transformer = new BufferTransformer(key);
    const encrypted = transformer.encrypt(original, iv);
    const decrypted = transformer.decrypt(encrypted, iv);

    expect(encrypted).not.toEqual(original);
    expect(original).toEqual(decrypted);
  });
});

describe('BufferTransformer', () => {
  test('encrypt should return the result that can be decrypt to same buffer', () => {
    const original = Buffer.from('hello');
    const key = Buffer.from('secret');
    const iv = Buffer.from('xyz');
    const transformer = new BufferTransformer(key);
    const encrypted = transformer.encrypt(original, iv);
    const decrypted = transformer.decrypt(encrypted, iv);

    expect(encrypted).not.toEqual(original);
    expect(original).toEqual(decrypted);
  });
});
