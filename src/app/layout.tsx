import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Verify Stack — WhatsApp OTP Infrastructure for Developers",
  description: "Developer-first WhatsApp OTP verification infrastructure. Connect your Meta Cloud API, issue API keys, and verify users with cryptographically secure one-time passwords.",
  keywords: ["WhatsApp OTP", "Authentication", "Developer Infrastructure", "Meta Cloud API", "Two-Factor Auth"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090a0d] text-zinc-100 antialiased selection:bg-emerald-500/20 selection:text-emerald-300">
        {children}
      </body>
    </html>
  );
}
