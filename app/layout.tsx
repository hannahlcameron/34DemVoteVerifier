import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "34th LD Vote Verifier",
  description: "34th Legislative District Democrats Vote Verification Tool",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header style={{
          backgroundColor: 'var(--primary-blue)',
          padding: '1.5rem 0',
          marginBottom: '2rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div className="container" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <span style={{
                color: 'white',
                fontSize: '1.75rem',
                fontWeight: 'bold',
                letterSpacing: '-0.02em'
              }}>
                34th LD Dems
              </span>
              <span style={{
                color: 'white',
                fontSize: '1.25rem',
                opacity: '0.9',
                marginLeft: '0.5rem',
                fontWeight: '500'
              }}>
                Vote Verifier
              </span>
            </div>
          </div>
        </header>
        <main className="container">
          {children}
        </main>
      </body>
    </html>
  );
}
