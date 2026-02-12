import type React from "react"
import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Étude JOCAS - Préférences d'emploi | HEC Paris",
  description:
    "Étude sur les préférences des étudiants HEC concernant les offres d'emploi",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={`${geist.className} antialiased`}>{children}</body>
    </html>
  )
}
