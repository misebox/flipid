import { expect, test } from 'vitest';
import { shuffle, unshuffle } from './simple-cipher.js';
import { xorBuffer } from './simple-cipher';

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

test('encode', () => {
  expect(true).toEqual(true);
});
