import { Buffer } from 'node:buffer';
import { BufferTransformer } from './transformer.js';
import { BufferEncoder, Chars } from 'bufferbase';
import errors from './errors.js';

type FlipIDGeneratorOptions = {
  key: string;
  blockSize?: number;
  headerSize?: number;
  checkSum?: boolean;
  usePrefixSalt?: boolean;
  encoder?: BufferEncoder;
};

/**
 * Generates Flip IDs.
 */
export class FlipIDGenerator {
  transformer: BufferTransformer;
  // options
  key: string;
  blockSize: number;
  headerSize: number;
  checkSum: boolean;
  usePrefixSalt: boolean;
  encoder: BufferEncoder;

  constructor({
    key,
    blockSize = 0,
    headerSize = 1,
    checkSum = false,
    usePrefixSalt = false,
    encoder = new BufferEncoder(Chars.Base32Crockford),
  }: FlipIDGeneratorOptions) {
    this.key = key;
    this.blockSize = blockSize;
    this.headerSize = headerSize;
    this.checkSum = checkSum;
    this.usePrefixSalt = usePrefixSalt;
    this.encoder = encoder;
    this.transformer = new BufferTransformer(Buffer.from(this.key));
  }

  /**
   * Encodes the data into a Flip ID.
   */
  encode(
    data: number | bigint | string | Buffer,
    prefixSalt: string = ''
  ): string {
    // Convert data to buffer
    if (data instanceof Buffer) {
      return this.encodeBuffer(data, prefixSalt);
    } else if (typeof data === 'string') {
      return this.encodeString(data, prefixSalt);
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
    let block: Buffer;
    if (this.blockSize > 0) {
      block = Buffer.alloc(this.blockSize);
      tmpBuf.copy(block, this.blockSize - tmpBuf.length);
    } else {
      block = tmpBuf;
    }
    return this.encodeBuffer(block, prefixSalt);
  }

  /**
   * Encodes the string into a Flip ID with a prefix salt.
   */
  encodeString(str: string | bigint, prefixSalt: string = ''): string {
    if (typeof str !== 'string') {
      throw new errors.InvalidDataTypeError(`Invalid data type: ${typeof str}`);
    }
    const tmpBuf = Buffer.from(str, 'utf8');
    let block: Buffer;
    if (this.blockSize > 0) {
      block = Buffer.alloc(this.blockSize);
      if (tmpBuf.length > this.blockSize) {
        throw new errors.BlockTooLargeError(
          `buffer size (${tmpBuf.length}) > block size (${this.blockSize})`
        );
      }
      // align right
      tmpBuf.copy(block, block.length - tmpBuf.length);
    } else {
      block = tmpBuf;
    }
    return this.encodeBuffer(block, prefixSalt);
  }

  /**
   * Encodes the buffer into a Flip ID.
   */
  encodeBuffer(buffer: Buffer, prefixSalt: string = ''): string {
    const salt = this.usePrefixSalt ? prefixSalt : '';
    if (this.usePrefixSalt && prefixSalt.length !== 1) {
      throw new errors.InvalidArgumentError(
        `usePrefixSalt is true but prefixSalt is not a single character`
      );
    } else if (!this.usePrefixSalt && prefixSalt !== '') {
      throw new errors.InvalidArgumentError(
        `usePrefixSalt is false but prefixSalt is not empty`
      );
    }
    if (this.blockSize > 0 && buffer.length > this.blockSize) {
      throw new errors.BlockTooLargeError(
        `buffer size (${buffer.length}) > block size (${this.blockSize})`
      );
    }
    // Pad the buffer with zeros
    let block: Buffer;
    if (this.blockSize > 0) {
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
    const encrypted = this.transformer.encrypt(
      Buffer.concat([this.transformer.encrypt(block, iv), iv])
    );
    const checkSumBuf = this.checkSum
      ? Buffer.from([encrypted.reduce((prev, curr) => prev + curr) % 256])
      : Buffer.alloc(0);
    const encoded = this.encoder.encode(
      Buffer.concat([encrypted, checkSumBuf])
    );
    return this.usePrefixSalt ? salt + encoded : encoded;
  }

  /**
   * Decodes the encrypted string and returns the original data as a number.
   */
  decodeToNumber(encoded: string): number {
    const decryptedBlock = this.decodeToBuffer(encoded);
    let num = 0;

    let data: Buffer;
    if (this.blockSize > 0) {
      data = Buffer.alloc(this.blockSize);
      decryptedBlock.copy(data, this.blockSize - decryptedBlock.length);
    } else {
      data = decryptedBlock;
    }
    for (let i = 0; i < data.length; i++) {
      num = num * 256 + data[i];
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
   * Decodes the encrypted string and returns the original data as a string.
   */
  decodeToString(encoded: string): string {
    const decryptedBlock = this.decodeToBuffer(encoded);
    const plaintext = decryptedBlock.toString('utf8');
    return plaintext;
  }

  /**
   * Decodes the encrypted string and returns the original data.
   */
  decodeToBuffer(encoded: string): Buffer {
    let saltSize = 0;
    let saltBuffer = Buffer.alloc(0);
    if (this.usePrefixSalt) {
      saltBuffer = Buffer.from(encoded[0]);
      saltSize = 1;
      encoded = encoded.slice(1);
    }
    const checkSumSize = this.checkSum ? 1 : 0;
    const decodedBuf = this.encoder.decode(
      encoded,
      this.blockSize > 0
        ? saltSize + this.headerSize + this.blockSize + checkSumSize
        : undefined
    );

    if (this.checkSum) {
      const checkSumByte = decodedBuf.subarray(-1)[0];
      const checkSum =
        decodedBuf.subarray(0, -1).reduce((prev, curr) => prev + curr, 0) % 256;
      if (checkSum !== checkSumByte) {
        throw new errors.CheckSumError('Checksum mismatch');
      }
    }
    const encryptedBuf = decodedBuf.subarray(0, this.checkSum ? -1 : undefined);

    const concatBuf = this.transformer.decrypt(encryptedBuf);
    const blockSize =
      this.blockSize > 0
        ? this.blockSize
        : concatBuf.length - saltSize - this.headerSize;

    const iv = Buffer.alloc(saltSize + this.headerSize);
    concatBuf.subarray(blockSize).copy(iv);
    const encryptedBlock = Buffer.alloc(blockSize);
    concatBuf.subarray(0, blockSize).copy(encryptedBlock);

    const decryptedBlock = this.transformer.decrypt(encryptedBlock, iv);
    return decryptedBlock;
  }
}
