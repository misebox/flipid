import { Buffer } from 'node:buffer';
import { encrypt, decrypt } from './simple-cipher.js';
import { FlipIDGenerator } from './flipid.js';

// Example usage
{
  const key = 'CRID';

  console.log('FlipIDGenerator');
  const generator = new FlipIDGenerator(key, 4);
  const result = [];
  for (let value of [1, 2, 3, 10, 11, 100, 101, 1000, 123456, 123456789]) {
    const encoded = generator.encode(value);
    const decoded = generator.decode(encoded);
    const decodedValue = decoded.reduce((p, c) => p * 256 + c, 0);
    result.push({ value, encoded, decodedValue });
  }
  console.table(result);
}

{
  console.log('simple-cipher');
  const keyBuf = Buffer.from('CRID');
  console.log('Key:', keyBuf.toString('hex'));

  let seed = 'x'.charCodeAt(0);

  const result = [];
  for (let v of [1, 2, 3, 10, 11, 100, 101, 1000, 123456, 123456789]) {
    let hex = ('00000000' + v.toString(16)).slice(-8);
    const block = Buffer.from(hex, 'hex');
    const seedBuf = Buffer.from([seed]);
    const encrypted = encrypt(block, keyBuf, seedBuf);
    const decrypted = decrypt(encrypted, keyBuf, seedBuf);

    result.push({
      block: block.toString('hex'),
      encrypted: encrypted.toString('hex'),
      decrypted: decrypted.toString('hex'),
    });
    seed++;
  }
  console.table(result);
}
