// Error for when the data is not a number, a bigint or a buffer
export class InvalidDataTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDataTypeError';
  }
}

// Error for when the block is larger than byteSize
export class BlockTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlockTooLargeError';
  }
}

// Error for when arguments are invalid
export class InvalidArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidArgumentError';
  }
}

// Error for when the checksum is invalid
export class CheckSumError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CheckSumError';
  }
}

// Error for when number exceeds safe integer range
export class NumberOverflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NumberOverflowError';
  }
}

// Error for when input string is invalid for decoding
export class InvalidEncodedStringError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidEncodedStringError';
  }
}

export default {
  InvalidDataTypeError,
  BlockTooLargeError,
  InvalidArgumentError,
  CheckSumError,
  NumberOverflowError,
  InvalidEncodedStringError,
};
