import type { Metadata, Viewport } from "next";
import AppShell from "@/components/AppShell";
import PwaRegister from "@/components/PwaRegister";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "CSCP Forge",
  description: "Focused CSCP exam practice with modules, quizzes, explanations, and progress tracking.",
  applicationName: "CSCP Forge",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "CSCP Forge",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <PwaRegister />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}