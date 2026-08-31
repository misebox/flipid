/**
 * Why a FlipID call failed.
 *
 * - `INVALID_OPTION` — the codec could not be built from the given options.
 * - `INVALID_VALUE` — the value passed to `encode` is out of range for the
 *   configured width, or is not of the configured type.
 *
 * Decoding never throws: `decode` returns `null` for anything it cannot read.
 */
export type FlipIDErrorCode = "INVALID_OPTION" | "INVALID_VALUE";

/** The only error this package throws. */
export class FlipIDError extends Error {
  readonly code: FlipIDErrorCode;

  constructor(code: FlipIDErrorCode, message: string) {
    super(message);
    this.name = "FlipIDError";
    this.code = code;
  }
}

export const invalidOption = (message: string): FlipIDError => {
  return new FlipIDError("INVALID_OPTION", message);
};

export const invalidValue = (message: string): FlipIDError => {
  return new FlipIDError("INVALID_VALUE", message);
};
