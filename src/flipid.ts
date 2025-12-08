import { Buffer } from 'node:buffer';
import { BufferTransformer } from './transformer.js';
import { Codec, Codecs, type ICodec } from 'bufferbase';
import errors from './errors.js';

/**
 * Options for FlipIDGenerator constructor.
 */
export type FlipIDGeneratorOptions = {
  /** Secret key for encryption/decryption */
  key: string;
  /** Fixed block size in bytes. 0 = variable length (default: 0) */
  blockSize?: number;
  /** Header size for checksum calculation in bytes (default: 1) */
  headerSize?: number;
  /** Enable checksum validation on decode (default: false) */
  checkSum?: boolean;
  /** Add single-char prefix salt to output (default: false) */
  usePrefixSalt?: boolean;
  /** Custom encoder from bufferbase (default: Base32Crockford) */
  encoder?: ICodec;
};

/**
 * Reversible ID transformation generator.
 * Encodes numbers, strings, and buffers into obfuscated string identifiers.
 *
 * @example
 * ```typescript
 * const g = new FlipIDGenerator({ key: 'secret', blockSize: 8 });
 * const encoded = g.encodeNumber(123456);
 * const decoded = g.decodeToNumber(encoded); // 123456
 * ```
 */
export class FlipIDGenerator {
  transformer: BufferTransformer;
  // options
  key: string;
  blockSize: number;
  headerSize: number;
  checkSum: boolean;
  usePrefixSalt: boolean;
  encoder: ICodec;

