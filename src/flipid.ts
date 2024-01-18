import { Buffer } from "node:buffer";
import { encrypt } from "./simple-cipher";

export class FlipIDGenerator {
  key: string;
  constructor(key: string) {
    this.key = key;
  }

  encodeNumber(n: number, seed: string): string {
    if (n < 0 || n > 2 ** 32 - 1) {
      throw new Error("Number must be between 0 and 2^32-1");
    }
    let hex = ("00000000" + n.toString(16)).slice(-8);
    const block = Buffer.from(hex, "hex");
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
