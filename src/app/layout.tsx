import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
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
        className={`${inter.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