  constructor({
    key,
    blockSize = 0,
    headerSize = 1,
    checkSum = false,
    usePrefixSalt = false,
    encoder = Codecs.base32crockford,
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
   * Pads buffer to blockSize with leading zeros (right-aligned).
   * If blockSize is 0, returns the original buffer.
   * @throws BlockTooLargeError if buffer exceeds blockSize
   */
  private padBuffer(buffer: Buffer): Buffer {
    if (this.blockSize === 0) {
      return buffer;
    }
    if (buffer.length > this.blockSize) {
      throw new errors.BlockTooLargeError(
        `buffer size (${buffer.length}) > block size (${this.blockSize})`
      );
    }
    const block = Buffer.alloc(this.blockSize);
    buffer.copy(block, this.blockSize - buffer.length);
    return block;
  }

  /**
   * Encodes data into a Flip ID (polymorphic).
   * @param data - Data to encode (number, bigint, string, or Buffer)
   * @param prefixSalt - Single character prefix salt (required if usePrefixSalt is true)
   * @returns Encoded string
   * @throws InvalidDataTypeError if data type is not supported
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
   * Encodes a number into a Flip ID.
   * @param num - Number or bigint to encode
   * @param prefixSalt - Single character prefix salt (required if usePrefixSalt is true)
   * @returns Encoded string
   * @throws InvalidDataTypeError if num is not a number or bigint
   * @throws BlockTooLargeError if encoded value exceeds blockSize
   */
  encodeNumber(num: number | bigint, prefixSalt: string = ''): string {
    if (typeof num !== 'number' && typeof num !== 'bigint') {
      throw new errors.InvalidDataTypeError(`Invalid data type: ${typeof num}`);
    }
    let tmp = num.toString(16);
    tmp = tmp.length % 2 ? '0' + tmp : tmp;
    const tmpBuf = Buffer.from(tmp, 'hex');
    const block = this.padBuffer(tmpBuf);
    return this.encodeBuffer(block, prefixSalt);
  }

  /**
   * Encodes a bigint into a Flip ID.
   * Use this method for numbers larger than Number.MAX_SAFE_INTEGER.
   * @param num - Bigint to encode
   * @param prefixSalt - Single character prefix salt (required if usePrefixSalt is true)
   * @returns Encoded string
   * @throws InvalidDataTypeError if num is not a bigint
   * @throws BlockTooLargeError if encoded value exceeds blockSize
   */
  encodeBigInt(num: bigint, prefixSalt: string = ''): string {
    if (typeof num !== 'bigint') {
      throw new errors.InvalidDataTypeError(`Invalid data type: ${typeof num}`);
    }
    let tmp = num.toString(16);
    tmp = tmp.length % 2 ? '0' + tmp : tmp;
    const tmpBuf = Buffer.from(tmp, 'hex');
    const block = this.padBuffer(tmpBuf);
    return this.encodeBuffer(block, prefixSalt);
  }

  /**
   * Encodes a string into a Flip ID.
   * @param str - String to encode (UTF-8)
   * @param prefixSalt - Single character prefix salt (required if usePrefixSalt is true)
   * @returns Encoded string
   * @throws InvalidDataTypeError if str is not a string
   * @throws BlockTooLargeError if encoded value exceeds blockSize
   */
  encodeString(str: string, prefixSalt: string = ''): string {
    if (typeof str !== 'string') {
      throw new errors.InvalidDataTypeError(`Invalid data type: ${typeof str}`);
    }
    const tmpBuf = Buffer.from(str, 'utf8');
    const block = this.padBuffer(tmpBuf);
    return this.encodeBuffer(block, prefixSalt);
  }

  /**
   * Encodes a buffer into a Flip ID.
   * @param buffer - Buffer to encode
   * @param prefixSalt - Single character prefix salt (required if usePrefixSalt is true)
   * @returns Encoded string
   * @throws BlockTooLargeError if buffer exceeds blockSize
   * @throws InvalidArgumentError if prefixSalt is invalid
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
    const block = this.padBuffer(buffer);
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
   * Decodes a Flip ID and returns the original data as a number.
   * @param encoded - Encoded string to decode
   * @returns Decoded number
   * @throws NumberOverflowError if decoded value exceeds Number.MAX_SAFE_INTEGER
   * @throws InvalidEncodedStringError if encoded string is invalid
   * @throws CheckSumError if checksum validation fails (when checkSum is enabled)
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
      if (num > Number.MAX_SAFE_INTEGER) {
        throw new errors.NumberOverflowError(
          `Decoded value exceeds Number.MAX_SAFE_INTEGER. Use decodeToBigInt() instead.`
        );
      }
    }
    return num;
  }

  /**
   * Decodes a Flip ID and returns the original data as a bigint.
   * Use this method for values that may exceed Number.MAX_SAFE_INTEGER.
   * @param encoded - Encoded string to decode
   * @returns Decoded bigint
   * @throws InvalidEncodedStringError if encoded string is invalid
   * @throws CheckSumError if checksum validation fails (when checkSum is enabled)
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
   * Decodes a Flip ID and returns the original data as a string.
   * @param encoded - Encoded string to decode
   * @returns Decoded string (UTF-8)
   * @throws InvalidEncodedStringError if encoded string is invalid
   * @throws CheckSumError if checksum validation fails (when checkSum is enabled)
   */
  decodeToString(encoded: string): string {
    const decryptedBlock = this.decodeToBuffer(encoded);
    const plaintext = decryptedBlock.toString('utf8');
    return plaintext;
  }

  /**
   * Decodes a Flip ID and returns the original data as a Buffer.
   * @param encoded - Encoded string to decode
   * @returns Decoded buffer
   * @throws InvalidEncodedStringError if encoded string is empty or contains invalid characters
   * @throws CheckSumError if checksum validation fails (when checkSum is enabled)
   */
  decodeToBuffer(encoded: string): Buffer {
    if (encoded.length === 0) {
      throw new errors.InvalidEncodedStringError('Encoded string cannot be empty');
    }

    let saltSize = 0;
    if (this.usePrefixSalt) {
      saltSize = 1;
      encoded = encoded.slice(1);
    }

    if (!this.encoder.validate(encoded)) {
      throw new errors.InvalidEncodedStringError('Encoded string contains invalid characters');
    }

    const checkSumSize = this.checkSum ? 1 : 0;
    const expectedSize =
      this.blockSize > 0
        ? saltSize + this.headerSize + this.blockSize + checkSumSize
        : undefined;
    const decodedBuf = this.encoder.decode(
      encoded,
      expectedSize !== undefined ? { size: expectedSize } : undefined
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
