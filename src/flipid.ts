import type { ICodec } from "bufferbase";
import { defaultCodec, resolveCodec, type CodecSource } from "./codec.js";
import { invalidOption } from "./errors.js";
import { deriveSeed, hashBytes, scramble, unscramble, type Seed } from "./scramble.js";
import { bigintValue, bytesValue, numberValue, textValue, type ValueCodec } from "./values.js";

/** Largest `check` accepted, and the width of the hash it is taken from. */
const MAX_CHECK = 4;

/** Six bytes is 48 bits, the widest that always fits in a `number`. */
const MAX_NUMBER_BYTES = 6;

const MAX_BYTES = 256;

/** Options every FlipID shares. */
export type FlipIDOptions = {
  /** Secret that decides the transformation. The same key always maps a value to the same ID. */
  key: string;
  /**
   * Bytes of check data carried in the ID, 0 to 4 (default: 1).
   *
   * Each byte lets `decode` reject 255 of every 256 strings that were not
   * produced by this instance, and lengthens the ID.
   */
  check?: number;
  /** Codec, or the name of one, that turns the block into characters (default: Crockford Base32). */
  codec?: CodecSource;
};

type WidthOptions = FlipIDOptions & { signed?: boolean };

const width = (name: string, value: number, max: number): number => {
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw invalidOption(`${name} must be a whole number between 1 and ${max}, got ${value}`);
  }
  return value;
};

/**
 * A reversible mapping between values of one type and fixed-length strings.
 *
 * Build one with `FlipID.number`, `FlipID.bigint`, `FlipID.bytes` or
 * `FlipID.text`. Every ID it writes is exactly `length` characters long, and
 * `decode` returns `null` for anything it did not write.
 *
 * This obfuscates, it does not protect: anyone holding the key can decode, and
 * the transformation is not built to withstand analysis.
 *
 * @example
 * ```typescript
 * const ids = FlipID.number({ key: 'my-app-key', bytes: 4 });
 * ids.encode(123456);            // 'B7K2QW5Z'
 * ids.decode('B7K2QW5Z');        // 123456
 * ids.decode('not-an-id');       // null
 * ```
 */
export class FlipID<T> {
  /** Number of characters in every ID this instance writes. */
  readonly length: number;

  private readonly value: ValueCodec<T>;
  private readonly codec: ICodec;
  private readonly check: number;
  private readonly blockSize: number;
  private readonly seed: Seed;

  private constructor(value: ValueCodec<T>, options: FlipIDOptions) {
    if (typeof options.key !== "string" || options.key.length === 0) {
      throw invalidOption("key is required");
    }
    const check = options.check ?? 1;
    if (!Number.isInteger(check) || check < 0 || check > MAX_CHECK) {
      throw invalidOption(`check must be a whole number between 0 and ${MAX_CHECK}, got ${check}`);
    }

    this.value = value;
    this.check = check;
    this.blockSize = value.size + check;
    this.codec = resolveCodec(options.codec ?? defaultCodec);
    this.seed = deriveSeed(options.key, this.blockSize);
    this.length = this.codec.encode(new Uint8Array(this.blockSize).fill(0xff)).length;
  }

  /**
   * Encodes a value into an ID of exactly `length` characters.
   *
   * @throws {FlipIDError} `INVALID_VALUE` if the value does not fit the configured width.
   */
  encode(value: T): string {
    const body = this.value.toBytes(value);
    const block = new Uint8Array(this.blockSize);
    block.set(body);
    if (this.check > 0) {
      block.set(this.checkBytes(body), this.value.size);
    }
    const encoded = this.codec.encode(scramble(block, this.seed));
    return encoded.padStart(this.length, this.codec.chars[0]);
  }

  /**
   * Decodes an ID, or returns `null` if this instance did not write it.
   *
   * With the default single check byte, roughly one in 256 strings of the right
   * shape slips through and decodes to an arbitrary value. Raise `check` for
   * longer odds.
   */
  decode(encoded: string): T | null {
    if (typeof encoded !== "string" || encoded.length === 0) {
      return null;
    }
    let raw: Uint8Array;
    try {
      raw = this.codec.decode(encoded, { size: this.blockSize });
    } catch {
      return null;
    }
    const block = unscramble(raw, this.seed);
    const body = block.slice(0, this.value.size);
    if (this.check > 0) {
      const expected = this.checkBytes(body);
      for (let i = 0; i < this.check; i++) {
        if (block[this.value.size + i] !== expected[i]) {
          return null;
        }
      }
    }
    try {
      return this.value.fromBytes(body);
    } catch {
      return null;
    }
  }

  private checkBytes(body: Uint8Array): Uint8Array {
    let hash = hashBytes(body);
    const bytes = new Uint8Array(this.check);
    for (let i = this.check - 1; i >= 0; i--) {
      bytes[i] = hash & 0xff;
      hash = hash >>> 8;
    }
    return bytes;
  }

  /** Whole numbers stored in `bytes` bytes, up to 6. Set `signed` to allow negatives. */
  static number(options: WidthOptions & { bytes: number }): FlipID<number> {
    const size = width("bytes", options.bytes, MAX_NUMBER_BYTES);
    return new FlipID(numberValue(size, options.signed ?? false), options);
  }

  /** Whole numbers of any width, as `bigint`. Set `signed` to allow negatives. */
  static bigint(options: WidthOptions & { bytes: number }): FlipID<bigint> {
    const size = width("bytes", options.bytes, MAX_BYTES);
    return new FlipID(bigintValue(size, options.signed ?? false), options);
  }

  /** Byte strings of exactly `size` bytes, such as a 16-byte UUID. */
  static bytes(options: FlipIDOptions & { size: number }): FlipID<Uint8Array> {
    return new FlipID(bytesValue(width("size", options.size, MAX_BYTES)), options);
  }

  /** UTF-8 text of up to `size` bytes. */
  static text(options: FlipIDOptions & { size: number }): FlipID<string> {
    return new FlipID(textValue(width("size", options.size, MAX_BYTES)), options);
  }
}
