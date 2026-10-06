import type { Metadata } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: 'variable',
  variable: '--font-ibm-sans',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-ibm-mono',
});

export const metadata: Metadata = {
  title: 'Finance Tracker',
  description: 'Personal finance dashboard',
};

const colorSchemeScript = `
(function () {
  var mql = window.matchMedia("(prefers-color-scheme: dark)");
  function apply(isDark) {
    document.documentElement.classList.toggle("dark", isDark);
  }
  apply(mql.matches);
  mql.addEventListener("change", function (e) {
    apply(e.matches);
  });
})();
`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: colorSchemeScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
