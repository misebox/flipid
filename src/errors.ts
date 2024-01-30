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

// Error for when prefix salt is required
export class PrefixSaltRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PrefixSaltRequiredError';
  }
}

// Error for when arguments are invalid
export class InvalidArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidArgumentError';
  }
}

export default {
  InvalidDataTypeError,
  BlockTooLargeError,
  PrefixSaltRequiredError,
  InvalidArgumentError,
};
