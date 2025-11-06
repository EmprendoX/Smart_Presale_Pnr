export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Con next-intl, el layout raíz solo pasa children al layout de locale
  return children;
}


