import { invalidValue } from "./errors.js";

/**
 * Converts one value type to and from a fixed number of bytes.
 *
 * `toBytes` rejects what does not fit; `fromBytes` is only ever handed a block
 * of exactly `size` bytes.
 */
export type ValueCodec<T> = {
  readonly size: number;
  toBytes(value: T): Uint8Array;
  fromBytes(bytes: Uint8Array): T;
};

const writeBigEndian = (value: number, size: number): Uint8Array => {
  const bytes = new Uint8Array(size);
  let rest = value;
  for (let i = size - 1; i >= 0; i--) {
    bytes[i] = rest % 256;
    rest = Math.floor(rest / 256);
  }
  return bytes;
};

const readBigEndian = (bytes: Uint8Array): number => {
  let value = 0;
  for (const byte of bytes) {
    value = value * 256 + byte;
  }
  return value;
};

/** Whole numbers of up to 6 bytes, which stay inside `Number.MAX_SAFE_INTEGER`. */
export const numberValue = (size: number, signed: boolean): ValueCodec<number> => {
  const span = 2 ** (size * 8);
  const min = signed ? -(span / 2) : 0;
  const max = signed ? span / 2 - 1 : span - 1;

  return {
    size,
    toBytes(value) {
      if (typeof value !== "number" || !Number.isInteger(value)) {
        throw invalidValue(`expected a whole number, got ${String(value)}`);
      }
      if (value < min || value > max) {
        throw invalidValue(`${value} is outside ${min}..${max}`);
      }
      return writeBigEndian(value < 0 ? value + span : value, size);
    },
    fromBytes(bytes) {
      const value = readBigEndian(bytes);
      return signed && value > max ? value - span : value;
    },
  };
};

/** Whole numbers of any width, as `bigint`. */
export const bigintValue = (size: number, signed: boolean): ValueCodec<bigint> => {
  const span = 1n << BigInt(size * 8);
  const min = signed ? -(span / 2n) : 0n;
  const max = signed ? span / 2n - 1n : span - 1n;

  return {
    size,
    toBytes(value) {
      if (typeof value !== "bigint") {
        throw invalidValue(`expected a bigint, got ${typeof value}`);
      }
      if (value < min || value > max) {
        throw invalidValue(`${value} is outside ${min}..${max}`);
      }
      let rest = value < 0n ? value + span : value;
      const bytes = new Uint8Array(size);
      for (let i = size - 1; i >= 0; i--) {
        bytes[i] = Number(rest & 0xffn);
        rest >>= 8n;
      }
      return bytes;
    },
    fromBytes(bytes) {
      let value = 0n;
      for (const byte of bytes) {
        value = (value << 8n) | BigInt(byte);
      }
      return signed && value > max ? value - span : value;
    },
  };
};

/** A byte string of exactly `size` bytes, such as a UUID. */
export const bytesValue = (size: number): ValueCodec<Uint8Array> => {
  return {
    size,
    toBytes(value) {
      if (!(value instanceof Uint8Array)) {
        throw invalidValue(`expected a Uint8Array, got ${typeof value}`);
      }
      if (value.length !== size) {
        throw invalidValue(`expected exactly ${size} bytes, got ${value.length}`);
      }
      return value;
    },
    fromBytes(bytes) {
      return bytes;
    },
  };
};

/**
 * UTF-8 text of up to `size` bytes.
 *
 * Shorter text is padded with zero bytes, which decoding strips again. Text
 * whose own last character is U+0000 does not survive the round trip.
 */
export const textValue = (size: number): ValueCodec<string> => {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder("utf-8", { fatal: true });

  return {
    size,
    toBytes(value) {
      if (typeof value !== "string") {
        throw invalidValue(`expected a string, got ${typeof value}`);
      }
      const utf8 = encoder.encode(value);
      if (utf8.length > size) {
        throw invalidValue(`${utf8.length} UTF-8 bytes is more than ${size}`);
      }
      const bytes = new Uint8Array(size);
      bytes.set(utf8);
      return bytes;
    },
    fromBytes(bytes) {
      let end = bytes.length;
      while (end > 0 && bytes[end - 1] === 0) {
        end--;
      }
      return decoder.decode(bytes.subarray(0, end));
    },
  };
};
