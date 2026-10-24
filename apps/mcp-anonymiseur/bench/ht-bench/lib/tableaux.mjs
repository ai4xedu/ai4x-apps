// ============================================================================
// HT-BENCH — les tableaux : ce qu'on exporte d'un logiciel vers Excel (liste
// de clients, état de paie, relevé bancaire, journal d'appels…). Une ligne
// d'en-têtes, puis une ligne par enregistrement. Chaque gabarit rend une
// liste de lignes, chaque ligne une liste de cellules balisées ; le
// générateur les joint par tabulations et sauts de ligne, et le banc en
// fait un .xlsx noté en mode TABLEAU (cf. lib/formats.mjs).
//
// Comme dans un vrai export, une cellule qui ne contient que des chiffres
// (sans zéro en tête) devient un nombre Excel : un téléphone perd alors son
// 0 (« 661234567 », écriture « excel-nombre »), un n° CNSS n'est plus qu'un
// nombre.
// ============================================================================
import { P, L } from "./balisage.mjs";
import { personneMaghreb } from "./noms.mjs";
import * as I from "./identifiants.mjs";

const c = (h, ...options) => h.choix(options);
const nbLignes = (h) => h.entier(6, 10);
const MAJ = (s) => s.toLocaleUpperCase("fr");

/* Le nom d'une ligne : maghrébin le plus souvent, parfois en arabe. */
function nomLigne(g, arabe = 0.15) {
  return g.h.pile(arabe) ? g.personneAr() : g.personne(g.h.pile(0.8) ? "ma" : "fr", { ordre: g.h.choix(["prenom-nom", "NOM-prenom"]) });
}
/* Téléphone de tableur : parfois un nombre, sans son 0. */
function telCellule(g) {
  if (g.h.pile(0.2)) return P("TEL", { valeur: g.h.choix(["6", "7"]) + g.h.chiffres(8), variante: "excel-nombre" });
  return g.tel("ma");
}
const montantCellule = (g) => L("MONTANT", `${String(g.h.entier(150, 45000)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${g.h.chiffres(2)}`, "cellule");

const core = {
  listeClients(g) {
    const h = g.h;
    const lignes = [["Nom", "Prénom", "الاسم الكامل", "CIN", "Téléphone", "E-mail", "Ville", "Inscrit le", "Commentaire"]];
    for (let i = 0; i < nbLignes(h); i++) {
      const p = g.personneAr();
      const lat = { prenom: p.p.latin.prenom, nom: p.p.latin.nom, variante: "mag-translitteration" };
      const autre = g.personne("ma");
      lignes.push([
        P("PERSONNE", { valeur: h.pile(0.5) ? MAJ(lat.nom) : lat.nom, variante: lat.variante, traits: ["nom-seul"] }),
        P("PERSONNE", { valeur: lat.prenom, variante: lat.variante, traits: ["prenom-seul"] }),
        h.pile(0.6) ? p.m : "",
        g.cin(),
        telCellule(g),
        h.pile(0.7) ? g.email(lat) : "",
        h.pile(0.5) ? g.ville("ma") : g.villeAr(),
        g.date(),
        c(h, "", "", "client fidèle", `rappeler ${autre.m} au ${g.tel("ma")}`, `payé ${g.montant("MAD")}`, `${g.sigle(["CNSS", "AMO"])} à jour`, `يفضل التواصل بالعربية`),
      ]);
    }
    return lignes;
  },
};

const telecom = {
  journalAppels(g) {
    const h = g.h;
    const lignes = [["Date", "Heure", "Appelant", "N° appelant", "IMEI", "Conseiller", "Motif", "Note"]];
    for (let i = 0; i < nbLignes(h); i++) {
      const cl = h.pile(0.4) ? g.personneArabizi({ forme: "prenom-nom" }) : g.personne("ma", { ordre: "prenom-nom" });
      const cons = g.personne("ma");
      lignes.push([
        g.date(), `${String(h.entier(8, 21)).padStart(2, "0")}:${String(h.entier(0, 59)).padStart(2, "0")}`,
        cl.m, telCellule(g), h.pile(0.6) ? g.imei() : "", g.prenom(cons.p),
        h.choix(["coupure", "facture", "portabilité", "vol de téléphone", "roaming"]),
        c(h, "", `client ${L("MOT", "m9elle9", "darija")}, rappel demain`, `CIN ${g.cin()} vérifiée`, `${L("MOT", "safi", "darija")}, réglé`, `rappeler au ${g.tel("ma")}`),
      ]);
    }
    return lignes;
  },
};

