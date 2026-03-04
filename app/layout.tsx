import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Huawei Quotation AI",
  description:
    "AI-assisted workflow for converting cloud environments into Huawei quotation scenarios.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
