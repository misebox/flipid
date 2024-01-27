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
    // Convert data to buffer
    if (data instanceof Buffer) {
      return this.encodeBuffer(data, prefixSalt);
    } else if (typeof data === 'number' || typeof data === 'bigint') {
      return this.encodeNumber(data, prefixSalt);
    } else {
      throw new InvalidDataTypeError('Invalid data type');
    }
  }

  /**
   * Encodes the number into a Flip ID with a prefix salt.
   */
  encodeNumber(num: number | bigint, prefixSalt: string = ''): string {
    if (typeof num !== 'number' && typeof num !== 'bigint') {
      throw new InvalidDataTypeError(`Invalid data type: ${typeof num}`);
    }
    let tmp = num.toString(16);
    tmp = tmp.length % 2 ? '0' + tmp : tmp;
    const tmpBuf = Buffer.from(tmp, 'hex');
    const block = Buffer.alloc(this.blockSize);
    tmpBuf.copy(block, this.blockSize - tmpBuf.length);
    console.log(tmpBuf);
    return this.encodeBuffer(block, prefixSalt);
  }

  /**
   * Encodes the buffer into a Flip ID.
   */
  encodeBuffer(buffer: Buffer, prefixSalt: string = ''): string {
    const salt = this.usePrefixSalt ? prefixSalt : '';
    if (this.usePrefixSalt && prefixSalt === '') {
      throw new PrefixSaltRequiredError(
        `usePrefixSalt is true but prefixSalt is empty`
      );
    }
    if (this.blockSize && buffer.length > this.blockSize) {
      throw new BlockTooLargeError(
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
    console.log('encode', buffer, encrypted, iv);
    const encoded = this.encoder.encode(Buffer.concat([encrypted, iv]));
    return encoded;
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
    console.log('decode', decryptedBlock, encryptedBlock, sumBuf);
    return decryptedBlock;
  }
}
