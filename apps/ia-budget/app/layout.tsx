import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Audit IA — comment utilisez-vous vraiment l'IA ?",
  description:
    "Importez l'export de vos conversations Claude ou ChatGPT et recevez votre audit d'usage : niveau de maturité, à quoi vous servez de l'IA, tâches récurrentes à industrialiser et playbook d'optimisation. Analyse 100 % locale : vos conversations ne quittent jamais votre navigateur.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
