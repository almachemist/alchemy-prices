import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { NavLinks } from "./components/NavLinks";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Alchemy Costing Studio",
  description: "Recipe, inventory and batch costing management for Alchemy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen flex flex-col">
          <header
            className="sticky top-0 z-50 border-b"
            style={{
              background: "var(--color-bg-elevated)",
              borderColor: "var(--color-border-light)",
            }}
          >
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
              <Link href="/" className="flex items-center gap-2.5 no-underline">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
                  style={{ background: "var(--color-accent)" }}
                >
                  A
                </div>
                <span className="text-base font-semibold" style={{ color: "var(--color-text)" }}>
                  Alchemy Studio
                </span>
              </Link>

              <nav className="flex items-center gap-1">
                <NavLinks />
              </nav>
            </div>
          </header>

          <main className="flex-1">
            <div className="mx-auto max-w-7xl px-6 py-6">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
