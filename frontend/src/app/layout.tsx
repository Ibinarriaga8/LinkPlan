import type { Metadata } from 'next';
import { Jost, DM_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/authContext';

// Jost es el clon libre de Futura; se usa como fallback web cuando el equipo no tiene Futura instalada.
const display = Jost({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display-fallback'
});
const sans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans'
});

export const metadata: Metadata = {
  title: 'Gatos y Cañas',
  description: 'Planificador de ocio compartido para ti y los tuyos'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen bg-[#F2F7FD] text-[#0A2E6E] antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
