import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Falcon",
  description: "Your AI integration platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} h-dvh flex flex-col overflow-hidden`}>
        <Providers>
          <div className="flex-1 min-h-0 overflow-auto">{children}</div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
