# API Reference

The backend exposes a single endpoint. It runs as a Next.js route handler on the Node.js runtime, which on Vercel/Netlify deploys as a serverless function.

---

## POST `/api/metadata`

Extracts metadata from an uploaded image.

### Request

- **Content-Type:** `multipart/form-data`
- **Field:** `image` — the image file
- **Max size:** 15 MB
- **Supported formats:** JPEG, PNG, GIF, WebP, BMP, TIFF, AVIF, ICO

Format is detected from the file's leading bytes (magic numbers), not its extension or declared MIME type.

```bash
curl -F "image=@photo.jpg" https://your-app.vercel.app/api/metadata
```

```javascript
// Browser / fetch
const formData = new FormData();
formData.append('image', fileInput.files[0]);
const res = await fetch('/api/metadata', { method: 'POST', body: formData });
const metadata = await res.json();
```

```python
# Python / requests
import requests
with open("photo.jpg", "rb") as f:
    r = requests.post("https://your-app.vercel.app/api/metadata", files={"image": f})
print(r.json())
```

### Success response — `200 OK`

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
  "embedded": {
    "Make": "Apple",
    "Model": "iPhone 15 Pro",
    "ISO": 64,
    "FNumber": 1.8,
    "ExposureTime": 0.008,
    "DateTimeOriginal": "2026-05-20T14:32:11.000Z"
  },
  "gps": {
    "latitude": 49.2827,
    "longitude": -123.1207,
    "altitude": 70.2
  },
  "hasEmbeddedMetadata": true
}
```

### Field reference

| Field | Type | Notes |
|---|---|---|
| `basic.filename` | string | Original filename as uploaded (display only, never trusted) |
| `basic.format` | string | Detected format in uppercase, e.g. `"PNG"` |
| `basic.mimeType` | string | Canonical MIME type for the detected format |
| `basic.fileSizeBytes` | number | Exact byte count |
| `basic.fileSizeHuman` | string | e.g. `"2.0 MB"` |
| `basic.width` / `basic.height` | number \| null | Pixel dimensions; null if the header was unreadable |
| `basic.aspectRatio` | string \| null | Reduced ratio, e.g. `"16:9"` |
| `basic.megapixels` | number \| null | `(width × height) / 1,000,000`, 2 decimals |
| `embedded` | object \| null | Flat key/value map of EXIF/XMP/IPTC tags; null when none exist |
| `gps` | object \| null | Decimal degrees; null when no GPS data is present |
| `hasEmbeddedMetadata` | boolean | Convenience flag for UI logic |

Notes on `embedded`:

- Dates are serialized as ISO 8601 strings.
- Binary tag values are replaced with `"<binary: N bytes>"` placeholders.
- The exact set of keys depends entirely on what the image contains. PNGs, screenshots, and images passed through social media usually have nothing.

### Error responses

All errors return JSON with a single `error` string.

| Status | Meaning | Example message |
|---|---|---|
| `400` | No file attached, empty file, or body wasn't multipart | `"No file received. Attach an image under the \"image\" field."` |
| `405` | Wrong method (e.g. GET) | Includes a curl usage example |
| `413` | File exceeds 15 MB | `"File too large. Maximum size is 15 MB."` |
| `415` | Not a recognized image format | `"Unsupported or unrecognized file type. ..."` |
| `500` | Unexpected parsing failure | `"Something went wrong while reading the image."` |

---

## GET `/api/metadata`

Returns `405` with a usage hint. Exists so people poking at the endpoint in a browser get pointed in the right direction instead of a blank error.
