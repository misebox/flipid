/**
 * A collection of common bases.
 */
export const Chars = {
  Decimal: "0123456789",
  Base16: "0123456789ABCDEF",
  Base32: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
  Base32Crockford: "0123456789ABCDEFGHJKMNPQRSTVWXYZ",
  Base36: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  Base58: "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
  Base64_STD:
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
  Base64_URL_SAFE:
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
  Base64_XML_NMTOKEN:
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._",
  Base64_XML_NAME:
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_:",
  Ascii85:
    "!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstu",
  Base85:
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!#$%&()*+-;<=>?@^_`{|}~",
  Z85: "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#",
};

/**
 * Encodes and decodes buffers to and from a base.
 */
export class BufferEncoder {
  constructor(private baseChars: string) {}

  encode(buffer): string {
    let result = [];
    for (const byte of buffer) {
      let carry = byte;
      for (let j = 0; j < result.length; j++) {
        carry += result[j] * 256;
        result[j] = carry % this.baseChars.length;
        carry = Math.floor(carry / this.baseChars.length);
      }
      while (carry > 0) {
        result.push(carry % this.baseChars.length);
        carry = Math.floor(carry / this.baseChars.length);
      }
    }
    for (const byte of buffer) {
      if (byte === 0) {
        result.push(0);
      } else {
        break;
      }
    }
    return result
      .reverse()
      .map((index) => this.baseChars[index])
      .join("");
  }

  decode(encoded): Buffer {
    let result = Buffer.alloc(0);
    for (const char of encoded) {
      const value = this.baseChars.indexOf(char);
      if (value === -1) throw new Error("Invalid character found");
      let carry = value;
      let tempResult = Buffer.alloc(result.length);
      let i;
      for (i = 0; i < result.length; i++) {
        carry += result[i] * this.baseChars.length;
        tempResult[i] = carry % 256;
        carry = Math.floor(carry / 256);
      }
      while (carry > 0) {
        tempResult = Buffer.concat([tempResult, Buffer.from([carry % 256])]);
        carry = Math.floor(carry / 256);
      }
      result = tempResult;
    }
    return result.reverse();
  }
}

/**
 * Creates a converter function that can convert between two bases.
 */
export const createConverter = (
  inputBase: string,
  outputBase: string
): ((input: string) => string) => {
  const decoder = new BufferEncoder(inputBase);
  const encoder = new BufferEncoder(outputBase);
  return (input: string): string => {
    return encoder.encode(decoder.decode(input));
  };
};
