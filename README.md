# FlipID

FlipID is a simple and reversible ID transformation tool. It provides an easy way to convert and revert numeric identifiers into string for various applications.

## Warning

**DO NOT USE IN PRODUCTION**

This software:
- Has not undergone extensive validation
- Uses `Math.sin()` based PRNG which is cryptographically weak
- Is suitable only for obfuscation, NOT for security
- May have algorithm changes in future versions

## Installation

```bash
npm install flipid
```

## Usage

### Basic Example

```typescript
import { FlipID } from 'flipid';

const flipid = new FlipID({
  key: 'your-secret-key',
  blockSize: 8,
});

// Encode a number
const encoded = flipid.encodeNumber(123456);
console.log(encoded); // e.g., "3RF1XPER0Y..."

// Decode back to number
const decoded = flipid.decodeToNumber(encoded);
console.log(decoded); // 123456
```

### Encoding Different Types

```typescript
const flipid = new FlipID({ key: 'secret', blockSize: 8 });

// Numbers
const numEncoded = flipid.encodeNumber(42);
const numDecoded = flipid.decodeToNumber(numEncoded);

// BigInt (for large numbers)
const bigEncoded = flipid.encodeBigInt(2n ** 64n - 1n);
const bigDecoded = flipid.decodeToBigInt(bigEncoded);

// Strings
const strEncoded = flipid.encodeString('hello');
const strDecoded = flipid.decodeToString(strEncoded);

// Buffers
const bufEncoded = flipid.encodeBuffer(Buffer.from('data'));
const bufDecoded = flipid.decodeToBuffer(bufEncoded);

// Polymorphic encode (auto-detects type)
flipid.encode(123);           // number
flipid.encode(123n);          // bigint
flipid.encode('hello');       // string
flipid.encode(Buffer.from('x')); // buffer
```

### Error Handling

```typescript
import {
  FlipID,
  FlipIDNumberOverflowError,
  FlipIDInvalidEncodedStringError,
  FlipIDBlockTooLargeError,
  FlipIDChecksumError,
} from 'flipid';

const flipid = new FlipID({ key: 'secret', blockSize: 8 });

try {
  // Throws FlipIDNumberOverflowError if value exceeds Number.MAX_SAFE_INTEGER
  flipid.decodeToNumber(encodedLargeValue);
} catch (e) {
  if (e instanceof FlipIDNumberOverflowError) {
    // Use decodeToBigInt() instead
    const value = flipid.decodeToBigInt(encodedLargeValue);
  }
}

try {
  // Throws FlipIDInvalidEncodedStringError for invalid input
  flipid.decodeToBuffer('!!!invalid!!!');
} catch (e) {
  if (e instanceof FlipIDInvalidEncodedStringError) {
    console.error('Invalid encoded string');
  }
}
```

## API

### `FlipID`

#### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `key` | `string` | (required) | Secret key for encryption/decryption |
| `blockSize` | `number` | `0` | Fixed block size in bytes. `0` = variable length |
| `headerSize` | `number` | `1` | Header size for checksum calculation (1-4 bytes) |
| `checkSum` | `boolean` | `false` | Enable checksum validation on decode |
| `usePrefixSalt` | `boolean` | `false` | Add single-char prefix salt to output |
| `encoder` | `ICodec` | Base32Crockford | Custom encoder from bufferbase |

#### Methods

**Encoding:**
- `encode(data, prefixSalt?)` - Polymorphic encoding (number, bigint, string, or Buffer)
- `encodeNumber(num, prefixSalt?)` - Encode number or bigint
- `encodeBigInt(num, prefixSalt?)` - Encode bigint (type-safe)
- `encodeString(str, prefixSalt?)` - Encode string
- `encodeBuffer(buffer, prefixSalt?)` - Encode buffer

**Decoding:**
- `decodeToNumber(encoded)` - Decode to number (throws if > MAX_SAFE_INTEGER)
- `decodeToBigInt(encoded)` - Decode to bigint
- `decodeToString(encoded)` - Decode to string
- `decodeToBuffer(encoded)` - Decode to buffer

### Error Classes

| Error | Description |
|-------|-------------|
| `FlipIDInvalidDataTypeError` | Invalid input data type |
| `FlipIDBlockTooLargeError` | Input exceeds configured blockSize |
| `FlipIDInvalidArgumentError` | Invalid argument combination |
| `FlipIDChecksumError` | Checksum mismatch on decode |
| `FlipIDNumberOverflowError` | Decoded value exceeds Number.MAX_SAFE_INTEGER |
| `FlipIDInvalidEncodedStringError` | Invalid encoded string format |

## License

ISC
