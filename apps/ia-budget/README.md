# Relevé IA 💶

**Le compte rendu mensuel de votre consommation d'intelligence artificielle.**

Comme un relevé bancaire, mais pour votre usage de ChatGPT, Claude (et bientôt
Gemini) : une fois par mois, vous importez votre export de conversations et
l'app vous dit ce que votre usage *vaut* en euros, sur quoi vous le dépensez,
et comment consommer plus malin.

## Le produit en une phrase

> « Votre mois d'IA de juillet vaut 34 € — voici où ils sont partis, et
> 12 € d'économies possibles. »

## Décisions fonctionnelles (validées)

| Décision | Choix |
|---|---|
| Cible | Particulier multi-IA d'abord, architecture ouverte vers les organisations |
| Rituel d'usage | **Relevé mensuel** — import de l'export en 2 min, comme un relevé bancaire |
| Métrique héros | **Coût équivalent en €** (ce que l'usage aurait coûté au token via les API) |
| Ton | **Coach bienveillant** — concret, chiffré, jamais culpabilisant |
| Confidentialité | **Analyse 100 % locale** — les conversations ne quittent jamais le navigateur ; seuls les agrégats mensuels sont conservés |
| Budget | Budget mensuel personnalisable + jauge de progression |
| Comparaison | vs soi-même (delta mensuel, tendance 6 mois) |
| Thématiques | Détection automatique + renommage par l'utilisateur |
| Rappel | E-mail mensuel teaser (V2 — voir roadmap) |

## Architecture

```
Navigateur (tout le traitement)                    Persistance
┌──────────────────────────────────────────┐
│ conversations.json (ChatGPT / Claude)    │
│   → parsers.ts     (formats officiels)   │
│   → tokens.ts      (estimation ~4 c/tok, │
│                     contexte cumulé)     │
│   → classify.ts    (thèmes par mots-clés │      localStorage
│                     FR/EN, renommables)  │  →   agrégats mensuels
│   → pricing.ts     (grille API publique) │      uniquement
│   → aggregate.ts   (relevés mensuels)    │      (jamais le contenu)
│   → recommend.ts   (coach : règles       │
│                     déterministes)       │      [V2] Supabase :
│   → demo.ts        (6 mois simulés,      │      mêmes agrégats,
│                     PRNG seedé)          │      synchro + e-mail
└──────────────────────────────────────────┘
```

- **Next.js 15 (App Router) + Tailwind 4 + Recharts** — deux pages :
  onboarding/import (`/`) et dashboard (`/dashboard`).
- **Aucune requête réseau pendant l'analyse.** C'est vérifiable dans
  l'onglet Réseau du navigateur — c'est l'argument de confiance n°1.
- **`supabase/schema.sql`** prépare la V2 (compte, synchro multi-appareils,
  rappel mensuel) sans rien changer au principe : seuls les agrégats montent.

## Lancer en local

```bash
cd apps/ia-budget
npm install
npm run dev   # http://localhost:3000
```

Cliquez sur « Découvrir avec des données démo » pour explorer sans export.

## Ce que fait le coach (règles actuelles)

1. **Conversations marathon** (>15 échanges) — explique le coût du contexte
   cumulé, chiffre l'économie d'une conversation fraîche (~45 %).
2. **Modèle premium pour tâches simples** — suggère un modèle léger (~-70 %).
3. **Sujets fragmentés** — 4+ conversations/jour sur un même thème → regrouper.
4. **Gros collages répétés** — suggère Projets / fichiers joints.
5. **Tendance** — hausse >30 % signalée avec bienveillance, baisse >15 % félicitée.
6. Toujours au moins un message d'encouragement.

## Limites assumées du MVP

- **Estimation, pas comptage exact** : tokens ≈ caractères/4 (±15 %), grille
  de prix API publique figée dans `lib/pricing.ts` (taux USD→EUR fixe).
- **Classification par mots-clés** : suffisante pour un premier relevé ; une
  classification LLM *opt-in* (envoyée au serveur) est prévue en V2 pour plus
  de finesse — jamais par défaut.
- **Gemini non parsé** (Google Takeout HTML) — affiché comme « bientôt ».
- L'export Claude n'indique pas toujours le modèle → Sonnet par défaut.

## Roadmap proposée

1. **V1.1** — support Gemini (Takeout), import du zip complet (pas seulement
   le .json), équivalents concrets (« = 8 cafés »), export PDF du relevé.
2. **V2** — compte Supabase optionnel : synchro des agrégats, e-mail mensuel
   teaser (« votre bilan de juillet vous attend »), classification LLM opt-in.
3. **V3** — mode organisation : Usage/Admin APIs (Anthropic, OpenAI) pour un
   suivi d'équipe exact et temps réel ; benchmark anonyme entre utilisateurs.
4. **V4** — extension navigateur pour le quasi temps réel.
