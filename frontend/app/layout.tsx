import "@fontsource-variable/dm-sans";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Voice AI — Sesini diller arasında taşı",
  description: "Kendi ses örneğinle beş dilde doğal konuşma oluştur.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

