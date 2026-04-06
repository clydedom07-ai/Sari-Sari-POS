import type {Metadata, Viewport} from 'next';
import './globals.css'; // Global styles
import { StoreProvider } from '@/lib/hooks/use-store';
import { ReceiptProvider } from '@/lib/context/receipt-context';
import { AuthProvider } from '@/lib/contexts/auth-context';
import { AuthGuard } from '@/components/auth/auth-guard';
import { PWARegistration } from '@/components/pwa-registration';
import { InstallPWA } from '@/components/layout/install-pwa';

export const metadata: Metadata = {
  title: 'Sari-Sari POS',
  description: 'Offline-first POS for Filipino businesses',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Sari-Sari POS',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#ea580c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AuthProvider>
          <AuthGuard>
            <StoreProvider>
              <ReceiptProvider>
                <PWARegistration />
                <InstallPWA />
                {children}
              </ReceiptProvider>
            </StoreProvider>
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
