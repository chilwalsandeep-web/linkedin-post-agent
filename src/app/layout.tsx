import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "LinkedIn Post Agent",
    template: "%s · LinkedIn Post Agent",
  },
  description:
    "Research a topic, pick an angle, and publish a human-sounding LinkedIn post — with you approving every word.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1116" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="topbar">
            <Link href="/" className="brand">
              <span className="brand-mark" aria-hidden="true">
                in
              </span>
              Post Agent
            </Link>
            <nav className="topnav">
              <Link href="/">New post</Link>
              <Link href="/account">Account</Link>
            </nav>
          </header>

          <main>{children}</main>

          <footer className="footer">
            <span>Official LinkedIn API · nothing posts without your approval</span>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </footer>
        </div>
      </body>
    </html>
  );
}
