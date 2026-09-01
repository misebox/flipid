import { describe, expect, it } from "vitest";
import { Codecs } from "bufferbase";
import { FlipID } from "./flipid.js";
import { FlipIDError } from "./errors.js";

const key = "my-app-key";

describe("FlipID.number", () => {
  const ids = FlipID.number({ key, size: 4 });

  it("round-trips", () => {
    for (const value of [0, 1, 2, 255, 256, 123456, 4294967295]) {
      expect(ids.decode(ids.encode(value))).toBe(value);
    }
  });

  it("writes ids of exactly length characters", () => {
    for (let value = 0; value < 20000; value++) {
      expect(ids.encode(value)).toHaveLength(ids.length);
    }
  });

  it("maps 4 bytes plus a check byte onto 8 Crockford characters", () => {
    expect(ids.length).toBe(8);
  });

  it("gives consecutive values unrelated ids", () => {
    const a = ids.encode(1);
    const b = ids.encode(2);
    const shared = [...a].filter((char, i) => {
      return char === b[i];
    });
    expect(shared.length).toBeLessThanOrEqual(2);
  });

  it("rejects values outside the width", () => {
    expect(() => {
      return ids.encode(4294967296);
    }).toThrow(FlipIDError);
    expect(() => {
      return ids.encode(-1);
    }).toThrow(FlipIDError);
  });

  it("rejects values that are not whole numbers", () => {
    for (const value of [1.5, NaN, Infinity]) {
      expect(() => {
        return ids.encode(value);
      }).toThrow(FlipIDError);
    }
  });

  it("reports INVALID_VALUE on the error", () => {
    try {
      ids.encode(-1);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(FlipIDError);
      expect((error as FlipIDError).code).toBe("INVALID_VALUE");
    }
  });

  it("carries negative numbers when signed", () => {
    const signed = FlipID.number({ key, size: 4, signed: true });
    for (const value of [-2147483648, -1, 0, 1, 2147483647]) {
      expect(signed.decode(signed.encode(value))).toBe(value);
    }
    expect(() => {
      return signed.encode(2147483648);
    }).toThrow(FlipIDError);
  });

  it("refuses widths a number cannot hold", () => {
    expect(() => {
      return FlipID.number({ key, size: 7 });
    }).toThrow(FlipIDError);
  });
});

describe("decode", () => {
  const ids = FlipID.number({ key, size: 4 });

  it("returns null for strings it did not write", () => {
    for (const input of ["", "not-an-id", "!!!!!!!!", "0123456789012345"]) {
      expect(ids.decode(input)).toBeNull();
    }
  });

  it("rejects almost every random string of the right shape", () => {
    const chars = Codecs.base32crockford.alphabet;
    let accepted = 0;
    const trials = 20000;
    for (let i = 0; i < trials; i++) {
      let candidate = "";
      for (let j = 0; j < ids.length; j++) {
        candidate += chars[Math.floor(Math.random() * chars.length)];
      }
      if (ids.decode(candidate) !== null) {
        accepted++;
      }
    }
    expect(accepted / trials).toBeLessThan(0.01);
  });

  it("rejects ids written with another key", () => {
    const other = FlipID.number({ key: "another-key", size: 4 });
    const mismatches = [...Array(500).keys()].filter((value) => {
      return ids.decode(other.encode(value)) === null;
    });
    expect(mismatches.length).toBeGreaterThan(490);
  });

  it("accepts ids in either case, and with hyphens", () => {
    const encoded = ids.encode(123456);
    expect(ids.decode(encoded.toLowerCase())).toBe(123456);
    expect(ids.decode(`${encoded.slice(0, 4)}-${encoded.slice(4)}`)).toBe(123456);
  });

  it("reads O and I as 0 and 1", () => {
    const encoded = ids.encode(7).replace(/0/g, "O").replace(/1/g, "I");
    expect(ids.decode(encoded)).toBe(7);
  });

  it("takes wider check data for longer odds", () => {
    const wide = FlipID.number({ key, size: 4, checkBytes: 2 });
    expect(wide.length).toBeGreaterThan(ids.length);
    expect(wide.decode(wide.encode(99))).toBe(99);
  });

  it("carries no check data when check is 0", () => {
    const bare = FlipID.number({ key, size: 2, checkBytes: 0 });
    expect(bare.length).toBe(4);
    expect(bare.decode(bare.encode(65535))).toBe(65535);
  });

  it("refuses a checkBytes width it cannot fill", () => {
    expect(() => {
      return FlipID.number({ key, size: 4, checkBytes: 5 });
    }).toThrow(FlipIDError);
  });
});

