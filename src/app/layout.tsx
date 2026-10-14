import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { RootProviders } from "@/components/providers";
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
  metadataBase: new URL("https://www.cueface.com"),
  title: "CueFace — Turn one product link into five reels",
  description: "Create a consistent AI creator and a launch-ready batch of silent, vertical product reels.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "CueFace — One cast. Five story-led reels.",
    description: "Turn one product link into a consistent AI creator and five editable vertical reels.",
    url: "https://www.cueface.com",
    siteName: "CueFace",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}
