import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';

export const metadata = {
  title: 'MetaLens | Image Metadata Inspector',
  description: 'Upload an image and inspect its metadata: dimensions, format, EXIF, GPS and more.',
  manifest: '/site.webmanifest',
  appleWebApp: {
    title: 'MetaLens'
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-96x96.png', type: 'image/png', sizes: '96x96' }
    ],
    apple: '/apple-touch-icon.png'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-bs-theme="light">
      <body>{children}</body>
    </html>
  );
}
