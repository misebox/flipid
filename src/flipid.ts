import { Buffer } from 'node:buffer';
import { BufferTransformer } from './transformer.js';
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

// Error for when prefix salt is required
class PrefixSaltRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PrefixSaltRequiredError';
  }
}

/**
 * Generates Flip IDs.
 */
export class FlipIDGenerator {
  transformer: BufferTransformer;
  constructor(
    key: string = '',
    private blockSize: number,
    private headerSize = 1,
    private usePrefixSalt: boolean = false,
    private encoder = new BufferEncoder(Chars.Base32Crockford)
  ) {
    this.transformer = new BufferTransformer(Buffer.from(key));
  }

  /**
   * Encodes the data into a Flip ID.
   */
  encode(data: number | bigint | Buffer, prefixSalt: string = ''): string {
    let result: string;
    // Convert data to buffer
    if (data instanceof Buffer) {
      result = this.encodeBuffer(data, prefixSalt);
    } else if (typeof data === 'number' || typeof data === 'bigint') {
      result = this.encodeNumber(data, prefixSalt);
    } else {
      throw new InvalidDataTypeError('Invalid data type');
    }
    return result;
  }
  /**
   * Encodes the buffer into a Flip ID.
   */
  encodeBuffer(buffer: Buffer, prefixSalt: string = ''): string {
    const salt = this.usePrefixSalt ? prefixSalt : '';
    if (this.usePrefixSalt && prefixSalt === '') {
      throw new Error('Prefix salt is required');
    }
    if (this.blockSize && buffer.length > this.blockSize) {
      throw new BlockTooLargeError('Block is too large');
    }
    // Pad the buffer with zeros
    let block: Buffer;
    if (this.blockSize) {
      block = Buffer.alloc(this.blockSize);
      buffer.copy(block, this.blockSize - buffer.length);
    } else {
      block = buffer;
    }
    const sumVal = block.reduce(
      (prev, curr) => (prev + curr) % 256 ** this.headerSize,
      0
    );
    const newSeedHex = (
      '00'.repeat(this.headerSize) + sumVal.toString(16)
    ).slice(-this.headerSize * 2);
    const iv = Buffer.concat([
      Buffer.from(salt),
      Buffer.from(newSeedHex, 'hex'),
    ]);
    const encrypted = this.transformer.encrypt(block, iv);
    const encoded = this.encoder.encode(Buffer.concat([encrypted, iv]));
    return encoded;
  }

  /**
   * Encodes the number into a Flip ID with a prefix salt.
   */
  encodeNumber(num: number | bigint, prefixSalt: string = ''): string {
    if (typeof num !== 'number' && typeof num !== 'bigint') {
      throw new InvalidDataTypeError('Invalid data type');
    }
    let tmp = num.toString(16);
    tmp = tmp.length % 2 ? '0' + tmp : tmp;
    const data = Buffer.from(tmp, 'hex');
    return this.encode(data, prefixSalt);
  }

  /**
   * Decodes the encrypted string and returns the original data.
   */
  decodeToBuffer(encoded: string): Buffer {
    const concatBuf = this.encoder.decode(
      encoded,
      this.blockSize ? this.headerSize + this.blockSize : undefined
    );

    const sumBuf = Buffer.alloc(this.headerSize);
    concatBuf.subarray(-this.headerSize).copy(sumBuf);
    const encryptedBlock = Buffer.alloc(concatBuf.length - this.headerSize);
    concatBuf.subarray(0, -this.headerSize).copy(encryptedBlock);

    const decryptedBlock = this.transformer.decrypt(encryptedBlock, sumBuf);
    return decryptedBlock;
  }

  /**
   * Decodes the encrypted string and returns the original data as a number.
   */
  decodeToNumber(encoded: string): number {
    const decryptedBlock = this.decodeToBuffer(encoded);
    let num = 0;
    for (let i = decryptedBlock.length - 1; i >= 0; i) {
      num += decryptedBlock[i] * 256 ** i;
    }
    return num;
  }
}
