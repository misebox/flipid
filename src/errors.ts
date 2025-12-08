// Error for when the data is not a number, a bigint or a buffer
export class FlipIDInvalidDataTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FlipIDInvalidDataTypeError';
  }
}

// Error for when the block is larger than byteSize
export class FlipIDBlockTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FlipIDBlockTooLargeError';
  }
}

// Error for when arguments are invalid
export class FlipIDInvalidArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FlipIDInvalidArgumentError';
  }
}

// Error for when the checksum is invalid
export class FlipIDChecksumError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FlipIDChecksumError';
  }
}

// Error for when number exceeds safe integer range
export class FlipIDNumberOverflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FlipIDNumberOverflowError';
  }
}

// Error for when input string is invalid for decoding
export class FlipIDInvalidEncodedStringError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FlipIDInvalidEncodedStringError';
  }
}

export default {
  FlipIDInvalidDataTypeError,
  FlipIDBlockTooLargeError,
  FlipIDInvalidArgumentError,
  FlipIDChecksumError,
  FlipIDNumberOverflowError,
  FlipIDInvalidEncodedStringError,
};
