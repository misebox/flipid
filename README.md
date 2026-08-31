# FlipID

FlipID maps numbers, byte strings and short text to fixed-length, unguessable-looking IDs, and back again.

```typescript
import { FlipID } from 'flipid';

const ids = FlipID.number({ key: 'my-app-key', bytes: 4 });

ids.encode(123456);      // 'B9P2V83A'
ids.decode('B9P2V83A');  // 123456
ids.decode('nonsense');  // null
```

## This is NOT Encryption

FlipID is an ID encoder, not a cryptographic library.

- Does NOT provide security or confidentiality
- Anyone with the key can decode; anyone determined can likely reverse-engineer
- The transformation is a keyed byte shuffle, not a cipher

**Use it for:** hiding sequential database IDs in URLs (`/users/1` → `/users/B9P2V83A`), making IDs non-enumerable for casual observers, invite codes, short links.

**Do NOT use it for:** protecting sensitive data, authentication tokens, or anything that needs real security.

## Installation

```bash
npm install flipid
# or
bun add flipid
```

## Choosing a shape

Pick the factory that matches the value you hold. Each one gives you an object with `encode`, `decode` and `length`.

```typescript
FlipID.number({ key, bytes: 4 })              // number, up to 6 bytes
FlipID.bigint({ key, bytes: 8 })              // bigint, any width
FlipID.bytes ({ key, size: 16 })              // Uint8Array of exactly 16 bytes
FlipID.text  ({ key, size: 8 })               // UTF-8 string of up to 8 bytes
```

`number` is capped at 6 bytes because that is the widest value that always fits in a JavaScript `number`. For anything wider, use `bigint`.

Negative numbers need `signed: true`, which halves the positive range:

```typescript
const ids = FlipID.number({ key, bytes: 4, signed: true });
ids.encode(-1);  // '5E0TVAX2'
ids.decode('5E0TVAX2');  // -1
```

## Length

Every ID an instance writes is exactly `ids.length` characters. The length depends on the width and the alphabet, never on the value.

| bytes | max value (unsigned) | Crockford | base58 | base64url |
|-------|----------------------|-----------|--------|-----------|
| 1  | 255                 | 4  | 3  | 3  |
| 2  | 65,535              | 5  | 5  | 4  |
| 3  | 16,777,215          | 7  | 6  | 6  |
| 4  | 4,294,967,295       | 8  | 7  | 7  |
| 5  | 1,099,511,627,775   | 10 | 9  | 8  |
| 6  | 281,474,976,710,655 | 12 | 10 | 10 |
| 8  | 2⁶⁴-1               | 15 | 13 | 12 |
| 16 | 2¹²⁸-1 (a UUID)     | 28 | 24 | 23 |

The table assumes the default `check: 1`. Each extra check byte adds about 1.6 Crockford characters.

Pick the width from the largest value you will ever store, and keep it. Changing `key`, `bytes`, `check` or the codec changes every ID.

## Invalid IDs

`decode` returns `null` rather than throwing. Anything the instance did not write — a typo, an ID from another key, a string of the wrong length — comes back as `null`.

```typescript
const id = req.params.id;
const userId = ids.decode(id);
if (userId === null) {
  return notFound();
}
```

Detection is probabilistic. Each check byte lets `decode` reject 255 of every 256 strings that reach it; the rest decode to an arbitrary value of the right shape.

| check | strings rejected | length at `bytes: 4` |
|-------|------------------|---------------------|
| 0 | none — every string of the right length decodes | 7 |
| 1 (default) | ~255 of 256 | 8 |
| 2 | ~65,535 of 65,536 | 10 |
| 3 | all but ~1 in 16.7 million | 12 |
| 4 | all but ~1 in 4.3 billion | 13 |

Use `check: 2` or more when an ID that silently resolves to the wrong record would be a problem.

## Alphabets

The default is Crockford's Base32 (`0-9A-Z` without `I`, `L`, `O`, `U`) read as an RFC 4648 bit-block encoding. Decoding accepts either case, reads `I` and `L` as `1` and `O` as `0`, and ignores hyphens, so an ID read off paper still works:

```typescript
ids.decode('b9p2-v83a');  // 123456
```

Pass `codec` to choose another alphabet — by name, or as a codec from `bufferbase`:

```typescript
FlipID.number({ key, bytes: 4, codec: 'base58' }).encode(123456);     // 'BChDhA1'  — no 0, O, I, l
FlipID.number({ key, bytes: 4, codec: 'base64url' }).encode(123456);  // 'WmwtoGo'  — shortest
FlipID.number({ key, bytes: 4, codec: 'base32hex' }).encode(123456);  // 'B9M2R83A'
```

`Codecs`, `createCodec` and `ICodec` are re-exported from [bufferbase](https://www.npmjs.com/package/bufferbase), so a custom alphabet needs no second import.

## Errors

`FlipIDError` is the only error this package throws, and it carries a `code`:

| code | thrown by | means |
|------|-----------|-------|
| `INVALID_OPTION` | the factories | the instance cannot be built as asked |
| `INVALID_VALUE`  | `encode` | the value is the wrong type, or does not fit the width |

`decode` never throws.

## Determinism

The transformation uses 32-bit integer arithmetic only, so the same key and value give the same ID on every JavaScript engine and every platform. IDs written today stay readable.

## Migrating from 0.5

1.0 is a rewrite. IDs written by 0.5.x cannot be read by 1.0.

| 0.5 | 1.0 |
|-----|-----|
| `new FlipID({ key, blockSize: 4 })` | `FlipID.number({ key, bytes: 4 })` |
| `encodeNumber` / `encodeBigInt` / `encodeString` / `encodeBuffer` | `encode`, on the instance that matches the type |
| `decodeToNumber` / `decodeToBigInt` / `decodeToString` / `decodeToBuffer` | `decode` |
| throws six error classes | returns `null`, or throws `FlipIDError` |
| `signedToUnsigned(-1)` before encoding | `signed: true` |
| `Buffer` | `Uint8Array` |
| `headerSize`, `usePrefixSalt`, `checkSum` | `check` |
| `FlipIDGenerator` and the old error names | removed |

Output length is now genuinely fixed. In 0.5 it varied with the value: about 2.8% of `blockSize: 4` IDs came out a character short.

## License

ISC
