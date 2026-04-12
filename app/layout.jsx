export const metadata = {
  title: 'Copa Grosspi',
  description: 'Campeonato de Golf - Las Lomas de La Dehesa',
};
export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1a2e1a" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Grosspi" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512x512.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="96x96" href="/icons/icon-96x96.png" />
        <script dangerouslySetInnerHTML={{__html: `
          (function() {
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/sw.js').catch(function() {});
              navigator.serviceWorker.addEventListener('message', function(e) {
                if (e.data && e.data.type === 'CHUNK_ERROR') {
                  window.location.reload(true);
                }
              });
            }
            window.addEventListener('error', function(e) {
              if (e.message && e.message.indexOf('ChunkLoadError') !== -1) {
                window.location.reload(true);
              }
            });
          })();
        `}} />
      </head>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
