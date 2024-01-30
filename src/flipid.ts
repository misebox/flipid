import { Buffer } from 'node:buffer';
import { BufferTransformer } from './transformer.js';
import { BufferEncoder, Chars } from 'bufferbase';
import errors from './errors.js';

type FlipIDConstructorOptions = {
  key?: string;
  blockSize?: number;
  headerSize?: number;
  usePrefixSalt?: boolean;
  encoder?: BufferEncoder;
};

/**
 * Generates Flip IDs.
 */
export class FlipIDGenerator {
  key: string;
  blockSize: number;
  headerSize: number;
  usePrefixSalt: boolean;
  encoder: BufferEncoder;
  transformer: BufferTransformer;

  constructor(options: FlipIDConstructorOptions) {
    this.key = options.key || '';
    this.blockSize = options.blockSize || 0;
    this.headerSize = options.headerSize || 1;
    this.usePrefixSalt = options.usePrefixSalt || false;
    this.encoder = options.encoder || new BufferEncoder(Chars.Base32Crockford);
    this.transformer = new BufferTransformer(Buffer.from(this.key));
  }

  /**
   * Encodes the data into a Flip ID.
   */
  encode(data: number | bigint | Buffer, prefixSalt: string = ''): string {
    // Convert data to buffer
    if (data instanceof Buffer) {
      return this.encodeBuffer(data, prefixSalt);
    } else if (typeof data === 'number' || typeof data === 'bigint') {
      return this.encodeNumber(data, prefixSalt);
    } else {
      throw new errors.InvalidDataTypeError('Invalid data type');
    }
  }

  /**
   * Encodes the number into a Flip ID with a prefix salt.
   */
  encodeNumber(num: number | bigint, prefixSalt: string = ''): string {
    if (typeof num !== 'number' && typeof num !== 'bigint') {
      throw new errors.InvalidDataTypeError(`Invalid data type: ${typeof num}`);
    }
    let tmp = num.toString(16);
    tmp = tmp.length % 2 ? '0' + tmp : tmp;
    const tmpBuf = Buffer.from(tmp, 'hex');
    const block = Buffer.alloc(this.blockSize);
    tmpBuf.copy(block, this.blockSize - tmpBuf.length);
    return this.encodeBuffer(block, prefixSalt);
  }

  /**
   * Encodes the buffer into a Flip ID.
   */
  encodeBuffer(buffer: Buffer, prefixSalt: string = ''): string {
    const salt = this.usePrefixSalt ? prefixSalt : '';
    if (this.usePrefixSalt && prefixSalt === '') {
      throw new errors.PrefixSaltRequiredError(
        `usePrefixSalt is true but prefixSalt is empty`
      );
    } else if (!this.usePrefixSalt && prefixSalt !== '') {
      throw new errors.InvalidArgumentError(
        `usePrefixSalt is false but prefixSalt is not empty`
      );
    }
    if (this.blockSize && buffer.length > this.blockSize) {
      throw new errors.BlockTooLargeError(
        `buffer size (${buffer.length}) > block size (${this.blockSize})`
      );
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
    return this.usePrefixSalt ? prefixSalt + encoded : encoded;
  }

  /**
   * Decodes the encrypted string and returns the original data as a number.
   */
  decodeToNumber(encoded: string): number {
    const decryptedBlock = this.decodeToBuffer(encoded);
    const data = Buffer.alloc(this.blockSize);
    decryptedBlock.copy(data, this.blockSize - decryptedBlock.length);
    let num = 0;
    for (let i = 0; i < decryptedBlock.length; i++) {
      num = num * 256 + decryptedBlock[i];
    }
    return num;
  }

  /**
   * Decodes the encrypted string and returns the original data as a number.
   */
  decodeToBigInt(encoded: string): bigint {
    const decryptedBlock = this.decodeToBuffer(encoded);
    let num = 0n;
    for (let i = 0; i < decryptedBlock.length; i++) {
      num = num * 256n + BigInt(decryptedBlock[i]);
    }
    return num;
  }

  /**
   * Decodes the encrypted string and returns the original data.
   */
  decodeToBuffer(encoded: string): Buffer {
    const concatBuf = this.encoder.decode(
      encoded,
      this.headerSize + this.blockSize
    );

    const sumBuf = Buffer.alloc(this.headerSize);
    concatBuf.subarray(-this.headerSize).copy(sumBuf);
    const encryptedBlock = Buffer.alloc(this.blockSize);
    concatBuf
      .subarray(0, -this.headerSize)
      .copy(
        encryptedBlock,
        concatBuf.length - this.headerSize - this.blockSize
      );

    const decryptedBlock = this.transformer.decrypt(encryptedBlock, sumBuf);
    return decryptedBlock;
  }
}
