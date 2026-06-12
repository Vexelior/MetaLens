/**
 * __tests__/fixtures.js
 *
 * Generates minimal-but-valid image buffers in memory so the test suite
 * doesn't need binary fixture files committed to the repo. Each generator
 * produces enough of the real file structure for header parsing
 * (magic bytes + dimension fields) to succeed.
 */

const zlib = require('zlib');

/** CRC32 (needed for valid PNG chunks). */
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

/** A valid 8-bit grayscale PNG of the given dimensions. */
function makePng(width, height) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // color type: grayscale
  // compression, filter, interlace = 0

  // One filter byte + `width` gray pixels per row.
  const raw = Buffer.alloc(height * (width + 1), 0x80);
  for (let y = 0; y < height; y++) raw[y * (width + 1)] = 0; // filter: none
  const idat = zlib.deflateSync(raw);

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

/** A minimal JPEG: SOI + JFIF APP0 + SOF0 carrying dimensions + EOI. */
function makeJpeg(width, height) {
  const soi = Buffer.from([0xff, 0xd8]);

  const app0 = Buffer.from([
    0xff, 0xe0, 0x00, 0x10, // APP0, length 16
    0x4a, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
    0x01, 0x01, // version 1.1
    0x00, // aspect units
    0x00, 0x01, 0x00, 0x01, // x/y density
    0x00, 0x00 // thumbnail 0x0
  ]);

  const sof0 = Buffer.alloc(19);
  sof0[0] = 0xff;
  sof0[1] = 0xc0; // SOF0
  sof0.writeUInt16BE(17, 2); // segment length
  sof0[4] = 8; // precision
  sof0.writeUInt16BE(height, 5);
  sof0.writeUInt16BE(width, 7);
  sof0[9] = 3; // components
  sof0.set([0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01], 10);

  const eoi = Buffer.from([0xff, 0xd9]);
  return Buffer.concat([soi, app0, sof0, eoi]);
}

/** A minimal GIF89a header with logical screen dimensions. */
function makeGif(width, height) {
  const buf = Buffer.alloc(13);
  buf.write('GIF89a', 0, 'ascii');
  buf.writeUInt16LE(width, 6);
  buf.writeUInt16LE(height, 8);
  return buf;
}

/** A minimal BMP header with dimensions in the DIB header. */
function makeBmp(width, height) {
  const buf = Buffer.alloc(54);
  buf.write('BM', 0, 'ascii');
  buf.writeUInt32LE(54, 2); // file size (header only; fine for parsing)
  buf.writeUInt32LE(54, 10); // pixel data offset
  buf.writeUInt32LE(40, 14); // DIB header size
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22);
  buf.writeUInt16LE(1, 26); // planes
  buf.writeUInt16LE(24, 28); // bpp
  return buf;
}

module.exports = { makePng, makeJpeg, makeGif, makeBmp };
