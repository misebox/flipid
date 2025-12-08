/**
 * Converts a signed integer to unsigned.
 * @param n - Signed integer
 * @param bits - Bit width (default: 32)
 * @returns Unsigned integer
 */
export const signedToUnsigned = (n: number, bits: number = 32): number => {
  return n < 0 ? n + 2 ** bits : n;
};

/**
 * Converts an unsigned integer to signed.
 * @param n - Unsigned integer
 * @param bits - Bit width (default: 32)
 * @returns Signed integer
 */
export const unsignedToSigned = (n: number, bits: number = 32): number => {
  const half = 2 ** (bits - 1);
  return n >= half ? n - 2 ** bits : n;
};

/**
 * Converts a signed bigint to unsigned.
 * @param n - Signed bigint
 * @param bits - Bit width (default: 64)
 * @returns Unsigned bigint
 */
export const signedToUnsignedBigInt = (n: bigint, bits: number = 64): bigint => {
  return n < 0n ? n + 2n ** BigInt(bits) : n;
};

/**
 * Converts an unsigned bigint to signed.
 * @param n - Unsigned bigint
 * @param bits - Bit width (default: 64)
 * @returns Signed bigint
 */
export const unsignedToSignedBigInt = (n: bigint, bits: number = 64): bigint => {
  const half = 2n ** BigInt(bits - 1);
  return n >= half ? n - 2n ** BigInt(bits) : n;
};