describe("FlipID.bigint", () => {
  const ids = FlipID.bigint({ key, size: 8 });

  it("round-trips the whole 64-bit range", () => {
    for (const value of [0n, 1n, 2n ** 32n, 2n ** 63n, 2n ** 64n - 1n]) {
      expect(ids.decode(ids.encode(value))).toBe(value);
    }
  });

  it("rejects numbers", () => {
    expect(() => {
      return ids.encode(1 as unknown as bigint);
    }).toThrow(FlipIDError);
  });

  it("carries negative numbers when signed", () => {
    const signed = FlipID.bigint({ key, size: 8, signed: true });
    for (const value of [-(2n ** 63n), -1n, 0n, 2n ** 63n - 1n]) {
      expect(signed.decode(signed.encode(value))).toBe(value);
    }
  });

  it("rejects values outside the width", () => {
    expect(() => {
      return ids.encode(2n ** 64n);
    }).toThrow(FlipIDError);
    expect(() => {
      return ids.encode(-1n);
    }).toThrow(FlipIDError);
  });
});

describe("FlipID.bytes", () => {
  const ids = FlipID.bytes({ key, size: 16 });

  it("round-trips a UUID", () => {
    const uuid = Uint8Array.from({ length: 16 }, (_, i) => {
      return i * 7 + 1;
    });
    expect(ids.decode(ids.encode(uuid))).toEqual(uuid);
  });

  it("rejects the wrong number of bytes", () => {
    expect(() => {
      return ids.encode(new Uint8Array(15));
    }).toThrow(FlipIDError);
  });

  it("does not modify its input", () => {
    const input = new Uint8Array(16).fill(3);
    ids.encode(input);
    expect(input).toEqual(new Uint8Array(16).fill(3));
  });
});

describe("FlipID.text", () => {
  const ids = FlipID.text({ key, size: 12 });

  it("round-trips text shorter than the width", () => {
    for (const value of ["", "a", "hello", "日本語"]) {
      expect(ids.decode(ids.encode(value))).toBe(value);
    }
  });

  it("rejects text wider than the width", () => {
    expect(() => {
      return ids.encode("this is far too long");
    }).toThrow(FlipIDError);
  });
});

describe("codecs", () => {
  it("keeps ids fixed-length on a radix alphabet", () => {
    const ids = FlipID.number({ key, size: 4, codec: "base58" });
    for (let value = 0; value < 20000; value++) {
      expect(ids.encode(value)).toHaveLength(ids.length);
    }
    expect(ids.decode(ids.encode(123456))).toBe(123456);
  });

  it("accepts a codec instance", () => {
    const ids = FlipID.number({ key, size: 4, codec: Codecs.base64url });
    expect(ids.decode(ids.encode(123456))).toBe(123456);
  });

  it("accepts a raw codec spec", () => {
    const ids = FlipID.number({
      key,
      size: 2,
      codec: { alphabet: "01", algorithm: "radix" },
    });
    expect(ids.decode(ids.encode(1000))).toBe(1000);
  });

  it("refuses an unknown base name", () => {
    expect(() => {
      return FlipID.number({ key, size: 4, codec: "base99" as "base58" });
    }).toThrow(FlipIDError);
  });
});

describe("options", () => {
  it("requires a key", () => {
    expect(() => {
      return FlipID.number({ key: "", size: 4 });
    }).toThrow(FlipIDError);
  });

  it("reports INVALID_OPTION on the error", () => {
    try {
      FlipID.number({ key: "", size: 4 });
      expect.unreachable();
    } catch (error) {
      expect((error as FlipIDError).code).toBe("INVALID_OPTION");
    }
  });
});

describe("type guards", () => {
  it("rejects values of the wrong type", () => {
    const cases: [FlipID<never>, unknown][] = [
      [FlipID.number({ key, size: 4 }) as never, "1"],
      [FlipID.bigint({ key, size: 8 }) as never, 1],
      [FlipID.bytes({ key, size: 4 }) as never, "abcd"],
      [FlipID.text({ key, size: 4 }) as never, 1],
    ];
    for (const [ids, value] of cases) {
      expect(() => {
        return ids.encode(value as never);
      }).toThrow(FlipIDError);
    }
  });

  it("refuses a width of zero", () => {
    expect(() => {
      return FlipID.bytes({ key, size: 0 });
    }).toThrow(FlipIDError);
  });
});

describe("text decoding", () => {
  it("returns null when the bytes are not valid UTF-8", () => {
    const ids = FlipID.text({ key, size: 4, checkBytes: 0 });
    const chars = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    let rejected = 0;
    for (let i = 0; i < 2000; i++) {
      let candidate = "";
      for (let j = 0; j < ids.length; j++) {
        candidate += chars[Math.floor(Math.random() * chars.length)];
      }
      if (ids.decode(candidate) === null) {
        rejected++;
      }
    }
    expect(rejected).toBeGreaterThan(0);
  });
});
