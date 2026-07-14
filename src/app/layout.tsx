import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NavigationWrapper from "@/components/NavigationWrapper";
import GlobalModals from "@/components/GlobalModals";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "APEX | Your Life. Simplified.",
  description: "One App, Unlimited Possibilities.",
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
      <body className="min-h-full flex flex-col pb-14 bg-slate-900 text-gray-800">
        <div className="max-w-md w-full mx-auto bg-[#F4F6FB] min-h-screen relative shadow-2xl overflow-x-hidden border-x border-slate-800">
          <NavigationWrapper>
            {children}
          </NavigationWrapper>
          <GlobalModals />
        </div>
      </body>
    </html>
  );
}
