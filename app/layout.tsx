import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jan & Chris CRM",
  description: "Projektmanagement",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="min-h-screen w-full bg-[#0f1115] text-white">
        {/* ✅ KEIN max-w Container hier – Dashboard/Boards können volle Breite nutzen */}
        {children}
      </body>
    </html>
  );
}
