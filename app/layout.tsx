import type { Metadata } from "next";
import { Archivo, Caveat, Cormorant_Garamond, Geist_Mono, Kalam, Lora, Patrick_Hand, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Notebook theme (landing, login, dashboard): Cormorant for headings, Lora for body, handwriting for margin notes.
const cormorant = Cormorant_Garamond({ variable: "--font-cormorant", subsets: ["latin"] });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"] });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"], preload: false });
const kalam = Kalam({ variable: "--font-kalam", subsets: ["latin"], weight: "400", preload: false });
const patrick = Patrick_Hand({ variable: "--font-patrick", subsets: ["latin"], weight: "400", preload: false });

export const metadata: Metadata = {
  title: "PDF Note taker",
  description: "Read a PDF and turn your highlights into handwritten notes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${geistMono.variable} ${sourceSerif.variable} ${cormorant.variable} ${lora.variable} ${caveat.variable} ${kalam.variable} ${patrick.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
