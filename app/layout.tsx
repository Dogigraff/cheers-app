import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const emojiFaviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🔥</text></svg>`;
const emojiFaviconUrl = `data:image/svg+xml,${encodeURIComponent(emojiFaviconSvg)}`;

export const metadata: Metadata = {
  title: "Cheers - Find your party",
  description:
    "Real-time social discovery map. Find who is drinking nearby.",
  icons: {
    icon: [
      { url: emojiFaviconUrl, type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
  },
};

export const viewport = {
  themeColor: "#1a1a2e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        {children}
        <Toaster position="top-center" theme="dark" />
      </body>
    </html>
  );
}
