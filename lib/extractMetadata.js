/**
 * lib/extractMetadata.js
 *
 * Core metadata extraction logic. Kept separate from the API route so it can
 * be unit-tested without spinning up a Next.js server.
 *
 * Two layers of metadata are collected:
 *   1. Basic   - format, dimensions, file size, megapixels, aspect ratio.
 *                Derived by parsing the image header bytes (image-size).
 *   2. Embedded - EXIF / GPS / IPTC / XMP / ICC data when present (exifr).
 *                Not all images carry embedded metadata (e.g. most PNGs,
 *                screenshots, or images stripped by social media sites).
 */

const sizeOf = require('image-size');
const exifr = require('exifr');

/** File signatures ("magic bytes") for the formats we accept. */
const SIGNATURES = [
  { format: 'jpeg', bytes: [0xff, 0xd8, 0xff] },
  { format: 'png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { format: 'gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  { format: 'bmp', bytes: [0x42, 0x4d] },
  { format: 'webp', bytes: [0x52, 0x49, 0x46, 0x46], offsetCheck: { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] } },
  { format: 'tiff', bytes: [0x49, 0x49, 0x2a, 0x00] },
  { format: 'tiff', bytes: [0x4d, 0x4d, 0x00, 0x2a] },
  { format: 'avif', offsetCheck: { offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] } },
  { format: 'ico', bytes: [0x00, 0x00, 0x01, 0x00] }
];

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB upload cap

/**
 * Detect the image format from the file's leading bytes.
 * Returns the format name, or null if the buffer doesn't look like a
 * supported image.
 */
function detectFormat(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

  for (const sig of SIGNATURES) {
    let match = true;

    if (sig.bytes) {
      for (let i = 0; i < sig.bytes.length; i++) {
        if (buffer[i] !== sig.bytes[i]) {
          match = false;
          break;
        }
      }
    }

    if (match && sig.offsetCheck) {
      const { offset, bytes } = sig.offsetCheck;
      for (let i = 0; i < bytes.length; i++) {
        if (buffer[offset + i] !== bytes[i]) {
          match = false;
          break;
        }
      }
    }

    if (match) return sig.format;
  }

  return null;
}

/** Format a byte count as a human-readable string. */
function humanFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes;
  let unit = -1;
  do {
    value /= 1024;
    unit += 1;
  } while (value >= 1024 && unit < units.length - 1);
  return `${value.toFixed(1)} ${units[unit]}`;
}

/** Reduce width/height to a simple aspect ratio like "16:9". */
function aspectRatio(width, height) {
  if (!width || !height) return null;
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  const d = gcd(width, height);
  return `${width / d}:${height / d}`;
}

/**
 * Extract everything we can from an image buffer.
 *
 * @param {Buffer} buffer    Raw file bytes.
 * @param {string} filename  Original filename (display only).
 * @returns {Promise<object>} Metadata payload (see docs/API.md).
 * @throws {Error} with .statusCode set, for caller-friendly HTTP mapping.
 */
async function extractMetadata(buffer, filename = 'unknown') {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    const err = new Error('Empty file. Please upload a valid image.');
    err.statusCode = 400;
    throw err;
  }

  if (buffer.length > MAX_FILE_BYTES) {
    const err = new Error(`File too large. Maximum size is ${humanFileSize(MAX_FILE_BYTES)}.`);
    err.statusCode = 413;
    throw err;
  }

  const format = detectFormat(buffer);
  if (!format) {
    const err = new Error(
      'Unsupported or unrecognized file type. Supported formats: JPEG, PNG, GIF, WebP, BMP, TIFF, AVIF, ICO.'
    );
    err.statusCode = 415;
    throw err;
  }

  // --- Basic metadata -----------------------------------------------------
  let dimensions = { width: null, height: null };
  try {
    const d = sizeOf(buffer);
    dimensions = { width: d.width ?? null, height: d.height ?? null };
  } catch {
    // Header parsed as a known format but dimensions unreadable; continue
    // with nulls rather than failing the whole request.
  }

  const basic = {
    filename,
    format: format.toUpperCase(),
    mimeType: format === 'ico' ? 'image/x-icon' : `image/${format}`,
    fileSizeBytes: buffer.length,
    fileSizeHuman: humanFileSize(buffer.length),
    width: dimensions.width,
    height: dimensions.height,
    aspectRatio: aspectRatio(dimensions.width, dimensions.height),
    megapixels:
      dimensions.width && dimensions.height
        ? Number(((dimensions.width * dimensions.height) / 1e6).toFixed(2))
        : null
  };

  // --- Embedded metadata (EXIF / GPS / etc.) ------------------------------
  let embedded = null;
  let gps = null;
  try {
    const parsed = await exifr.parse(buffer, {
      tiff: true,
      ifd0: true,
      exif: true,
      gps: true,
      xmp: true,
      icc: false,
      iptc: true,
      ihdr: false, // PNG header info is already covered by "basic"
      reviveDates: true
    });

    if (parsed && Object.keys(parsed).length > 0) {
      if (parsed.latitude !== undefined && parsed.longitude !== undefined) {
        gps = {
          latitude: parsed.latitude,
          longitude: parsed.longitude,
          altitude: parsed.GPSAltitude ?? null
        };
      }

      embedded = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (value === undefined || value === null) continue;
        if (value instanceof Date) {
          embedded[key] = value.toISOString();
        } else if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
          embedded[key] = `<binary: ${value.length} bytes>`;
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          embedded[key] = JSON.parse(JSON.stringify(value));
        } else {
          embedded[key] = value;
        }
      }
    }
  } catch {
    // Many valid images simply have no EXIF block; that's not an error.
    embedded = null;
  }

  return {
    basic,
    embedded,
    gps,
    hasEmbeddedMetadata: embedded !== null && Object.keys(embedded).length > 0
  };
}

module.exports = {
  extractMetadata,
  detectFormat,
  humanFileSize,
  aspectRatio,
  MAX_FILE_BYTES
};
