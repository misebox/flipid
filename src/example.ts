import { Buffer } from 'node:buffer';
import { BufferTransformer } from './transformer.js';
import { FlipIDGenerator } from './flipid.js';

// Example usage
export const exampleFlipIDGenerator = () => {
  const key = 'secret';

  console.log('FlipIDGenerator');
  const generator = new FlipIDGenerator({
    key,
    blockSize: 0,
    usePrefixSalt: true,
    checkSum: true,
  });
  const result = [];
  for (let value of [
    1, 2, 3, 10, 11, 100, 101, 1000, 123456, 123456789, 4294967295,
  ]) {
    // for (let value = 0; value < 20; value++) {
    const encoded = generator.encodeNumber(value, 'p');
    const decoded = generator.decodeToNumber(encoded);
    result.push({ value, encoded, decoded });
  }
  return result;
};

export const exampleSimpleCipher = () => {
  console.log('simple-cipher');
  const keyBuf = Buffer.from('CRID');
  console.log('Key:', keyBuf.toString('hex'));

  let seed = 'x'.charCodeAt(0);
  const transformer = new BufferTransformer(keyBuf);
  const result = [];
  for (let v of [1, 2, 3, 10, 11, 100, 101, 1000, 123456, 123456789]) {
    let hex = ('00000000' + v.toString(16)).slice(-8);
    const block = Buffer.from(hex, 'hex');
    const seedBuf = Buffer.from([seed]);
    const encrypted = transformer.encrypt(block, seedBuf);
    const decrypted = transformer.decrypt(encrypted, seedBuf);

    result.push({
      block: block.toString('hex'),
      encrypted: encrypted.toString('hex'),
      decrypted: decrypted.toString('hex'),
    });
    seed++;
  }
  return result;
};
export const runExamples = () => {
  {
    const result = exampleFlipIDGenerator();
    console.table(result);
    console.log('main module');
  }
  {
    const result = exampleSimpleCipher();
    console.table(result);
    console.log('');
  }
};
