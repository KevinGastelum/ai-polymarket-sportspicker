import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI PolyMarket Sports Picker",
  description: "ML-powered sports predictions with Polymarket integration",
  keywords: ["sports betting", "ML", "predictions", "polymarket"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
