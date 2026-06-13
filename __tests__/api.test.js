/**
 * __tests__/api.test.js
 *
 * Integration-style tests for the POST /api/metadata route handler.
 * The handler is called directly with standard Request objects (the same
 * objects Next.js passes it in production), so no dev server is required.
 */

const { makePng, makeJpeg } = require('./fixtures');

// next/server's NextResponse.json is a thin wrapper over Response.json;
// mock it so the route can be imported outside a Next.js runtime.
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body, init) => Response.json(body, init)
  }
}));

const { POST, GET } = require('../app/api/metadata/route');

/** Build a multipart Request like the browser would send. */
function makeUploadRequest(buffer, filename, type = 'application/octet-stream') {
  const formData = new FormData();
  formData.append('image', new File([buffer], filename, { type }));
  return new Request('http://localhost/api/metadata', {
    method: 'POST',
    body: formData
  });
}

describe('POST /api/metadata', () => {
  test('returns 200 and metadata for a valid PNG', async () => {
    const res = await POST(makeUploadRequest(makePng(100, 50), 'sample.png', 'image/png'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.basic.format).toBe('PNG');
    expect(body.basic.width).toBe(100);
    expect(body.basic.height).toBe(50);
    expect(body.basic.filename).toBe('sample.png');
  });

  test('returns 200 and metadata for a valid JPEG', async () => {
    const res = await POST(makeUploadRequest(makeJpeg(320, 240), 'photo.jpg', 'image/jpeg'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.basic.format).toBe('JPEG');
    expect(body.basic.aspectRatio).toBe('4:3');
  });

  test('returns 400 with NO_FILE code when no file is attached', async () => {
    const formData = new FormData();
    formData.append('image', 'just a string, not a file');
    const req = new Request('http://localhost/api/metadata', {
      method: 'POST',
      body: formData
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/no file/i);
    expect(body.code).toBe('NO_FILE');
    expect(body.detail).toEqual(expect.any(String));
    expect(body.detail.length).toBeGreaterThan(20);
  });

  test('returns 400 with INVALID_REQUEST code when the body is not multipart', async () => {
    const req = new Request('http://localhost/api/metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hello: 'world' })
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_REQUEST');
    expect(body.detail).toMatch(/multipart/i);
  });

  test('returns 400 with EMPTY_FILE code for a zero-byte upload', async () => {
    const res = await POST(makeUploadRequest(Buffer.alloc(0), 'empty.png', 'image/png'));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.code).toBe('EMPTY_FILE');
    expect(body.error).toMatch(/empty/i);
    expect(body.detail).toMatch(/0 bytes/);
  });

  test('returns 415 for a non-image file', async () => {
    const notAnImage = Buffer.from('PK\u0003\u0004 this is a zip-ish blob, not an image');
    const res = await POST(makeUploadRequest(notAnImage, 'archive.zip', 'application/zip'));
    expect(res.status).toBe(415);

    const body = await res.json();
    expect(body.error).toMatch(/unsupported/i);
    expect(body.code).toBe('UNSUPPORTED_FORMAT');
    expect(body.detail).toMatch(/file name/i);
  });

  test('every error response carries error, code and detail strings', async () => {
    const res = await POST(makeUploadRequest(Buffer.from('not an image'), 'x.txt', 'text/plain'));
    const body = await res.json();

    expect(res.ok).toBe(false);
    for (const field of ['error', 'code', 'detail']) {
      expect(typeof body[field]).toBe('string');
      expect(body[field].length).toBeGreaterThan(0);
    }
  });

  test('GET returns 405 with a code and usage hint', async () => {
    const res = await GET();
    expect(res.status).toBe(405);
    const body = await res.json();
    expect(body.code).toBe('METHOD_NOT_ALLOWED');
    expect(body.example).toContain('curl');
  });
});
