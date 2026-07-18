import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NavigationWrapper from "@/components/NavigationWrapper";
import GlobalModals from "@/components/GlobalModals";
import GlobalToasts from "@/components/GlobalToasts";
import Providers from "@/components/Providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "APEX | Your Life. Simplified.",
  description: "One App, Unlimited Possibilities.",
  manifest: "/manifest.json",
  themeColor: "#4c1d95",
  viewport: "minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, viewport-fit=cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} antialiased scroll-smooth`}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 md:bg-gray-100 text-gray-800">
        <div className="w-full max-w-[2000px] mx-auto bg-[#F4F6FB] min-h-screen relative shadow-[0_0_40px_rgba(0,0,0,0.05)] overflow-x-hidden md:border-x border-gray-200 pb-20 md:pb-0">
          <Providers>
            <NavigationWrapper>
              {children}
            </NavigationWrapper>
            <GlobalModals />
            <GlobalToasts />
          </Providers>
        </div>
      </body>
    </html>
  );
}
