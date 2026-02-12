import type React from "react"
import type { Metadata } from "next"
import { Geist } from "next/font/google"
import Image from "next/image"
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
      <body className={`${geist.className} antialiased bg-gray-50`}>
        {/* Header avec logo HEC */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <a href="/" className="flex items-center">
                  <Image
                    src="/hec-logo.png"
                    alt="HEC Paris"
                    width={120}
                    height={40}
                    className="h-10 w-auto"
                    priority
                  />
                </a>
                <nav className="hidden md:flex items-center gap-6">
                  <a href="/" className="text-gray-700 hover:text-[#0C346B] text-sm font-medium">
                    Accueil
                  </a>
                  <a href="/vote" className="text-[#0C346B] font-medium text-sm">
                    Comparer les offres
                  </a>
                </nav>
              </div>
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  )
}
