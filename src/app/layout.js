import './globals.css';

export const metadata = {
  title: 'Tons of Consequence â The Definitive Ranking of Test Cricket Centuries',
  description:
    'Not all hundreds are created equal. Rank every Test cricket century by what it actually meant â adjust the weightings, find your own truth.',
  openGraph: {
    title: 'Tons of Consequence',
    description: 'Not all hundreds are created equal.',
    url: 'https://tonsofconsequence.com',
    siteName: 'Tons of Consequence',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_AU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tons of Consequence',
    description: 'Not all hundreds are created equal.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
