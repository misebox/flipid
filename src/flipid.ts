import { Buffer } from "node:buffer";
import { encrypt } from "./simple-cipher";

// Error for when the data is not a number, a bigint or a buffer
class InvalidDataTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidDataTypeError";
  }
}

// Error for when the block is larger than byteSize
class BlockTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlockTooLargeError";
  }
}

export class FlipIDGenerator {
  constructor(private key: string, private byteSize: number = 4) {}

  encode(data: number | bigint | Buffer, seed: string | Buffer): string {
    let buf: Buffer;
    // Convert data to buffer
    if (data instanceof Buffer) {
      buf = data;
    } else if (typeof data === 'number' || typeof data === 'bigint') {
      buf = Buffer.from(data.toString(16), 'hex');
    } else {
      throw new InvalidDataTypeError("Invalid data type");
    }
    if (buf.length > this.byteSize) {
      throw new BlockTooLargeError('Block is too large');
    }
    // Pad the buffer with zeros
    const block = Buffer.alloc(this.byteSize);
    buf.copy(block, this.byteSize - buf.length);
    // TODO: use remain bytes
    const key = Buffer.from(
      this.key
        .repeat(Math.ceil(block.length / this.key.length))
        .slice(0, block.length),
      "ascii"
    );
    const seedBuf = Buffer.from(seed);
    const encrypted = encrypt(block, key, seed);
    return seed + encrypted.toString;
  }

  decodeNumber();
}
