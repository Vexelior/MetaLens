/**
 * __tests__/extractMetadata.test.js
 *
 * Unit tests for the core extraction library. Test fixtures are generated
 * in-memory as minimal valid image buffers, so no binary files need to be
 * committed to the repo.
 */

const {
  extractMetadata,
  detectFormat,
  humanFileSize,
  aspectRatio,
  MAX_FILE_BYTES
} = require('../lib/extractMetadata');

const { makePng, makeJpeg, makeGif, makeBmp } = require('./fixtures');

describe('detectFormat', () => {
  test('detects PNG', () => {
    expect(detectFormat(makePng(10, 10))).toBe('png');
  });

  test('detects JPEG', () => {
    expect(detectFormat(makeJpeg(8, 8))).toBe('jpeg');
  });

  test('detects GIF', () => {
    expect(detectFormat(makeGif(4, 4))).toBe('gif');
  });

  test('detects BMP', () => {
    expect(detectFormat(makeBmp(6, 6))).toBe('bmp');
  });

  test('returns null for non-image data', () => {
    expect(detectFormat(Buffer.from('hello world, this is not an image'))).toBeNull();
  });

  test('returns null for short buffers', () => {
    expect(detectFormat(Buffer.from([0x89, 0x50]))).toBeNull();
  });

  test('returns null for non-buffer input', () => {
    expect(detectFormat('not a buffer')).toBeNull();
    expect(detectFormat(null)).toBeNull();
  });
});

describe('humanFileSize', () => {
  test('formats bytes', () => {
    expect(humanFileSize(512)).toBe('512 B');
  });

  test('formats kilobytes', () => {
    expect(humanFileSize(2048)).toBe('2.0 KB');
  });

  test('formats megabytes', () => {
    expect(humanFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});

describe('aspectRatio', () => {
  test('reduces 1920x1080 to 16:9', () => {
    expect(aspectRatio(1920, 1080)).toBe('16:9');
  });

  test('handles square images', () => {
    expect(aspectRatio(500, 500)).toBe('1:1');
  });

  test('returns null when dimensions are missing', () => {
    expect(aspectRatio(null, 100)).toBeNull();
    expect(aspectRatio(100, 0)).toBeNull();
  });
});

describe('extractMetadata', () => {
  test('extracts basic metadata from a PNG', async () => {
    const buf = makePng(120, 80);
    const result = await extractMetadata(buf, 'test.png');

    expect(result.basic.format).toBe('PNG');
    expect(result.basic.mimeType).toBe('image/png');
    expect(result.basic.filename).toBe('test.png');
    expect(result.basic.width).toBe(120);
    expect(result.basic.height).toBe(80);
    expect(result.basic.aspectRatio).toBe('3:2');
    expect(result.basic.fileSizeBytes).toBe(buf.length);
  });

  test('extracts basic metadata from a JPEG', async () => {
    const result = await extractMetadata(makeJpeg(64, 48), 'photo.jpg');

    expect(result.basic.format).toBe('JPEG');
    expect(result.basic.mimeType).toBe('image/jpeg');
    expect(result.basic.width).toBe(64);
    expect(result.basic.height).toBe(48);
  });

  test('extracts basic metadata from a GIF', async () => {
    const result = await extractMetadata(makeGif(16, 16), 'anim.gif');

    expect(result.basic.format).toBe('GIF');
    expect(result.basic.width).toBe(16);
    expect(result.basic.height).toBe(16);
    expect(result.basic.aspectRatio).toBe('1:1');
  });

  test('reports no embedded metadata for a bare PNG', async () => {
    const result = await extractMetadata(makePng(10, 10), 'bare.png');
    expect(result.hasEmbeddedMetadata).toBe(false);
    expect(result.gps).toBeNull();
  });

  test('computes megapixels', async () => {
    const result = await extractMetadata(makePng(2000, 1500), 'big.png');
    expect(result.basic.megapixels).toBe(3);
  });

  test('rejects empty buffers with status 400', async () => {
    await expect(extractMetadata(Buffer.alloc(0), 'empty.png')).rejects.toMatchObject({
      statusCode: 400
    });
  });

  test('rejects non-image files with status 415', async () => {
    const fake = Buffer.from('%PDF-1.4 definitely not an image '.repeat(4));
    await expect(extractMetadata(fake, 'doc.pdf')).rejects.toMatchObject({
      statusCode: 415
    });
  });

  test('rejects oversized files with status 413', async () => {
    const huge = Buffer.alloc(MAX_FILE_BYTES + 1, 0x89);
    await expect(extractMetadata(huge, 'huge.png')).rejects.toMatchObject({
      statusCode: 413
    });
  });

  test('defaults filename to "unknown"', async () => {
    const result = await extractMetadata(makePng(5, 5));
    expect(result.basic.filename).toBe('unknown');
  });
});
