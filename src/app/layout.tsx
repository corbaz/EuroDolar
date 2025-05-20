import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { LanguageProvider } from "@/contexts/LanguageContext";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

// Default metadata (English). Title will be updated client-side by LanguageProvider.
export const metadata: Metadata = {
    title: "Peso Watcher | ARS Currency Tracker", // Default title
    description:
        "Track USD (Blue & Oficial - Buy/Sell) and EUR (Official - Buy/Sell) exchange rates against Argentinian Peso (ARS) for a selected date.",
    icons: {
        icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
        shortcut: "/favicon.svg",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <LanguageProvider>
            <html lang="es" suppressHydrationWarning>
                <body
                    className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
                >
                    {children}
                    <Toaster />
                </body>
            </html>
        </LanguageProvider>
    );
}
