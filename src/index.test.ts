import { describe, expect, it } from "vitest";
import { Codecs, createCodec, defaultCodec, FlipID, FlipIDError } from "./index.js";

describe("index", () => {
  it("exports the pieces a caller needs", () => {
    expect(typeof FlipID.number).toBe("function");
    expect(typeof FlipIDError).toBe("function");
    expect(defaultCodec.algorithm).toBe("block");
    expect(typeof createCodec).toBe("function");
    expect(Codecs.base58.alphabet).toHaveLength(58);
  });

  it("works end to end through the entry point", () => {
    const ids = FlipID.number({ key: "k", size: 4 });
    expect(ids.decode(ids.encode(42))).toBe(42);
  });
});
