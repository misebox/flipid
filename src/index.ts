export {
  FlipID,
  type FlipIDOptions,
  // Deprecated aliases
  FlipIDGenerator,
  type FlipIDGeneratorOptions,
} from './flipid.js';
export {
  FlipIDInvalidDataTypeError,
  FlipIDBlockTooLargeError,
  FlipIDInvalidArgumentError,
  FlipIDChecksumError,
  FlipIDNumberOverflowError,
  FlipIDInvalidEncodedStringError,
  // Deprecated aliases
  InvalidDataTypeError,
  BlockTooLargeError,
  InvalidArgumentError,
  CheckSumError,
  NumberOverflowError,
  InvalidEncodedStringError,
} from './errors.js';
// Re-export from bufferbase for convenience
export { Codecs, createCodec, type ICodec } from 'bufferbase';
// Utilities
export {
  signedToUnsigned,
  unsignedToSigned,
  signedToUnsignedBigInt,
  unsignedToSignedBigInt,
} from './utils.js';
