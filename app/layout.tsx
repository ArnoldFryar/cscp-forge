import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "CSCP Forge",
  description: "Focused CSCP exam practice with modules, quizzes, explanations, and progress tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}