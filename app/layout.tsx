import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mesh Studio",
  description: "Generate textured 3D models from a single prompt.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
