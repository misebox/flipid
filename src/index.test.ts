import { describe, expect, it } from "vitest";
import {
  FlipID,
  FlipIDGenerator,
  FlipIDInvalidDataTypeError,
  FlipIDBlockTooLargeError,
  FlipIDInvalidArgumentError,
  FlipIDChecksumError,
  FlipIDNumberOverflowError,
  FlipIDInvalidEncodedStringError,
  Codecs,
  createCodec,
  signedToUnsigned,
  unsignedToSigned,
  signedToUnsignedBigInt,
  unsignedToSignedBigInt,
} from "./index";

describe("index exports", () => {
  it("should export FlipID class", () => {
    expect(FlipID).toBeDefined();
    const instance = new FlipID({ key: "test", blockSize: 4 });
    expect(instance).toBeInstanceOf(FlipID);
  });

  it("should export FlipIDGenerator as deprecated alias", () => {
    expect(FlipIDGenerator).toBe(FlipID);
  });

  it("should export all error classes", () => {
    expect(FlipIDInvalidDataTypeError).toBeDefined();
    expect(FlipIDBlockTooLargeError).toBeDefined();
    expect(FlipIDInvalidArgumentError).toBeDefined();
    expect(FlipIDChecksumError).toBeDefined();
    expect(FlipIDNumberOverflowError).toBeDefined();
    expect(FlipIDInvalidEncodedStringError).toBeDefined();
  });

  it("should export bufferbase utilities", () => {
    expect(Codecs).toBeDefined();
    expect(createCodec).toBeDefined();
  });

  it("should export signed/unsigned conversion utilities", () => {
    expect(signedToUnsigned).toBeDefined();
    expect(unsignedToSigned).toBeDefined();
    expect(signedToUnsignedBigInt).toBeDefined();
    expect(unsignedToSignedBigInt).toBeDefined();
  });
});
