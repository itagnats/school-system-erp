/**
 * Symbologies. Pure encoders that turn a string into geometry and know nothing
 * about what the string means — the invoice supplies that (direction.md §13b).
 */
export {
  encodeCode128,
  code128Symbols,
  CODE_128_PATTERNS,
  type Code128Bar,
  type Code128Symbol,
} from "./code128";
