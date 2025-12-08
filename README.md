# FlipID

FlipID is a simple and reversible ID obfuscation tool. It transforms numeric IDs into unguessable strings and back.

## This is NOT Encryption

FlipID is an **obfuscation tool**, not a cryptographic library.

- Does NOT provide security or confidentiality
- Uses `Math.sin()` based PRNG (predictable, not cryptographically secure)
- Anyone with the key can decode; anyone determined can likely reverse-engineer

**Use cases:**
- Hiding sequential database IDs in URLs (`/users/1` → `/users/X7KQ9M`)
- Making IDs non-enumerable for casual observers
- URL shorteners, invite codes, etc.

**Do NOT use for:**
- Protecting sensitive data
- Authentication tokens
- Anything requiring real security

## Installation

```bash
npm install flipid
# or
bun add flipid
```

## Setup

You need to decide two things:

### 1. Key

Any string that makes the transformation unique to your application.

- Same key + same input = same output (deterministic)
- Different key = different output
- Keep it consistent across your application
- Store in environment variables or config

### 2. Block Size

The fixed byte size for encoding. This determines output length.

| blockSize | Max value                | Output length |
|-----------|--------------------------|---------------|
| 1         | 255 (2⁸-1)               | 2 chars       |
| 2         | 65,535 (2¹⁶-1)           | 4 chars       |
| 3         | 16,777,215 (2²⁴-1)       | 5 chars       |
| 4         | ~4 billion (2³²-1)       | 7 chars       |
| 8         | ~18 quintillion (2⁶⁴-1)  | 13 chars      |
| 0         | unlimited (variable)     | varies        |

- Use `blockSize: 4` for typical database IDs (32-bit)
- Use `blockSize: 8` for large IDs or UUIDs (64-bit)
- Use `blockSize: 0` for variable-length data

**Important:** Once you choose key and blockSize, keep them unchanged. Changing either will make existing encoded IDs undecodable.

## Usage

### Basic Example

```typescript
import { FlipID } from 'flipid';

const flipid = new FlipID({
  key: 'my-app-key',
  blockSize: 4,
});

// Encode a number
const encoded = flipid.encodeNumber(123456);
console.log(encoded); // "597JZ5AZ"

// Decode back to number
const decoded = flipid.decodeToNumber(encoded);
console.log(decoded); // 123456
```

### Encoding Different Types

```typescript
const flipid = new FlipID({ key: 'my-app-key', blockSize: 8 });

// Numbers
flipid.encodeNumber(42);              // "G2M4G7597PCAHP"
flipid.decodeToNumber('G2M4G7597PCAHP'); // 42

// BigInt (for large numbers)
flipid.encodeBigInt(2n ** 64n - 1n);  // "3GEZG70YEHCZVJ"
flipid.decodeToBigInt('3GEZG70YEHCZVJ'); // 18446744073709551615n

// Strings
flipid.encodeString('hello');         // "196TY1H75RPJ984"
flipid.decodeToString('196TY1H75RPJ984'); // "hello"

// Buffers
flipid.encodeBuffer(Buffer.from('data')); // "28B7TDZKBZYZYWE"
flipid.decodeToBuffer('28B7TDZKBZYZYWE');  // <Buffer 64 61 74 61>
```

### Custom Encoder

