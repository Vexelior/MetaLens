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

  test('returns 400 when no file is attached', async () => {
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
  });

  test('returns 400 when the body is not multipart', async () => {
    const req = new Request('http://localhost/api/metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hello: 'world' })
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('returns 415 for a non-image file', async () => {
    const notAnImage = Buffer.from('PK\u0003\u0004 this is a zip-ish blob, not an image');
    const res = await POST(makeUploadRequest(notAnImage, 'archive.zip', 'application/zip'));
    expect(res.status).toBe(415);

    const body = await res.json();
    expect(body.error).toMatch(/unsupported/i);
  });

  test('GET returns 405 with usage hint', async () => {
    const res = await GET();
    expect(res.status).toBe(405);
    const body = await res.json();
    expect(body.example).toContain('curl');
  });
});
