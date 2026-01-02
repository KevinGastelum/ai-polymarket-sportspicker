"use client";

import { usePathname } from "next/navigation";
import "./globals.css";
import styles from "./layout.module.css";

// SVG Icons
const Icons = {
  Dashboard: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7"></rect>
      <rect x="14" y="3" width="7" height="7"></rect>
      <rect x="14" y="14" width="7" height="7"></rect>
      <rect x="3" y="14" width="7" height="7"></rect>
    </svg>
  ),
  Predictions: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
    </svg>
  ),
  Wallet: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
      <line x1="1" y1="10" x2="23" y2="10"></line>
    </svg>
  ),
  Settings: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  ),
  Search: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  return (
    <html lang="en">
      <body className={styles.body}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.logoContainer}>
            <span className={styles.logoIcon}>⚡</span>
            <span className={styles.logoText}>PolyPick</span>
          </div>

          <nav className={styles.nav}>
            <a href="#" className={`${styles.navItem} ${styles.active}`}>
              <Icons.Dashboard />
              <span>Dashboard</span>
            </a>
            <a href="#predictions" className={styles.navItem}>
              <Icons.Predictions />
              <span>Live Markets</span>
            </a>
            <a href="#wallet" className={styles.navItem}>
              <Icons.Wallet />
              <span>Portfolio</span>
            </a>
            <a href="#settings" className={styles.navItem}>
              <Icons.Settings />
              <span>Settings</span>
            </a>
          </nav>

          <div className={styles.userProfile}>
            <div className={styles.avatar}>U</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>CryptoWhale</span>
              <span className={styles.userBalance}>$4,250.00</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className={styles.mainWrapper}>
          {/* Header */}
          <header className={styles.header}>
            <div className={styles.searchBar}>
              <Icons.Search />
              <input type="text" placeholder="Search markets, teams..." />
            </div>
            
            <div className={styles.headerActions}>
              <button className="btn-glass">
                <span style={{ fontSize: '1.2rem' }}>🔔</span>
              </button>
              <button className="btn-neon">
                <span>+ Deposit</span>
              </button>
            </div>
          </header>

          {/* Page Content */}
          <main className={styles.content}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
