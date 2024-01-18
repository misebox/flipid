function xor(buffer, key) {
  let result = Buffer.alloc(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    result[i] = buffer[i] ^ key[i % key.length];
  }
  return result;
}

function createPrng(seed) {
  return function () {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };
}

function shuffle(buffer, seed) {
  let result = Buffer.from(buffer);
  let prng = createPrng(seed);

  for (let i = result.length - 1; i > 0; i--) {
    let j = Math.floor(prng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function unshuffle(shuffled, seed) {
  let result = Buffer.from(shuffled);
  let prng = createPrng(seed);
  let indices = [];

  for (let i = result.length - 1; i > 0; i--) {
    indices[i] = Math.floor(prng() * (i + 1));
  }

  for (let i = 1; i < result.length; i++) {
    let j = indices[i];
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function encrypt(block, key, seed) {
  if (block.length !== 4 || key.length !== 4) {
    throw new Error("Block and key must be 4 bytes long.");
  }
  let xorWithKey = xor(block, key);
  let xorWithSeed = xor(xorWithKey, Buffer.from([seed, seed, seed, seed]));
  return Buffer.concat([shuffle(xorWithSeed, seed), Buffer.from([seed])]);
}

function decrypt(encrypted, key) {
  const seed = encrypted[encrypted.length - 1];
  const block = encrypted.slice(0, encrypted.length - 1);
  let shuffledBack = unshuffle(block, seed); // Reverse shuffle
  let xorWithSeed = xor(shuffledBack, Buffer.from([seed, seed, seed, seed]));
  return xor(xorWithSeed, key);
}

// Example usage
const key = Buffer.from("CRID");
//const block = Buffer.from([0x00, 0x00, 0x00, 0x01]); // 4-byte block
// const seed = 0x5A; // Example seed (1 byte)

// const encrypted = encrypt(block, key, seed);
// const decrypted = decrypt(encrypted, key);

console.log("Key:", key.toString("hex"));
// console.log("Seed:", seed.toString(16));
// console.log("Original Block:", block.toString('hex'));
// console.log("Encrypted Block:", encrypted.toString('hex'));
// console.log("Decrypted Block:", decrypted.toString('hex'));

let seed = 0;
for (let v of [1, 2, 3, 10, 11, 100, 101, 1000, 123456, 123456789]) {
  let hex = ("00000000" + v.toString(16)).slice(-8);
  const block = Buffer.from(hex, "hex");
  const encrypted = encrypt(block, key, seed);
  const decrypted = decrypt(encrypted, key);

  console.log(
    block.toString("hex"),
    encrypted.toString("hex"),
    decrypted.toString("hex")
  );
  seed++;
}
