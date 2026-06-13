'use client';

/**
 * app/page.js
 *
 * Frontend: pick or drag-and-drop an image, POST it to /api/metadata, and
 * render the result in Bootstrap cards/tables.
 */

import { useCallback, useRef, useState } from 'react';

const ACCEPTED = 'image/jpeg,image/png,image/gif,image/webp,image/bmp,image/tiff,image/avif,image/x-icon';

export default function HomePage() {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const inputRef = useRef(null);

  const openPicker = useCallback(() => inputRef.current?.click(), []);

  const handleFile = useCallback(async (file) => {
    if (!file) return;

    setError(null);
    setResult(null);
    setLoading(true);

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/metadata', { method: 'POST', body: formData });

      // The body is usually our JSON error contract, but a platform-level
      // failure (e.g. the host rejecting an oversized upload) can return an
      // HTML page instead, so parsing may fail.
      let data = null;
      try {
        data = await res.json();
      } catch {
        /* non-JSON response handled below via the status code */
      }

      if (res.ok && data) {
        setResult(data);
      } else if (data?.error) {
        setError({ title: data.error, detail: data.detail });
      } else {
        setError(describeHttpError(res.status));
      }
    } catch {
      setError({
        title: 'Could not reach the server.',
        detail:
          'The request never completed. Check your internet connection and try again. ' +
          'If the problem persists, the service may be temporarily unavailable.'
      });
    } finally {
      setLoading(false);
    }
  }, [previewUrl]);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      handleFile(e.dataTransfer.files?.[0]);
    },
    [handleFile]
  );

  return (
    <>
      {/* Navbar */}
      <nav className="ml-nav sticky-top">
        <div className="container d-flex align-items-center justify-content-between py-3">
          <a href="#" className="ml-brand">
            <img src="/favicon.svg" alt="MetaLens logo" className="ml-logo" /> MetaLens
          </a>
          <div className="d-flex align-items-center gap-4">
            <a href="#how" className="ml-nav-link d-none d-sm-inline">How it works</a>
            <a href="#why" className="ml-nav-link d-none d-sm-inline">Why MetaLens</a>
            <button className="btn btn-brand btn-sm" onClick={openPicker}>
              Inspect an image
            </button>
          </div>
        </div>
      </nav>

      {/* Hero + upload */}
      <section className="ml-hero">
        <div className="container py-5">
          <div className="text-center mx-auto" style={{ maxWidth: 760 }}>
            <span className="ml-eyebrow mb-3">🔒 Private · processed in memory · never stored</span>
            <h1 className="ml-title mb-3">
              The trusted way to inspect <span className="ml-accent">image metadata</span>
            </h1>
            <p className="ml-subtitle mb-4">
              Drop in any photo to reveal its format, dimensions, EXIF camera details,
              GPS location and more instantly, right in your browser session.
            </p>
          </div>

          {/* Upload zone — front and center */}
          <div className="mx-auto" style={{ maxWidth: 620 }}>
            <div
              className={`drop-zone p-5 text-center ${dragging ? 'dragging' : ''}`}
              role="button"
              tabIndex={0}
              aria-label="Upload an image"
              onClick={openPicker}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openPicker()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <div className="drop-icon" aria-hidden="true">🖼️</div>
              <p className="fw-semibold fs-5 mb-1">Drag an image here, or click to browse</p>
              <p className="text-secondary small mb-3">
                JPEG, PNG, GIF, WebP, BMP, TIFF, AVIF or ICO · up to 15 MB
              </p>
              <span className="btn btn-brand">Choose image</span>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED}
                className="d-none"
                onChange={(e) => handleFile(e.target.files?.[0])}
                data-testid="file-input"
              />
            </div>
          </div>

          {loading && (
            <div className="text-center my-4" role="status">
              <div className="spinner-border text-primary" aria-hidden="true" />
              <p className="text-secondary mt-2 mb-0">Reading metadata…</p>
            </div>
          )}

          {error && (
            <div className="alert alert-danger mt-4 mx-auto" style={{ maxWidth: 620 }} role="alert">
              <div className="fw-semibold mb-1">⚠️ {error.title}</div>
              {error.detail && <div className="small mb-0">{error.detail}</div>}
            </div>
          )}
        </div>
      </section>

      {/* Results */}
      {result && (
        <section className="container pb-5">
          <div className="row g-4" style={{ maxWidth: 980, margin: '0 auto' }}>
            {/* Preview + basic info */}
            <div className="col-md-5">
              <div className="card shadow-sm h-100">
                <div className="card-header fw-semibold">Basic</div>
                <div className="card-body text-center">
                  {previewUrl && (
                    <img src={previewUrl} alt="Uploaded preview" className="preview-thumb mb-3" />
                  )}
                  <table className="table table-sm text-start mb-0">
                    <tbody>
                      <Row k="Filename" v={result.basic.filename} />
                      <Row k="Format" v={result.basic.format} />
                      <Row k="MIME type" v={result.basic.mimeType} />
                      <Row k="File size" v={result.basic.fileSizeHuman} />
                      <Row
                        k="Dimensions"
                        v={
                          result.basic.width
                            ? `${result.basic.width} × ${result.basic.height} px`
                            : 'Unknown'
                        }
                      />
                      <Row k="Aspect ratio" v={result.basic.aspectRatio ?? '—'} />
                      <Row
                        k="Megapixels"
                        v={result.basic.megapixels != null ? `${result.basic.megapixels} MP` : '—'}
                      />
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Embedded metadata */}
            <div className="col-md-7">
              <div className="card shadow-sm h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <span className="fw-semibold">Embedded metadata</span>
                  {result.hasEmbeddedMetadata ? (
                    <span className="badge text-bg-success">Found</span>
                  ) : (
                    <span className="badge text-bg-secondary">None</span>
                  )}
                </div>
                <div className="card-body" style={{ maxHeight: 480, overflowY: 'auto' }}>
                  {result.gps && (
                    <div className="mb-3">
                      <div className="alert alert-info py-2 small mb-2 d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <span>
                          📍 GPS: {result.gps.latitude.toFixed(5)}, {result.gps.longitude.toFixed(5)}
                        </span>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${result.gps.latitude},${result.gps.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open in Google Maps
                        </a>
                      </div>
                      <iframe
                        title="Location on Google Maps"
                        className="ml-map rounded"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://maps.google.com/maps?q=${result.gps.latitude},${result.gps.longitude}&z=15&output=embed`}
                      />
                    </div>
                  )}

                  {result.hasEmbeddedMetadata ? (
                    <table className="table table-sm table-striped mb-0">
                      <tbody>
                        {Object.entries(result.embedded).map(([key, value]) => (
                          <tr key={key}>
                            <td className="metadata-key text-secondary">{key}</td>
                            <td className="metadata-value">
                              <MetadataValue value={value} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-secondary mb-0">
                      This image carries no EXIF, GPS or XMP data. That's normal for PNGs,
                      screenshots, and images that have been stripped by messaging apps or
                      social media sites.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Raw JSON */}
            <div className="col-12">
              <details className="card shadow-sm">
                <summary className="card-header fw-semibold" style={{ cursor: 'pointer' }}>
                  Raw JSON response
                </summary>
                <pre className="card-body small mb-0" style={{ maxHeight: 320, overflow: 'auto' }}>
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        </section>
      )}

      {/* Trust pillars */}
      <section id="why" className="ml-section-alt py-5">
        <div className="container" style={{ maxWidth: 980 }}>
          <div className="text-center mb-5">
            <h2 className="fw-bold mb-2">Why people trust MetaLens</h2>
            <p className="text-secondary mb-0">Built to be private, instant and thorough.</p>
          </div>
          <div className="row g-4">
            <div className="col-md-4">
              <div className="ml-pillar">
                <div className="ml-pillar-icon">🔒</div>
                <h3>Private &amp; secure</h3>
                <p>Images are processed in memory to read their metadata and are never written to disk or retained.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="ml-pillar">
                <div className="ml-pillar-icon">⚡</div>
                <h3>Instant results</h3>
                <p>No accounts, no queues. Drop an image and see its full metadata breakdown in a fraction of a second.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="ml-pillar">
                <div className="ml-pillar-icon">🔬</div>
                <h3>Genuinely detailed</h3>
                <p>Format, dimensions, EXIF camera settings, GPS coordinates, XMP surfaced clearly, plus the raw JSON.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-5">
        <div className="container" style={{ maxWidth: 980 }}>
          <div className="text-center mb-5">
            <h2 className="fw-bold mb-2">How it works</h2>
            <p className="text-secondary mb-0">Three steps, no sign-up.</p>
          </div>
          <div className="row g-4">
            <Step n={1} title="Upload an image" body="Drag and drop or browse for a JPEG, PNG, WebP, TIFF and more up to 15 MB." />
            <Step n={2} title="We read the metadata" body="MetaLens parses the file in memory, extracting basic properties and any embedded EXIF, GPS and XMP data." />
            <Step n={3} title="Inspect the results" body="Review a clean breakdown of everything we found, or expand the raw JSON for the full detail." />
          </div>
          <div className="text-center mt-5">
            <button className="btn btn-brand btn-lg" onClick={openPicker}>
              Inspect an image now
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="ml-footer py-4">
        <div className="container d-flex flex-column flex-sm-row align-items-center justify-content-between gap-2" style={{ maxWidth: 980 }}>
          <span className="ml-brand text-white">
            <img src="/favicon.svg" alt="MetaLens logo" className="ml-logo" />    
            Copyright © 2026 Bank Statement Converter Ltd.
          </span>
          <span className="small text-secondary">
          </span>
        </div>
      </footer>
    </>
  );
}

/**
 * Fallback messages for when the server returns an error status with no usable
 * JSON body (e.g. a host-level rejection before the request reaches the app).
 */
function describeHttpError(status) {
  if (status === 413) {
    return {
      title: 'That image is too large to upload.',
      detail:
        'The server rejected the upload before it could be read. MetaLens accepts images up ' +
        'to 15 MB — try a smaller or compressed version.'
    };
  }
  if (status === 408 || status === 504) {
    return {
      title: 'The server took too long to respond.',
      detail: 'Reading this image timed out. Try again, or upload a smaller image.'
    };
  }
  if (status >= 500) {
    return {
      title: 'The server hit an unexpected error.',
      detail:
        'Something went wrong on our end while processing the image. Please try again in a moment.'
    };
  }
  return {
    title: `Upload failed (HTTP ${status}).`,
    detail: 'The server rejected the request. Please try a different image.'
  };
}

function MetadataValue({ value }) {
  // Nested objects/arrays (e.g. XMP MWG face Regions) are pretty-printed so the
  // structure stays readable instead of collapsing into one wrapped JSON line.
  if (value !== null && typeof value === 'object') {
    return <pre className="metadata-json mb-0">{JSON.stringify(value, null, 2)}</pre>;
  }
  return <>{String(value)}</>;
}

function Row({ k, v }) {
  return (
    <tr>
      <td className="text-secondary">{k}</td>
      <td className="fw-medium">{v}</td>
    </tr>
  );
}

function Step({ n, title, body }) {
  return (
    <div className="col-md-4">
      <div className="d-flex align-items-center gap-2 mb-2">
        <span className="ml-step-num">{n}</span>
        <h3 className="h6 fw-bold mb-0">{title}</h3>
      </div>
      <p className="text-secondary mb-0">{body}</p>
    </div>
  );
}
