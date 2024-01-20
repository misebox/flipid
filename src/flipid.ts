import { Buffer } from "node:buffer";
import { encrypt } from "./simple-cipher";

// Error for when the block is larger than byteSize
class BlockTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlockTooLargeError";
  }
}

export class FlipIDGenerator {
  constructor(private key: string, private byteSize: number = 4) {}

  encodeNumber(n: number | bigint, seed: string): string {
    const buf = Buffer.from(n.toString(16), "hex");
    if (buf.length > this.byteSize) {
      throw new Error();
    }
    const block = Buffer.alloc(this.byteSize);
    buf.copy(block, this.byteSize - buf.length);
    let hex = ("00000000" + n.toString(16)).slice(-8);
    const key = Buffer.from(
      this.key
        .repeat(Math.ceil(block.length / this.key.length))
        .slice(0, block.length),
      "ascii"
    );
    const encrypted = encrypt(block, key, Buffer.from(seed, "ascii"));
    return seed + encrypted.toString;
  }

  decodeNumber();
}
