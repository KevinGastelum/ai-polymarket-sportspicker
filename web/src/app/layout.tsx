"use client";

import { useState, createContext, useContext, ReactNode } from "react";
import "./globals.css";
import styles from "./layout.module.css";
import { useAuth } from "@/hooks/useAuth";
import { AuthModal } from "@/components/AuthModal";
import { LiveToast } from "@/components/LiveToast";

// Navigation Context
type TabType = 'dashboard' | 'markets' | 'portfolio' | 'settings';
const TabContext = createContext<{
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}>({ activeTab: 'dashboard', setActiveTab: () => {} });

export const useTab = () => useContext(TabContext);

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
  Menu: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
  ),
  Close: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  
  // Auth state
  const { user, isAuthenticated, loading: authLoading, signIn, signUp, signOut } = useAuth();

  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={styles.body} suppressHydrationWarning>
        <TabContext.Provider value={{ activeTab, setActiveTab }}>
          {/* Mobile Overlay */}
          {sidebarOpen && (
            <div 
              className={styles.overlay} 
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
            <div className={styles.sidebarHeader}>
              <div className={styles.logoContainer}>
                <span className={styles.logoIcon}>⚡</span>
                <span className={styles.logoText}>PolyPick</span>
              </div>
              <button 
                className={styles.closeBtn}
                onClick={() => setSidebarOpen(false)}
              >
                <Icons.Close />
              </button>
            </div>

            <nav className={styles.nav}>
              <button 
                onClick={() => handleTabClick('dashboard')}
                className={`${styles.navItem} ${activeTab === 'dashboard' ? styles.active : ''}`}
              >
                <Icons.Dashboard />
                <span>Dashboard</span>
              </button>
              <button 
                onClick={() => handleTabClick('markets')}
                className={`${styles.navItem} ${activeTab === 'markets' ? styles.active : ''}`}
              >
                <Icons.Predictions />
                <span>Live Markets</span>
              </button>
              <button 
                onClick={() => handleTabClick('portfolio')}
                className={`${styles.navItem} ${activeTab === 'portfolio' ? styles.active : ''}`}
              >
                <Icons.Wallet />
                <span>Portfolio</span>
              </button>
              <button 
                onClick={() => handleTabClick('settings')}
                className={`${styles.navItem} ${activeTab === 'settings' ? styles.active : ''}`}
              >
                <Icons.Settings />
                <span>Settings</span>
              </button>
            </nav>

            <div className={styles.userProfile}>
              {isAuthenticated ? (
                <>
                  <div className={styles.avatar}>{user?.email?.[0]?.toUpperCase() || 'U'}</div>
                  <div className={styles.userInfo}>
                    <span className={styles.userName}>{user?.email?.split('@')[0] || 'User'}</span>
                    <button onClick={signOut} className={styles.logoutLink}>Sign Out</button>
                  </div>
                </>
              ) : (
                <button onClick={() => setAuthModalOpen(true)} className={styles.loginBtn}>
                  Sign In
                </button>
              )}
            </div>
          </aside>

          {/* Main Content Area */}
          <div className={styles.mainWrapper}>
            {/* Header */}
            <header className={styles.header}>
              <button 
                className={styles.menuBtn}
                onClick={() => setSidebarOpen(true)}
              >
                <Icons.Menu />
              </button>

              <div className={styles.searchBar}>
                <Icons.Search />
                <input type="text" placeholder="Search markets..." />
              </div>
              
              <div className={styles.headerActions}>
                <button className={`btn-glass ${styles.notificationBtn}`}>
                  <span>🔔</span>
                </button>
                {isAuthenticated ? (
                  <button className={`btn-glass ${styles.depositBtn}`} onClick={signOut}>
                    <span className={styles.depositText}>Sign Out</span>
                  </button>
                ) : (
                  <button className={`btn-neon ${styles.depositBtn}`} onClick={() => setAuthModalOpen(true)}>
                    <span className={styles.depositText}>Sign In</span>
                    <span className={styles.depositIcon}>→</span>
                  </button>
                )}
              </div>
            </header>

            {/* Page Content */}
            <main className={styles.content}>
              {children}
            </main>
          </div>

          {/* Mobile Bottom Navigation */}
          <nav className={styles.mobileNav}>
            <button 
              onClick={() => handleTabClick('dashboard')}
              className={`${styles.mobileNavItem} ${activeTab === 'dashboard' ? styles.active : ''}`}
            >
              <Icons.Dashboard />
              <span>Home</span>
            </button>
            <button 
              onClick={() => handleTabClick('markets')}
              className={`${styles.mobileNavItem} ${activeTab === 'markets' ? styles.active : ''}`}
            >
              <Icons.Predictions />
              <span>Markets</span>
            </button>
            <button 
              onClick={() => handleTabClick('portfolio')}
              className={`${styles.mobileNavItem} ${activeTab === 'portfolio' ? styles.active : ''}`}
            >
              <Icons.Wallet />
              <span>Portfolio</span>
            </button>
            <button 
              onClick={() => handleTabClick('settings')}
              className={`${styles.mobileNavItem} ${activeTab === 'settings' ? styles.active : ''}`}
            >
              <Icons.Settings />
              <span>Settings</span>
            </button>
          </nav>
          
          {/* Auth Modal */}
          <AuthModal 
            isOpen={authModalOpen} 
            onClose={() => setAuthModalOpen(false)}
            onSignIn={signIn}
            onSignUp={signUp}
          />
          <LiveToast />
        </TabContext.Provider>
      </body>
    </html>
  );
}

