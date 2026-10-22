import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import test from "node:test";

import { validateUpmanPngBytes } from "./png-validation";

const encoder = new TextEncoder();

function crc32(bytes: Uint8Array) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit += 1) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array) {
  const typeBytes = encoder.encode(type);
  const result = new Uint8Array(data.length + 12);
  new DataView(result.buffer).setUint32(0, data.length);
  result.set(typeBytes, 4);
  result.set(data, 8);
  const checksum = new Uint8Array(typeBytes.length + data.length);
  checksum.set(typeBytes);
  checksum.set(data, typeBytes.length);
  new DataView(result.buffer).setUint32(data.length + 8, crc32(checksum));
  return result;
}

function png(width = 1, height = 1, compressedData?: Uint8Array) {
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header.set([8, 6, 0, 0, 0], 8);
  const pixels = new Uint8Array(height * (1 + width * 4));
  const parts = [
    Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", compressedData ?? deflateSync(pixels)),
    chunk("IEND", new Uint8Array()),
  ];
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
}

test("accepts a structurally valid PNG", () => {
  assert.deepEqual(validateUpmanPngBytes(png(2, 3)), { width: 2, height: 3 });
});

test("rejects corrupt PNG data and excessive dimensions", () => {
  const corrupt = png();
  corrupt[corrupt.length - 1] ^= 1;
  assert.equal(validateUpmanPngBytes(corrupt), null);
  assert.equal(validateUpmanPngBytes(png(4096, 4096)), null);
  assert.equal(validateUpmanPngBytes(png(1, 1, Uint8Array.from([1, 2, 3, 4]))), null);
});
