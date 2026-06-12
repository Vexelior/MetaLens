# How-To Guide

Everything you need to run, test, modify, and deploy the Image Metadata Inspector for free.

---

## 1. Prerequisites

- **Node.js 18.17 or newer** (check with `node --version`)
- npm (ships with Node)
- A free [GitHub](https://github.com) account if you want one-click deploys

---

## 2. Run it locally

```bash
# from the project root
npm install
npm run dev
```

Open http://localhost:3000. The frontend and backend run from the same dev server; the API lives at http://localhost:3000/api/metadata.

To run the production build locally:

```bash
npm run build
npm start
```

---

## 3. Run the tests

```bash
npm test               # full suite (28 tests)
npm run test:watch     # re-run on file changes
npm run test:coverage  # with a coverage report
```

What's covered:

- **`__tests__/extractMetadata.test.js`** — unit tests for format detection (magic bytes), file size formatting, aspect ratio math, dimension extraction across PNG/JPEG/GIF/BMP, and every error path (empty file, oversized file, non-image file).
- **`__tests__/api.test.js`** — integration tests that call the actual `POST /api/metadata` handler with real `Request`/`FormData` objects, asserting status codes and response bodies for success and failure cases.
- **`__tests__/fixtures.js`** — generates minimal valid image files in memory (including a spec-correct PNG with proper CRC32 chunks), so no binary fixtures are committed to git.

---

## 4. Deploy for free on Vercel (recommended)

Vercel's free Hobby tier includes serverless functions, HTTPS, and a `*.vercel.app` domain. Because the backend is a Next.js route handler, frontend and backend deploy together as one project; there's nothing to configure separately.

### Option A: deploy from GitHub (easiest)

1. Push this project to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Image metadata inspector"
   git remote add origin https://github.com/YOUR_USERNAME/image-metadata-app.git
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com), sign in with GitHub, and click **Add New → Project**.
3. Import the repository. Vercel auto-detects Next.js; leave every setting at its default.
4. Click **Deploy**. About a minute later you'll have a live URL like `https://image-metadata-app.vercel.app`.

Every future `git push` to `main` redeploys automatically.

### Option B: deploy from the command line

```bash
npm install -g vercel
vercel          # first run: links the project, deploys a preview
vercel --prod   # deploys to production
```

### Vercel free-tier notes

- Serverless function request bodies are capped around 4.5 MB on the Hobby tier. The app's own limit is 15 MB, so very large uploads may be rejected by the platform before reaching the app. If you need bigger uploads, lower the in-app cap in `lib/extractMetadata.js` to match, or upgrade the plan.
- No environment variables or databases are needed; the app is stateless.

---

## 5. Free alternatives to Vercel

### Netlify

1. Push to GitHub (same as above).
2. On [netlify.com](https://netlify.com): **Add new site → Import an existing project**.
3. Netlify detects Next.js via its official runtime; accept the defaults and deploy.

### Render

1. On [render.com](https://render.com): **New → Web Service**, connect the repo.
2. Build command: `npm install && npm run build` · Start command: `npm start`.
3. Pick the **Free** instance type. Note: free Render services sleep after inactivity and take ~30 seconds to wake.

---

## 6. Common modifications

**Change the upload size limit** — edit `MAX_FILE_BYTES` in `lib/extractMetadata.js`. The error message updates itself.

**Add a new image format** — add a magic-byte signature to the `SIGNATURES` array in `lib/extractMetadata.js`, then add a fixture generator and a test in `__tests__/`.

**Return ICC color profile data** — in `lib/extractMetadata.js`, flip `icc: false` to `icc: true` in the `exifr.parse` options.

**Restyle the UI** — the page uses stock Bootstrap 5 classes in `app/page.js`; the few custom touches live in `app/globals.css`. Swap the Bootswatch theme by replacing the Bootstrap import in `app/layout.js`.

**Use the API from another app** — it's a plain HTTP endpoint; see `docs/API.md` for curl, fetch, and Python examples. If you'll call it cross-origin, add CORS headers in `app/api/metadata/route.js`.

---

## 7. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `npm run dev` fails with a Node version error | Upgrade to Node 18.17+ |
| API returns 415 for a file you know is an image | The file's bytes don't match a supported format; HEIC (default iPhone format) is not supported — convert to JPEG first |
| Upload fails on Vercel but works locally | Platform body-size limit (see section 4 notes) |
| `embedded` is always null | Normal for PNGs, screenshots, and anything that passed through WhatsApp/Instagram/etc., which strip EXIF |
| Tests fail after editing `lib/extractMetadata.js` | Run `npm test` to see which contract broke; the tests document expected behavior |
