export const metadata = {
  title: "Grosspi - Golf Championship",
  description: "Campeonato de Golf 2025-2026",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, padding: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
