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

/**
 * Shape every error the same way: a short human `error`, a machine-readable
 * `code`, and a longer `detail` the UI can show to explain what went wrong
 * and what to do about it.
 */
function errorResponse(status, code, error, detail) {
  return NextResponse.json({ error, code, detail }, { status });
}

export async function POST(request) {
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse(
      400,
      'INVALID_REQUEST',
      'Expected multipart/form-data with an "image" field.',
      'The request body could not be read as a file upload. If you are using the website, ' +
        'try selecting the image again. If you are calling the API directly, send the image ' +
        'as multipart/form-data under the "image" field.'
    );
  }

  const file = formData.get('image');
  if (!file || typeof file === 'string') {
    return errorResponse(
      400,
      'NO_FILE',
      'No file received. Attach an image under the "image" field.',
      'The request arrived but no image was attached to it. Choose an image file and try again.'
    );
  }

  if (file.size > MAX_FILE_BYTES) {
    return errorResponse(
      413,
      'FILE_TOO_LARGE',
      'File too large. Maximum size is 15 MB.',
      'The image you selected is over the 15 MB limit. Resize or compress it and try again.'
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const metadata = await extractMetadata(buffer, file.name || 'unknown');
    return NextResponse.json(metadata, { status: 200 });
  } catch (err) {
    const status = err.statusCode || 500;
    if (status === 500) {
      return errorResponse(
        500,
        'PARSE_FAILED',
        'Something went wrong while reading the image.',
        'The file looked like a valid image but could not be parsed. It may be corrupted or ' +
          'only partially uploaded. Try re-saving the image or uploading a different one.'
      );
    }
    return errorResponse(status, err.code || 'BAD_IMAGE', err.message, err.detail);
  }
}

export async function GET() {
  return NextResponse.json(
    {
      error: 'Use POST with multipart/form-data. See docs/API.md.',
      code: 'METHOD_NOT_ALLOWED',
      detail: 'This endpoint only accepts POST requests carrying an image file. ' +
        'Send the image as multipart/form-data under the "image" field.',
      example: 'curl -F "image=@photo.jpg" /api/metadata'
    },
    { status: 405 }
  );
}
