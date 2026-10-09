import type { Metadata, Viewport } from "next";
import { Lato, Lilita_One } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

const lilita = Lilita_One({
  variable: "--font-lilita",
  subsets: ["latin"],
  weight: "400",
});

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name}, ${site.shortDescription}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    "ADEMIG",
    "ENSMG",
    "ingénieurs des mines",
    "géologie",
    "Sénégal",
    "secteur extractif",
    "contenu local",
    "UCAD",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: site.locale,
    siteName: site.name,
    url: "/",
    title: `${site.name}, ${site.shortDescription}`,
    description: site.description,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#f3f0e7",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${lilita.variable} ${lato.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
