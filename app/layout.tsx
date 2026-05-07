import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job Tracker",
  description:
    "All-in-one job tracker. US jobs only. Direct apply links. Fresh within 5 days of original ATS posting.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="site-header__inner">
            <Link href="/" className="brand" aria-label="Job Tracker home">
              <svg
                className="brand__mark"
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="3"
                  y="6"
                  width="18"
                  height="14"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path
                  d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path d="M3 12h18" stroke="currentColor" strokeWidth="1.6" />
              </svg>
              <span>Job Tracker</span>
            </Link>
            <nav className="site-nav" aria-label="Primary">
              <Link href="/latest">Latest</Link>
              <Link href="/entry-level">Entry-level</Link>
              <Link href="/companies/walmart">Walmart</Link>
              <Link href="/health">Health</Link>
            </nav>
          </div>
        </header>
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          <p>
            US jobs only. Listings live for 5 days from the original ATS posted
            date. Direct apply links only.
          </p>
        </footer>
      </body>
    </html>
  );
}
