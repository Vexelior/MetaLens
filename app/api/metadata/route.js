/**
 * app/api/metadata/route.js
 *
 * POST /api/metadata
 * Accepts multipart/form-data with a single "image" field and returns the
 * image's metadata as JSON. See docs/API.md for the full contract.
 */

import { NextResponse } from 'next/server';

const { extractMetadata, MAX_FILE_BYTES } = require('../../../lib/extractMetadata');

// Run on the Node.js runtime (Buffer + exifr need it; Edge runtime won't do).
export const runtime = 'nodejs';

export async function POST(request) {
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: 'Expected multipart/form-data with an "image" field.' },
      { status: 400 }
    );
  }

  const file = formData.get('image');
  if (!file || typeof file === 'string') {
    return NextResponse.json(
      { error: 'No file received. Attach an image under the "image" field.' },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: 'File too large. Maximum size is 15 MB.' },
      { status: 413 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const metadata = await extractMetadata(buffer, file.name || 'unknown');
    return NextResponse.json(metadata, { status: 200 });
  } catch (err) {
    const status = err.statusCode || 500;
    const message =
      status === 500 ? 'Something went wrong while reading the image.' : err.message;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET() {
  return NextResponse.json(
    {
      error: 'Use POST with multipart/form-data. See docs/API.md.',
      example: 'curl -F "image=@photo.jpg" /api/metadata'
    },
    { status: 405 }
  );
}
