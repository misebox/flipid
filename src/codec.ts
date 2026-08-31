import {
  Bases,
  Codecs,
  createCodec,
  getCodec,
  type BaseName,
  type CodecSpec,
  type ICodec,
} from "bufferbase";
import { invalidOption } from "./errors.js";

const crockford = Bases.base32crockford;

/**
 * The default codec: Crockford's alphabet read as an RFC 4648 bit-block
 * encoding.
 *
 * The alphabet leaves out I, L, O and U, so a written-down ID reads back
 * unambiguously; the block algorithm makes the output length depend only on
 * the block size, never on the value. Decoding accepts either case, reads
 * `I`/`L` as `1` and `O` as `0`, and ignores hyphens.
 */
export const defaultCodec: ICodec = createCodec({
  alphabet: crockford.alphabet,
  caseInsensitive: crockford.caseInsensitive,
  aliases: crockford.aliases,
  ignore: crockford.ignore,
  algorithm: "block",
  pad: false,
});

/** Anything accepted where a codec is expected. */
export type CodecSource = ICodec | BaseName | CodecSpec;

export const resolveCodec = (source: CodecSource): ICodec => {
  if (typeof source === "string") {
    const codec: ICodec | undefined = Codecs[source];
    if (codec === undefined) {
      throw invalidOption(`unknown base: ${source}`);
    }
    return codec;
  }
  return "encode" in source ? source : getCodec(source);
};
