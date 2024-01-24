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

/**
 * Generates Flip IDs.
 */
export class FlipIDGenerator {
  constructor(
    private key: string = '',
    private blockSize: number,
    private headerSize = 1,
    private encoder = new BufferEncoder(Chars.Base32Crockford)
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
      let tmp = data.toString(16);
      tmp = tmp.length % 2 ? '0' + tmp : tmp;
      buf = Buffer.from(tmp, 'hex');
    } else {
      throw new InvalidDataTypeError('Invalid data type');
    }
    if (this.blockSize && buf.length > this.blockSize) {
      throw new BlockTooLargeError('Block is too large');
    }
    // Pad the buffer with zeros
    let block: Buffer;
    if (this.blockSize) {
      block = Buffer.alloc(this.blockSize);
      buf.copy(block, this.blockSize - buf.length);
    } else {
      block = buf;
    }
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
    const encoded = this.encoder.encode(Buffer.concat([encrypted, sumBuf]));
    return encoded;
  }

  /**
   * Decodes the encrypted string and returns the original data.
   */
  decode(encoded: string): Buffer {
    const concatBuf = this.encoder.decode(
      encoded,
      this.blockSize ? this.headerSize + this.blockSize : undefined
    );

    const sumBuf = Buffer.alloc(this.headerSize);
    concatBuf.subarray(-this.headerSize).copy(sumBuf);
    const encryptedBlock = Buffer.alloc(concatBuf.length - this.headerSize);
    concatBuf.subarray(0, -this.headerSize).copy(encryptedBlock);

    const decryptedBlock = decrypt(
      encryptedBlock,
      Buffer.from(this.key, 'ascii'),
      sumBuf
    );
    return decryptedBlock;
  }

  /**
   * Decodes the encrypted string and returns the original data as a number.
   */
  decodeToNumber(encoded: string): number {
    const decryptedBlock = this.decode(encoded);
    let num = 0;
    for (let i = decryptedBlock.length - 1; i >= 0; i) {
      num += decryptedBlock[i] * 256 ** i;
    }
    return num;
  }
}
