import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CSV to Teams | Meeting Schedule Webhook Integration",
  description: "Upload CSV files and send formatted meeting schedules to Microsoft Teams via webhooks. Built with Next.js, TypeScript, and shadcn/ui.",
  keywords: ["CSV", "Teams", "webhook", "meetings", "schedule", "integration"],
  authors: [{ name: "CSV to Teams App" }],
  openGraph: {
    title: "CSV to Teams Webhook Integration",
    description: "Upload CSV files and send formatted meeting schedules to Microsoft Teams",
    type: "website",
  },
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
        {children}
        <Toaster />
      </body>
    </html>
  );
}
