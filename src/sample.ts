import { Buffer } from "node:buffer";
import { encrypt, decrypt } from "./simple-cipher";

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
