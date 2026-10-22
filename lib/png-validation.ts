import { inflateSync } from "node:zlib";

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const MAX_DIMENSION = 4096;
const MAX_PIXELS = 10_000_000;
const MAX_DECOMPRESSED_BYTES = 96 * 1024 * 1024;
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
    table[index] = value >>> 0;
  }
  return table;
})();

export type PngImageInfo = { width: number; height: number };

function readUint32(bytes: Uint8Array, offset: number) {
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

function crc32(type: Uint8Array, data: Uint8Array) {
  let value = 0xffffffff;
  for (const byte of type) value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  for (const byte of data) value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function bytesPerPixel(bitDepth: number, colorType: number) {
  const samples = colorType === 0 || colorType === 3 ? 1 : colorType === 2 ? 3 : colorType === 4 ? 2 : 4;
  return (samples * bitDepth) / 8;
}

function scanlineBytes(width: number, bitDepth: number, colorType: number) {
  return Math.ceil(width * bytesPerPixel(bitDepth, colorType));
}

function passLength(width: number, height: number, xStart: number, yStart: number, xStep: number, yStep: number, bitDepth: number, colorType: number) {
  const passWidth = width <= xStart ? 0 : Math.ceil((width - xStart) / xStep);
  const passHeight = height <= yStart ? 0 : Math.ceil((height - yStart) / yStep);
  return passWidth && passHeight ? passHeight * (scanlineBytes(passWidth, bitDepth, colorType) + 1) : 0;
}

function expectedPixelBytes(width: number, height: number, bitDepth: number, colorType: number, interlace: number) {
  if (interlace === 0) return height * (scanlineBytes(width, bitDepth, colorType) + 1);

  return (
    passLength(width, height, 0, 0, 8, 8, bitDepth, colorType) +
    passLength(width, height, 4, 0, 8, 8, bitDepth, colorType) +
    passLength(width, height, 0, 4, 4, 8, bitDepth, colorType) +
    passLength(width, height, 2, 0, 4, 4, bitDepth, colorType) +
    passLength(width, height, 0, 2, 2, 4, bitDepth, colorType) +
    passLength(width, height, 1, 0, 2, 2, bitDepth, colorType) +
    passLength(width, height, 0, 1, 1, 2, bitDepth, colorType)
  );
}

function hasValidFilters(data: Uint8Array, width: number, height: number, bitDepth: number, colorType: number, interlace: number) {
  const passes = interlace === 0
    ? [[0, 0, 1, 1]]
    : [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]];
  let offset = 0;

  for (const [xStart, yStart, xStep, yStep] of passes) {
    const passWidth = width <= xStart ? 0 : Math.ceil((width - xStart) / xStep);
    const passHeight = height <= yStart ? 0 : Math.ceil((height - yStart) / yStep);
    const rowLength = scanlineBytes(passWidth, bitDepth, colorType);
    for (let row = 0; row < passHeight; row += 1) {
      if (data[offset] > 4) return false;
      offset += rowLength + 1;
    }
  }

  return offset === data.length;
}

/** Validates a PNG's structure, dimensions, checksums, and compressed pixel payload. */
export function validateUpmanPngBytes(bytes: Uint8Array): PngImageInfo | null {
  if (bytes.length < PNG_SIGNATURE.length || !PNG_SIGNATURE.every((value, index) => bytes[index] === value)) return null;

  let offset = PNG_SIGNATURE.length;
  let width = 0;
  let height = 0;
  let sawHeader = false;
  let sawImageData = false;
  let sawEnd = false;
  const compressedParts: Buffer[] = [];
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;

  while (offset + 12 <= bytes.length && !sawEnd) {
    const length = readUint32(bytes, offset);
    const typeOffset = offset + 4;
    const dataOffset = typeOffset + 4;
    const endOffset = dataOffset + length;
    if (endOffset + 4 > bytes.length) return null;

    const type = bytes.subarray(typeOffset, dataOffset);
    const data = bytes.subarray(dataOffset, endOffset);
    if (crc32(type, data) !== readUint32(bytes, endOffset)) return null;

    const typeName = String.fromCharCode(...type);
    if (!sawHeader) {
      if (typeName !== "IHDR" || length !== 13) return null;
      width = readUint32(data, 0);
      height = readUint32(data, 4);
      bitDepth = data[8];
      colorType = data[9];
      const compression = data[10];
      const filter = data[11];
      interlace = data[12];
      const validColorDepth = (
        (colorType === 0 && [1, 2, 4, 8, 16].includes(bitDepth)) ||
        (colorType === 2 && [8, 16].includes(bitDepth)) ||
        (colorType === 3 && [1, 2, 4, 8].includes(bitDepth)) ||
        (colorType === 4 && [8, 16].includes(bitDepth)) ||
        (colorType === 6 && [8, 16].includes(bitDepth))
      );
      if (!width || !height || width > MAX_DIMENSION || height > MAX_DIMENSION || width * height > MAX_PIXELS || !validColorDepth || compression !== 0 || filter !== 0 || (interlace !== 0 && interlace !== 1)) return null;
      sawHeader = true;
    } else if (typeName === "IDAT") {
      if (!length) return null;
      sawImageData = true;
      compressedParts.push(Buffer.from(data));
    } else if (typeName === "IEND") {
      if (length !== 0 || !sawImageData) return null;
      sawEnd = true;
    }

    offset = endOffset + 4;
  }

  if (!sawHeader || !sawImageData || !sawEnd || offset !== bytes.length) return null;

  try {
    const expectedLength = expectedPixelBytes(width, height, bitDepth, colorType, interlace);
    if (!expectedLength || expectedLength > MAX_DECOMPRESSED_BYTES) return null;
    const pixelData = inflateSync(Buffer.concat(compressedParts), { maxOutputLength: expectedLength });
    if (pixelData.length !== expectedLength || !hasValidFilters(pixelData, width, height, bitDepth, colorType, interlace)) return null;
  } catch {
    return null;
  }

  return { width, height };
}