```typescript
import { FlipID, Codecs } from 'flipid';

// Default: Base32 Crockford (0-9, A-Z excluding I, L, O, U)
const f1 = new FlipID({ key: 'my-app-key', blockSize: 4 });
f1.encodeNumber(1); // "10E4RBBN"
f1.encodeNumber(2); // "1DQKRNGE"
f1.encodeNumber(3); // "18BKANVZ"

// Base64 URL-safe (shorter output)
const f2 = new FlipID({ key: 'my-app-key', blockSize: 4, encoder: Codecs.base64url });
f2.encodeNumber(1); // "gcTC11"
f2.encodeNumber(2); // "tvPFYO"
f2.encodeNumber(3); // "oXNVd_"

// Base58 (Bitcoin-style, no confusing chars: 0, O, I, l)
const f3 = new FlipID({ key: 'my-app-key', blockSize: 4, encoder: Codecs.base58 });
f3.encodeNumber(1); // "v5Ct6G"
f3.encodeNumber(2); // "2Hpm2J1"
f3.encodeNumber(3); // "292iw6E"

// Hexadecimal
const f4 = new FlipID({ key: 'my-app-key', blockSize: 4, encoder: Codecs.base16 });
f4.encodeNumber(1); // "81C4C2D75"
f4.encodeNumber(2); // "B6F3C560E"
f4.encodeNumber(3); // "A1735577F"
```

### Error Handling

```typescript
import {
  FlipID,
  FlipIDNumberOverflowError,
  FlipIDInvalidEncodedStringError,
} from 'flipid';

const flipid = new FlipID({ key: 'my-app-key', blockSize: 4 });

try {
  flipid.decodeToBuffer('!!!invalid!!!');
} catch (e) {
  if (e instanceof FlipIDInvalidEncodedStringError) {
    console.error('Invalid encoded string');
  }
}

// For large values, use BigInt methods
const flipid8 = new FlipID({ key: 'my-app-key', blockSize: 8 });
const encoded = flipid8.encodeBigInt(2n ** 60n);
try {
  flipid8.decodeToNumber(encoded); // throws: exceeds MAX_SAFE_INTEGER
} catch (e) {
  if (e instanceof FlipIDNumberOverflowError) {
    const value = flipid8.decodeToBigInt(encoded); // use BigInt instead
  }
}
```

### Signed Integers

FlipID only accepts unsigned integers. Use the utility functions for signed values:

```typescript
import { FlipID, signedToUnsigned, unsignedToSigned } from 'flipid';

const flipid = new FlipID({ key: 'my-app-key', blockSize: 4 });

// Encode signed integer
const encoded = flipid.encodeNumber(signedToUnsigned(-1));    // 4294967295
const decoded = unsignedToSigned(flipid.decodeToNumber(encoded)); // -1

// For BigInt (64-bit)
import { signedToUnsignedBigInt, unsignedToSignedBigInt } from 'flipid';

const flipid8 = new FlipID({ key: 'my-app-key', blockSize: 8 });
const encoded8 = flipid8.encodeBigInt(signedToUnsignedBigInt(-1n));
const decoded8 = unsignedToSignedBigInt(flipid8.decodeToBigInt(encoded8)); // -1n
```

## API

### `FlipID`

#### Constructor Options

| Option          | Type      | Default          | Description                                      |
|-----------------|-----------|------------------|--------------------------------------------------|
| `key`           | `string`  | (required)       | Key for encoding/decoding transformation         |
| `blockSize`     | `number`  | `4`              | Fixed block size in bytes. `0` = variable length |
| `headerSize`    | `number`  | `1`              | Bytes for internal IV (1-4). Larger = more variation |
| `checkSum`      | `boolean` | `false`          | Enable checksum validation on decode             |
| `usePrefixSalt` | `boolean` | `false`          | Add single-char prefix salt to output            |
| `encoder`       | `ICodec`  | Base32Crockford  | Custom encoder from bufferbase                   |

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

| Error                             | Description                                    |
|-----------------------------------|------------------------------------------------|
| `FlipIDInvalidDataTypeError`      | Invalid input data type                        |
| `FlipIDBlockTooLargeError`        | Input exceeds configured blockSize             |
| `FlipIDInvalidArgumentError`      | Invalid argument combination                   |
| `FlipIDChecksumError`             | Checksum mismatch on decode                    |
| `FlipIDNumberOverflowError`       | Decoded value exceeds Number.MAX_SAFE_INTEGER  |
| `FlipIDInvalidEncodedStringError` | Invalid encoded string format                  |

## License

ISC
