import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relevé IA — le compte rendu mensuel de votre consommation d'IA",
  description:
    "Importez vos exports ChatGPT et Claude, découvrez ce que vaut votre usage de l'IA en euros, par thématique, et recevez des conseils pour l'optimiser. Analyse 100 % locale : vos conversations ne quittent jamais votre navigateur.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