const banque = {
  releve(g) {
    const h = g.h;
    const lignes = [["Date opération", "Libellé", "Débit (MAD)", "Crédit (MAD)", "Solde"]];
    for (let i = 0; i < nbLignes(h) + 2; i++) {
      const p = personneMaghreb(h, { ordre: "prenom-nom" });
      const nomMaj = P("PERSONNE", { valeur: MAJ(p.valeur), variante: p.variante, traits: [...p.traits, "majuscules"] });
      const debit = h.pile(0.55);
      const lib = c(h,
        `VIR RECU DE ${nomMaj}`, `VIR EMIS VERS ${nomMaj} RIB ${P("RIB", { valeur: I.ribMaroc(h), variante: "rib-ma-colle" })}`,
        `PRLV ${g.sigle(["CNSS", "AMO", "DGI"])} ${g.date()}`, `RETRAIT GAB ${g.ville("ma")}`,
        `PAIEMENT CB ${g.produit(["MARJANE", "ACIMA", "LABEL VIE", "AFRIQUIA"])}`, "FRAIS TENUE DE COMPTE",
        `تحويل من ${g.personneAr().m}`, `VERSEMENT ${nomMaj} CIN ${g.cin()}`);
      lignes.push([g.date(), lib, debit ? montantCellule(g) : "", debit ? "" : montantCellule(g), String(h.entier(1000, 900000))]);
    }
    return lignes;
  },
};

const rh = {
  etatPaie(g) {
    const h = g.h;
    const lignes = [["Matricule", "Nom et prénom", "CIN", "N° CNSS", "RIB", "Salaire brut", "Net à payer", "Date d'embauche"]];
    for (let i = 0; i < nbLignes(h); i++) {
      lignes.push([
        `[[MATRICULE:${h.chiffres(5)}]]`, nomLigne(g, 0.2).m, g.cin(), g.cnss(),
        P("RIB", { valeur: I.ribMaroc(h), variante: "rib-ma-colle" }), montantCellule(g), montantCellule(g), g.date(),
      ]);
    }
    return lignes;
  },
};

const sante = {
  listePatients(g) {
    const h = g.h;
    const lignes = [["IPP", "Patient", "Né(e) le", "Téléphone", "Médecin", "Motif", "Traitement"]];
    for (let i = 0; i < nbLignes(h); i++) {
      const med = g.personne("mix");
      lignes.push([
        `[[PATIENT:${h.chiffres(8)}]]`, nomLigne(g).m, g.naissance(), telCellule(g), `Dr ${g.nom(med.p)}`,
        h.choix(["consultation", "contrôle", "urgence", "bilan"]), g.produit(["paracétamol 1 g", "amoxicilline 1 g", "metformine 850 mg", "ibuprofène 400 mg"]),
      ]);
    }
    return lignes;
  },
};

const comptable = {
  fichierTiers(g) {
    const h = g.h;
    const lignes = [["Compte", "Raison sociale", "ICE", "IF", "RC", "Contact", "Téléphone", "E-mail"]];
    for (let i = 0; i < nbLignes(h); i++) {
      const ct = g.personne("ma");
      lignes.push([g.compte(), g.societe("ma"), g.ice(), g.if(), g.rc(), ct.m, telCellule(g), g.email(ct.p)]);
    }
    return lignes;
  },
};

const juridique = {
  suiviDossiers(g) {
    const h = g.h;
    const lignes = [["N° RG", "Client", "Partie adverse", "Juridiction", "Prochaine audience", "Avocat", "Tél. client"]];
    for (let i = 0; i < nbLignes(h); i++) {
      const cl = g.personne("mix"), adv = h.pile(0.5) ? { m: g.societe("fr") } : g.personne("fr"), av = g.personne("fr");
      lignes.push([
        `[[RG|rg:${h.entier(19, 26)}/${String(h.entier(1, 99999)).padStart(5, "0")}]]`, cl.m, adv.m,
        h.choix(["Conseil de prud'hommes de Lyon", "Tribunal judiciaire de Paris", "Cour d'appel de Bordeaux"]), g.date(), `Me ${g.nom(av.p)}`, g.tel(h.pile(0.5) ? "fr" : "ma"),
      ]);
    }
    return lignes;
  },
};

/* Le plan des tableaux : pack → gabarits, nombre de classeurs par gabarit. */
export const TABLEAUX = {
  core:                  { gabarits: core,      n: 4, langue: "fr-ar" },
  "telecom-ma":          { gabarits: telecom,   n: 4, langue: "fr" },
  "juridique-fr":        { gabarits: juridique, n: 4, langue: "fr" },
  "banque-assurance":    { gabarits: banque,    n: 4, langue: "fr" },
  sante:                 { gabarits: sante,     n: 4, langue: "fr" },
  "expertise-comptable": { gabarits: comptable, n: 4, langue: "fr" },
  "rh-paie":             { gabarits: rh,        n: 4, langue: "fr" },
};
