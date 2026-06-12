# Image Metadata Inspector

A small full-stack web app: upload any common image format and get its metadata back. Built with **React** (frontend), **Next.js API routes** (backend), and **Bootstrap 5** (styling). Deployable for free on Vercel in about two minutes.

![Stack](https://img.shields.io/badge/Next.js-14-black) ![React](https://img.shields.io/badge/React-18-blue) ![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-purple) ![Tests](https://img.shields.io/badge/tests-28%20passing-brightgreen)

## What it does

- Drag and drop (or browse for) an image: JPEG, PNG, GIF, WebP, BMP, TIFF, AVIF, or ICO
- Returns **basic metadata**: format, MIME type, file size, dimensions, aspect ratio, megapixels
- Returns **embedded metadata** when present: EXIF (camera, lens, exposure), GPS coordinates with a map link, XMP, IPTC
- Validates files by **magic bytes**, not file extension, so a renamed `.exe` won't sneak through
- Processes everything in memory; **no files are ever written to disk or stored**

## Project structure

```
image-metadata-app/
├── app/
│   ├── api/metadata/route.js   # Backend: POST /api/metadata handler
│   ├── layout.js               # Root layout (loads Bootstrap)
│   ├── page.js                 # Frontend: upload UI + results display
│   └── globals.css             # Light custom styles on top of Bootstrap
├── lib/
│   └── extractMetadata.js      # Core extraction logic (unit-testable)
├── __tests__/
│   ├── extractMetadata.test.js # Unit tests for the library
│   ├── api.test.js             # Integration tests for the API route
│   └── fixtures.js             # In-memory image fixture generators
├── docs/
│   ├── API.md                  # Full API reference
│   └── HOWTO.md                # Setup, testing, and free deployment guide
├── jest.config.js
├── next.config.js
└── package.json
```

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

```bash
npm test           # run the 28-test suite
npm run build      # production build
npm start          # serve the production build
```

## Try the API directly

```bash
curl -F "image=@photo.jpg" http://localhost:3000/api/metadata
```

Example response:

```json
{
  "basic": {
    "filename": "photo.jpg",
    "format": "JPEG",
    "mimeType": "image/jpeg",
    "fileSizeBytes": 2048576,
    "fileSizeHuman": "2.0 MB",
    "width": 4032,
    "height": 3024,
    "aspectRatio": "4:3",
    "megapixels": 12.19
  },
  "embedded": { "Make": "Apple", "Model": "iPhone 15", "ISO": 64, "...": "..." },
  "gps": { "latitude": 49.2827, "longitude": -123.1207, "altitude": 70 },
  "hasEmbeddedMetadata": true
}
```

Full contract, error codes, and more examples: [docs/API.md](docs/API.md).

## Deploying for free

The app is a single Next.js project, so the frontend and backend deploy together. The fastest free option is **Vercel** (made by the Next.js team; the free Hobby tier comfortably covers this app). Netlify and Render also work.

Step-by-step instructions: [docs/HOWTO.md](docs/HOWTO.md).

## Tech notes

| Concern | Choice | Why |
|---|---|---|
| Format detection | Magic bytes (`lib/extractMetadata.js`) | Extensions and MIME headers are user-controlled and unreliable |
| Dimensions | [`image-size`](https://www.npmjs.com/package/image-size) | Pure JS, tiny, reads only the header |
| EXIF/GPS/XMP | [`exifr`](https://www.npmjs.com/package/exifr) | Fast, pure JS, works in serverless functions (no native binaries) |
| Upload limit | 15 MB | Stays inside free-tier serverless body limits |
| Runtime | Node.js (not Edge) | `Buffer` and exifr need the Node runtime |

## Privacy

Images are parsed in memory inside the request handler and garbage-collected when the response is sent. Nothing is logged, stored, or sent to third parties. Worth knowing as a user of any metadata tool: EXIF data can contain your GPS location; this app surfaces that so you can see what your images reveal before sharing them.

## License

MIT. Use it, fork it, ship it.
