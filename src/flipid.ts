import { Buffer } from 'node:buffer';
import { encrypt, decrypt } from './simple-cipher.js';
import { BufferEncoder, Chars } from 'bufferbase';

// Error for when the data is not a number, a bigint or a buffer
class InvalidDataTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDataTypeError';
  }
}

// Error for when the block is larger than byteSize
class BlockTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlockTooLargeError';
  }
}

const alphaEncoder = new BufferEncoder(Chars.Base52);
/**
 * Generates Flip IDs.
 */
export class FlipIDGenerator {
  constructor(
    private key: string,
    private byteSize: number = 4,
    private encoder = new BufferEncoder(Chars.Base32Crockford),
    private headerSize = 1
  ) {}

  /**
   * Encodes the data into a Flip ID.
   */
  encode(data: number | bigint | Buffer): string {
    let buf: Buffer;
    // Convert data to buffer
    if (data instanceof Buffer) {
      buf = data;
    } else if (typeof data === 'number' || typeof data === 'bigint') {
      const hex = ('00'.repeat(this.byteSize) + data.toString(16)).slice(
        -this.byteSize * 2
      );
      buf = Buffer.from(hex, 'hex');
    } else {
      throw new InvalidDataTypeError('Invalid data type');
    }
    if (buf.length > this.byteSize) {
      throw new BlockTooLargeError('Block is too large');
    }
    // Pad the buffer with zeros
    const block = Buffer.alloc(this.byteSize);
    buf.copy(block, this.byteSize - buf.length);
    const key = Buffer.from(this.key);
    const sumVal = block.reduce(
      (prev, curr) => (prev + curr) % 256 ** this.headerSize,
      0
    );
    const newSeedHex = (
      '00'.repeat(this.headerSize) + sumVal.toString(16)
    ).slice(-this.headerSize * 2);
    const sumBuf = Buffer.from(newSeedHex, 'hex');
    const encrypted = encrypt(block, key, sumBuf);
    const encoded = this.encoder.encode(Buffer.concat([sumBuf, encrypted]));
    return encoded;
  }

  /**
   * Decodes the encrypted string and returns the original data.
   */
  decode(encoded: string): Buffer {
    const concatBuf = this.encoder.decode(encoded);

    const sumBuf = Buffer.alloc(this.headerSize);
    concatBuf.subarray(0, this.headerSize).copy(sumBuf);
    const encryptedBlock = Buffer.alloc(concatBuf.length - this.headerSize);
    concatBuf.subarray(this.headerSize).copy(encryptedBlock);

    const decryptedBlock = decrypt(
      encryptedBlock,
      Buffer.from(this.key, 'ascii'),
      sumBuf
    );
    return decryptedBlock;
  }
}
