// ============================================================================
// HT-BENCH — les gabarits de documents, par pack.
//
// Un gabarit reçoit la fabrique g (valeurs synthétiques balisées) et rend un
// texte balisé. Les phrases sont écrites comme dans un vrai dossier — pas
// pour flatter le moteur : particules, majuscules, minuscules d'une
// transcription, identifiants dans toutes leurs écritures, et des leurres
// (montants, dates, articles, sigles, mots courants) à laisser lisibles.
// ============================================================================
import { L } from "./balisage.mjs";

const c = (h, ...options) => h.choix(options);

/* Une phrase avec un mot courant qui ressemble à un nom. */
function phraseMot(g) {
  return g.h.choix([
    `Le mur de clôture est en ${L("MOT", "pierre")} de taille.`,
    `Un ${L("MOT", "olivier")} centenaire borde la parcelle.`,
    `Le formulaire est revenu ${L("MOT", "blanc")}, sans signature.`,
    `Il s'agit d'un ${L("MOT", "petit")} retard, sans conséquence.`,
    `La prime de ${L("MOT", "Noël")} est versée en décembre.`,
    `Le logo représente une ${L("MOT", "rose")} des vents.`,
    `Le ${L("MOT", "boulanger")} voisin a confirmé l'horaire de passage.`,
    `Les murs sont peints en ${L("MOT", "brun")} et beige.`,
    `Le local servait autrefois de bergerie pour les ${L("MOT", "moutons")}.`,
    `${L("MOT", "Bonheur")} et sérénité : c'est le nom de la gamme.`,
  ]);
}

const SIGLES_MA = ["CNSS", "AMO", "CNOPS", "TVA", "IR", "SMIG", "CDI", "DGI", "ANRT", "CNDP", "RIB", "ICE"];
const SIGLES_FR = ["URSSAF", "CPAM", "TVA", "CDI", "CDD", "RGPD", "SIRET", "IBAN", "CSE", "SMIC"];

/* ------------------------------------------------------------------ CORE
   Sans pack : ce que tout cabinet, toute PME envoie. */
const core = {
  courrier(g) {
    const h = g.h, a = g.personne("mix"), b = g.personne("mix"), ma = h.pile(0.6);
    return `${ma ? g.ville("ma") : g.ville("fr")}, le ${g.date()}

${a.m}
${ma ? g.adresseMa() : g.adresseFr()}
Tél. : ${g.tel(ma ? "ma" : "fr")}

Objet : ${c(h, "votre demande de remboursement", "relance de paiement", "résiliation de contrat", "demande d'attestation")}

${c(h, "Madame, Monsieur", "Cher Monsieur", "Chère Madame")},

Je fais suite à notre échange du ${g.date()} avec ${c(h, "M.", "Mme")} ${g.nom(b.p)}. ${c(h,
      `La somme de ${g.montant()} reste due à ce jour.`,
      `Le solde de ${g.montant()} vous sera viré sous huitaine.`,
      `Le devis de ${g.montant()} est valable trente jours.`)}
${h.pile(0.5) ? phraseMot(g) + "\n" : ""}
Pour toute question, vous pouvez me joindre au ${g.tel(ma ? "ma" : "fr")} ou par courriel à ${g.email(a.p)}.
${ma ? `Pièce jointe : copie de la CIN n° ${g.cin()}.` : `N° de sécurité sociale : ${g.nir()}.`}

Veuillez agréer, ${c(h, "Madame, Monsieur", "Monsieur", "Madame")}, l'expression de mes salutations distinguées.

${a.m}`;
  },
  fiche(g) {
    const h = g.h, a = g.personne("ma"), ma = true;
    const ligne = (k, v) => `${k} : ${v}`;
    return [
      "FICHE CONTACT",
      ligne(c(h, "Nom et prénom", "Nom complet", "Identité"), a.m),
      ligne(c(h, "CIN", "N° CIN", "C.I.N"), g.cin()),
      ligne(c(h, "Date de naissance", "Né(e) le"), g.naissance()),
      ligne(c(h, "Adresse", "Domicile"), g.adresseMa()),
      ligne(c(h, "GSM", "Mobile", "Portable", "Tél."), g.tel("ma")),
      ligne(c(h, "Fixe", "Tél. bureau", "Autre numéro"), g.tel(h.pile(0.7) ? "ma" : "fr")),
      ligne(c(h, "E-mail", "Email", "Courriel"), g.email(a.p)),
      ligne(c(h, "Employeur", "Société"), g.societe(ma ? "ma" : "fr")),
      ligne("Ville de rattachement", g.ville("ma")),
      ligne(c(h, "Statut", "Remarque"), c(h, `client depuis le ${g.date()}`, `dossier ouvert le ${g.date()}`, `${g.sigle(SIGLES_MA)} à jour`)),
    ].join("\n");
  },
  mailTransfert(g) {
    const h = g.h, a = g.personne("mix"), b = g.personne("fr"), d = g.personne("ma");
    return `De : ${a.m} <${g.email(a.p)}>
À : ${b.m} <${g.email(b.p)}>
Date : ${g.date()}
Objet : TR: dossier ${c(h, "succession", "litige fournisseur", "recrutement", "sinistre auto")}

Bonjour ${g.prenom(b.p)},

Je te transfère le message de ${d.m}, qui souhaite être rappelé${h.pile(0.5) ? "e" : ""} au ${g.tel("ma")} (ou au ${g.tel("fr")} quand il est en France).
${c(h, `Son dernier versement de ${g.montant()} date du ${g.date()}.`, `Le budget validé est de ${g.montant()}.`, `Le ${g.date()}, rien n'avait encore été reçu.`)}
${phraseMot(g)}

Bien à toi,
${g.prenom(a.p)}

-- 
${a.m}
${c(h, "Responsable administratif", "Chargé de clientèle", "Assistante de direction")}
Ligne directe : ${g.tel(h.pile(0.5) ? "ma" : "fr")}`;
  },
};

/* ---------------------------------------------------------- TELECOM-MA */
const OFFRES = ["forfait 4G+ 20 Go", "Pass Internet 10 DH", "Fibre 100 Méga", "offre Jawal", "recharge *3", "Maroc Telecom", "inwi", "Orange Maroc", "roaming", "box 5G"];
const telecom = {
  transcription(g) {
    const h = g.h, cl = g.personne("ma", { ordre: h.pile(0.45) ? "bas" : "prenom-nom" }), cons = g.personne("ma");
    const l = [];
    l.push(`[Transcription automatique — appel entrant du ${g.date()}, durée ${g.mesure(["6 min 12 s", "184 secondes", "11 min", "3 min 40 s"])}]`);
    l.push(`Conseiller : ${c(h, "Salam, bonjour", "Bonjour", "Allô bonjour")}, service client, ${g.prenom(cons.p)} à l'appareil, je vous écoute.`);
    l.push(`Client : oui bonjour, c'est ${cl.m}, j'appelle pour ${c(h, "ma facture", "mon forfait", "une coupure de ligne", "un vol de téléphone")}.`);
    l.push(`Conseiller : très bien. Pour vérifier votre identité, vous pouvez me donner votre numéro de CIN ?`);
    l.push(`Client : ${c(h, "c'est", "alors", "oui,")} ${g.cin()}.`);
    l.push(`Conseiller : et le numéro concerné ?`);
    l.push(`Client : le ${g.tel("ma")}${h.pile(0.4) ? `, et j'ai aussi le ${g.tel("ma")} chez vous` : ""}.`);
    if (h.pile(0.6)) {
      l.push(`Conseiller : je vois une ${g.produit(OFFRES)} active depuis le ${g.date()}. Le terminal déclaré a l'IMEI ${g.imei()}, la SIM l'IMSI ${g.imsi()}.`);
    } else {
      l.push(`Conseiller : d'accord. Il me faut l'IMEI du téléphone, il est sous la batterie ou avec *#06#.`);
      l.push(`Client : attendez… voilà : ${g.imei()}.`);
    }
    l.push(`Client : ${c(h, "Inchallah", "Hamdoullah", "D'accord")}, et pour la facture de ${g.montant(c(h, "dirhams", "DH", "MAD"))} ?`);
    l.push(`Conseiller : je la régularise. Vous recevrez une confirmation par SMS et à l'adresse ${g.email(cl.p)}. Le dossier est noté au nom de ${c(h, "M.", "Mme")} ${g.nom(cl.p)}.`);
    l.push(`Client : merci, ${c(h, "choukran", "bonne journée", "au revoir")}.`);
    return l.join("\n");
  },
  ticket(g) {
    const h = g.h, cl = g.personne("ma");
    return `TICKET SAV n° ${L("MESURE", String(h.entier(100000, 999999)), "n-ticket")}
Ouvert le : ${g.date()}
Abonné : ${cl.m}
MSISDN : ${g.tel("ma")}
IMSI : ${g.imsi()}
IMEI : ${g.imei()}
ICCID : ${g.iccid()}
CIN : ${g.cin()}
Offre : ${g.produit(OFFRES)}
Symptôme : ${c(h, "perte de réseau 4G", "SIM bloquée (code PUK demandé)", "débit inférieur à 1 Mb/s", "appels coupés")}
Adresse d'installation : ${g.adresseMa()}
Remarque agent : client rappelé au ${g.tel("ma")} le ${g.date()}, ${c(h, "geste commercial de", "avoir de", "remboursement de")} ${g.montant(c(h, "DH", "MAD"))}. Mail de suivi envoyé à ${g.email(cl.p)}.`;
  },
  portabilite(g) {
    const h = g.h, cl = g.personne("ma"), soc = h.pile(0.4);
    return `DEMANDE DE PORTABILITÉ DU NUMÉRO
Titulaire : ${cl.m}${soc ? `, pour le compte de ${g.societe("ma")} (ICE ${g.ice()})` : ""}
Pièce d'identité : CIN ${g.cin()}
Numéro à porter : ${g.tel("ma")}
Opérateur donneur : ${g.produit(["Maroc Telecom", "inwi", "Orange Maroc"])}
Numéro de contact : ${g.tel(h.pile(0.8) ? "ma" : "fr")}
Date souhaitée : ${g.date()}

Je soussigné(e) ${cl.m} demande le portage de ma ligne conformément à la décision ${g.sigle(["ANRT"])} en vigueur. ${phraseMot(g)}`;
  },
};

/* --------------------------------------------------------- JURIDIQUE-FR */
const JURIDICTIONS = ["Conseil de prud'hommes de Lyon", "Tribunal judiciaire de Paris", "Cour d'appel de Bordeaux", "Tribunal de commerce de Nantes", "Tribunal judiciaire de Lille"];
const juridique = {
  conclusions(g) {
    const h = g.h, dem = g.personne(h.pile(0.5) ? "fr" : "ma"), av = g.personne("fr"), pdg = g.personne("fr"), tiers = g.personne("mix"), soc = g.societe("fr");
    return `${L("SIGLE", h.choix(JURIDICTIONS), "juridiction")}
RG n° ${P_RG(g)}

CONCLUSIONS EN DEMANDE

POUR : ${c(h, "Madame", "Monsieur")} ${dem.m}, né${h.pile(0.5) ? "e" : ""} le ${g.naissance()} à ${g.ville(h.pile(0.6) ? "fr" : "ma")}, demeurant ${g.adresseFr()},
ayant pour avocat Maître ${av.m}, avocat au Barreau de ${g.ville("fr")}, joignable au ${g.tel("fr")} et à ${g.email(av.p)}.

CONTRE : La société ${soc}, immatriculée au RCS de ${g.ville("fr")} sous le n° ${g.siren()}, SIRET ${g.siret()},
dont le siège est ${g.adresseFr()}, prise en la personne de son Président, M. ${pdg.m}.

PLAISE AU ${c(h, "CONSEIL", "TRIBUNAL")}

${c(h, "Madame", "Monsieur")} ${g.nom(dem.p)} a été engagé${h.pile(0.5) ? "e" : ""} le ${g.date()} moyennant une rémunération brute mensuelle de ${g.montant("euros")}.
Le ${g.date()}, M. ${g.nom(pdg.p)} lui a notifié un licenciement pour faute grave. Il lui est reproché un échange avec ${tiers.m}, salarié d'un concurrent.
Or, l'${g.article("fr")} impose au juge d'apprécier la régularité de la procédure, et la jurisprudence (${L("ARTICLE", "Soc., 27 septembre 2023, n° 21-24.782", "jurisprudence")}) rappelle que la faute grave rend impossible le maintien du salarié.
${phraseMot(g)}

PAR CES MOTIFS, condamner la société au paiement de ${g.montant("€")} au titre de l'${g.article("fr")}.

Maître ${g.nom(av.p)}`;
  },
  assignation(g) {
    const h = g.h, dem = g.personne("ma"), def = g.personne("fr"), huis = g.personne("fr");
    return `ASSIGNATION DEVANT LE ${L("SIGLE", "Tribunal judiciaire de Paris")}

L'an deux mille vingt-six et le ${g.date()},
À la requête de : ${dem.m}, de nationalité marocaine, titulaire de la CIN ${g.cin()}, demeurant ${g.adresseMa()}, élisant domicile au cabinet de son conseil.
J'ai, ${huis.m}, commissaire de justice, donné assignation à :
${def.m}, né le ${g.naissance()}, demeurant ${g.adresseFr()}, N° de sécurité sociale ${g.nir()}.

OBJET : paiement d'une somme de ${g.montant("€")}, outre intérêts au taux légal à compter du ${g.date()}, sur le fondement de l'${g.article("fr")}.
La partie requérante peut être contactée au ${g.tel("ma")} ; la partie assignée au ${g.tel("fr")}.
Référence parquet : ${P_PARQUET(g)}.`;
  },
  noteDossier(g) {
    const h = g.h, cli = g.personne("mix"), adv = g.personne("mix"), soc = g.societe(h.pile(0.5) ? "fr" : "ma");
    return `NOTE INTERNE — dossier ${cli.m} c/ ${soc}
RG ${P_RG(g)} — audience le ${g.date()}

1. Le client (${g.email(cli.p)}, ${g.tel(h.pile(0.5) ? "fr" : "ma")}) conteste la résiliation notifiée le ${g.date()}.
2. La partie adverse, représentée par ${adv.m}, invoque l'${g.article("fr")} et l'${g.article("fr")}.
3. Pourvoi du client en cours (n° [[RG|pourvoi:${h.entier(19, 26)}-${h.entier(10, 99)}.${h.chiffres(3)}]]) : à surveiller.
4. Société adverse : SIREN ${g.siren()}. Préjudice chiffré à ${g.montant("€")}, honoraires de ${g.montant("€")} HT (${g.sigle(SIGLES_FR)} incluse).
${phraseMot(g)}`;
  },
};
function P_RG(g) { return `[[RG|rg:${g.h.entier(19, 26)}/${String(g.h.entier(1, 99999)).padStart(5, "0")}]]`; }
function P_PARQUET(g) { return `[[RG|parquet:${g.h.chiffres(2)} ${g.h.chiffres(3)} ${g.h.chiffres(6)}]]`; }

/* ----------------------------------------------------- BANQUE-ASSURANCE */
const banque = {
  releve(g) {
    const h = g.h, tit = g.personne("ma"), ma = h.pile(0.7);
    const lignes = Array.from({ length: h.entier(3, 6) }, () => {
      const t = g.personne("mix");
      return `${g.date()} | ${c(h, "VIR RECU DE", "VIREMENT EMIS VERS", "PRLV", "CHQ REMIS")} ${t.m} | ${g.montant(ma ? "MAD" : "EUR")}`;
    });
    return `RELEVÉ DE COMPTE — période du ${g.date()} au ${g.date()}
Titulaire : ${tit.m}
${ma ? `RIB : ${g.ribMa()}\nIBAN : ${g.ibanMa()}\nBIC : ${g.bic("MA")}` : `IBAN : ${g.ibanFr()}\nBIC : ${g.bic("FR")}`}
Agence : ${g.ville(ma ? "ma" : "fr")}

Date | Libellé | Montant
${lignes.join("\n")}

Solde au ${g.date()} : ${g.montant(ma ? "MAD" : "EUR")}
Conseiller : ${g.personne("mix").m}, ${g.tel(ma ? "ma" : "fr")}`;
  },
  virement(g) {
    const h = g.h, don = g.personne("mix"), ben = g.personne("mix"), fr = h.pile(0.4);
    return `ORDRE DE VIREMENT ${c(h, "PERMANENT", "OCCASIONNEL", "INTERNATIONAL")}
Donneur d'ordre : ${don.m}, CIN ${g.cin()}
Compte à débiter : ${g.ribMa()}
Bénéficiaire : ${ben.m}
IBAN du bénéficiaire : ${fr ? g.ibanFr() : g.ibanMa()}
BIC : ${g.bic(fr ? "FR" : "MA")}
Montant : ${g.montant(fr ? "EUR" : "MAD")}
Motif : ${c(h, "loyer", "frais de scolarité", "remboursement prêt familial", "honoraires")} — date d'exécution ${g.date()}
${phraseMot(g)}
Fait à ${g.ville("ma")}, signature : ${don.m}`;
  },
  sinistre(g) {
    const h = g.h, ass = g.personne("ma"), tiers = g.personne("mix");
    return `DÉCLARATION DE SINISTRE
Police n° ${`[[POLICE:${h.choix(["POL", "AUTO", "MRH"])}-${h.lettres(2)}-${h.chiffres(6)}]]`}
Sinistre n° ${`[[SINISTRE:${h.lettres(3)}${h.entier(2023, 2026)}${h.chiffres(5)}]]`}
Assuré : ${ass.m}, né le ${g.naissance()}, CIN ${g.cin()}
Adresse : ${g.adresseMa()}
Téléphone : ${g.tel("ma")} — Courriel : ${g.email(ass.p)}
Survenu le ${g.date()} à ${g.ville("ma")}. Tiers impliqué : ${tiers.m}, joignable au ${g.tel(h.pile(0.7) ? "ma" : "fr")}.
Estimation des dommages : ${g.montant("MAD")}. Franchise contractuelle : ${g.montant("MAD")}.
Indemnité à verser sur le RIB ${g.ribMa()}. Garantie ${g.sigle(["RC", "AMO", "TVA"])} hors champ.`;
  },
};

/* --------------------------------------------------------------- SANTÉ */
const DCI = ["paracétamol 1 g", "amoxicilline 1 g", "metformine 850 mg", "ibuprofène 400 mg", "oméprazole 20 mg", "Doliprane 1000 mg", "insuline glargine"];
const EXAMENS = ["IRM", "ECG", "HbA1c", "NFS", "scanner thoracique", "échographie abdominale"];
const sante = {
  compteRendu(g) {
    const h = g.h, pat = g.personne("mix"), med = g.personne("mix"), confrere = g.personne("mix");
    return `COMPTE RENDU DE CONSULTATION — ${c(h, "Cardiologie", "Endocrinologie", "Médecine interne", "Pneumologie")}
Patient : ${pat.m} — IPP ${`[[PATIENT:${h.chiffres(h.choix([7, 8, 9]))}]]`}
Né(e) le ${g.naissance()} — CIN ${g.cin()} — AMO n° ${g.cnss()}
Adresse : ${g.adresseMa()} — Tél. : ${g.tel("ma")}
Médecin : Dr ${med.m} (INPE ${`[[PRATICIEN:${h.chiffres(9)}]]`})

Motif : ${c(h, "douleur thoracique", "déséquilibre glycémique", "dyspnée d'effort", "bilan annuel")} depuis le ${g.date()}.
Examen : TA 13/8, poids ${g.mesure(["72 kg", "88 kg", "64 kg"])}. ${g.produit(EXAMENS)} réalisé${h.pile(0.5) ? "e" : ""} le ${g.date()}.
Traitement : ${g.produit(DCI)}, ${g.mesure(["2 cp/j", "1 cp matin et soir", "pendant 7 jours"])}.
Adressé par le Dr ${g.nom(confrere.p)}. Reprise du travail prévue le ${g.date()}. ${phraseMot(g)}
Consultation : ${g.montant("DH")}, prise en charge ${g.sigle(["AMO", "CNOPS", "CNSS"])}.`;
  },
  lettreLiaison(g) {
    const h = g.h, pat = g.personne("fr"), med = g.personne("ma"), proche = g.personne("mix");
    return `LETTRE DE LIAISON — sortie du ${g.date()}
Cher confrère,
J'ai pris en charge ${c(h, "Mme", "M.")} ${pat.m}, né${h.pile(0.5) ? "e" : ""} le ${g.naissance()}, NIR ${g.nir()}, dossier n° ${`[[PATIENT:${h.entier(2019, 2026)}-${h.chiffres(6)}]]`}.
Personne de confiance : ${proche.m}, ${g.tel(h.pile(0.5) ? "fr" : "ma")}.
Antécédents : diabète de type 2 (${g.produit(EXAMENS)} à 7,2 %). Traitement de sortie : ${g.produit(DCI)}.
Le patient réside ${g.adresseFr()} ; joignable au ${g.tel("fr")} ou par courriel ${g.email(pat.p)}.
${phraseMot(g)}
Bien confraternellement, Dr ${med.m}, RPPS ${`[[PRATICIEN:${h.chiffres(11)}]]`}.`;
  },
  ordonnance(g) {
    const h = g.h, pat = g.personne("ma"), med = g.personne("ma");
    return `Dr ${med.m} — ${c(h, "Médecin généraliste", "Pédiatre", "Gynécologue")} — ${g.ville("ma")}
INPE ${`[[PRATICIEN:${h.chiffres(9)}]]`} — Tél. cabinet : ${g.tel("ma")}

Le ${g.date()}
${c(h, "Mme", "M.", "Enfant")} ${pat.m}, ${h.entier(2, 85)} ans, CNOPS n° ${g.cnss()}

1) ${g.produit(DCI)} — ${g.mesure(["3 fois par jour", "1 sachet le soir", "pendant 5 jours"])}
2) ${g.produit(DCI)} — ${g.mesure(["si douleur", "matin à jeun", "2 cp/j"])}
Lot délivré : [[FACTURE|lot:${h.lettres(2)}${h.chiffres(5)}]]`;
  },
};

/* -------------------------------------------------- EXPERTISE-COMPTABLE */
const comptable = {
  facture(g) {
    const h = g.h, fr = h.pile(0.3), four = g.societe(fr ? "fr" : "ma"), cli = g.societe("ma"), contact = g.personne("mix");
    return `FACTURE n° [[FACTURE:${h.choix(["FA", "FAC", "F"])}-${h.entier(2024, 2026)}-${h.chiffres(4)}]] du ${g.date()}
Émetteur : ${four}
${fr ? `SIRET ${g.siret()} — TVA ${g.tva()}` : `ICE ${g.ice()} — IF ${g.if()} — RC ${g.ville("ma")} ${g.rc()} — Patente ${g.patente()}`}
Adresse : ${fr ? g.adresseFr() : g.adresseMa()}

Client : ${cli} — ICE ${g.ice()} — RC ${g.rc()}
À l'attention de ${contact.m} (${g.email(contact.p)})

Désignation | Qté | PU HT | Total HT
${c(h, "Mission de révision des comptes", "Tenue comptable trimestrielle", "Établissement de la liasse fiscale")} | ${g.mesure(["1", "3", "12"])} | ${g.montant("MAD")} | ${g.montant("MAD")}
Total HT : ${g.montant("MAD")} — ${g.sigle(["TVA"])} 20 % : ${g.montant("MAD")} — Total TTC : ${g.montant("MAD")}
Règlement par virement : ${fr ? g.ibanFr() : g.ribMa()} — échéance ${g.date()}.`;
  },
  grandLivre(g) {
    const h = g.h;
    const lignes = Array.from({ length: h.entier(4, 7) }, () => {
      const t = h.pile(0.5) ? g.personne("ma").m : g.societe("ma");
      return `${g.date()} | ${g.compte()} | ${c(h, "Facture", "Règlement", "Avoir")} ${t} | ${g.montant("MAD")}`;
    });
    return `EXTRAIT DU GRAND LIVRE — exercice ${L("DATE", String(h.entier(2023, 2025)), "annee")}
Dossier : ${g.societe("ma")} — ICE ${g.ice()} — IF ${g.if()} — CNSS ${g.cnssEmployeur()}
Plan comptable : ${g.sigle(["PCGE", "CGNC"])}

Date | Compte | Libellé | Montant
${lignes.join("\n")}

Contrôle : écart de ${g.montant("MAD")} sur le compte ${g.compte()}, à justifier avec ${g.personne("mix").m} (${g.tel("ma")}).`;
  },
  lettreMission(g) {
    const h = g.h, dir = g.personne("ma"), ec = g.personne("mix");
    return `LETTRE DE MISSION
Entre ${g.societe("ma")}, ICE ${g.ice()}, RC ${g.ville("ma")} n° ${g.rc()}, représentée par ${dir.m}, CIN ${g.cin()},
et le cabinet d'expertise comptable représenté par ${ec.m}, ${g.email(ec.p)}, ${g.tel("ma")}.
Mission : tenue, déclarations ${g.sigle(["TVA", "IS", "IR"])} et liasse ${g.sigle(["DGI"])}, honoraires annuels de ${g.montant("MAD")}, à compter du ${g.date()}.
Les télédéclarations SIMPL sont faites au nom de l'entreprise (IF ${g.if()}). ${phraseMot(g)}`;
  },
};

/* --------------------------------------------------------------- RH-PAIE */
const rh = {
  bulletinMa(g) {
    const h = g.h, sal = g.personne("ma", { ordre: h.pile(0.5) ? "NOM-prenom" : "auto" });
    return `BULLETIN DE PAIE — ${c(h, "janvier", "mars", "juin", "septembre", "décembre")} ${L("DATE", "2026", "annee")}
Employeur : ${g.societe("ma")} — ICE ${g.ice()} — CNSS employeur ${g.cnssEmployeur()} — IF ${g.if()}
Salarié : ${sal.m}
Matricule : [[MATRICULE:${h.choix(["", "M", "EMP-"])}${h.chiffres(h.choix([4, 5, 6]))}]]
CIN : ${g.cin()} — N° CNSS : ${g.cnss()}
Date d'embauche : ${g.date()} — Emploi : ${c(h, "technicien", "comptable", "chef d'équipe", "opératrice")} — ${g.sigle(["CDI", "CDD"])}
Adresse : ${g.adresseMa()}

Salaire de base | ${g.montant("MAD")}
Prime d'ancienneté | ${g.montant("MAD")}
Cotisation ${g.sigle(["CNSS"])} | ${g.montant("MAD")}
${g.sigle(["AMO"])} | ${g.montant("MAD")}
${g.sigle(["IR"])} | ${g.montant("MAD")}
Net à payer | ${g.montant("MAD")}
Virement sur : ${g.ribMa()}`;
  },
  bulletinFr(g) {
    const h = g.h, sal = g.personne(h.pile(0.5) ? "fr" : "ma");
    return `BULLETIN DE SALAIRE — période du ${g.date()} au ${g.date()}
Employeur : ${g.societe("fr")} — SIRET ${g.siret()} — ${g.sigle(["URSSAF"])} de ${g.ville("fr")}
Salarié : ${sal.m} — Matricule [[MATRICULE:${h.chiffres(5)}]]
N° de sécurité sociale : ${g.nir()}
Adresse : ${g.adresseFr()}
Convention collective : ${c(h, "Syntec", "Commerce de gros", "Métallurgie")} — ${g.sigle(["CDI", "CDD"])}

Salaire de base | ${g.montant("€")}
Heures supplémentaires | ${g.montant("€")}
${g.sigle(["CSG", "CRDS", "CSG"])} | ${g.montant("€")}
Net à payer avant impôt | ${g.montant("€")}
Payé le ${g.date()} sur ${g.ibanFr()}`;
  },
  attestation(g) {
    const h = g.h, sal = g.personne("mix"), drh = g.personne("mix");
    return `ATTESTATION DE TRAVAIL
Je soussigné(e) ${drh.m}, ${c(h, "DRH", "gérant", "directrice administrative")} de ${g.societe("ma")} (ICE ${g.ice()}, RC ${g.rc()}),
atteste que ${c(h, "M.", "Mme")} ${sal.m}, titulaire de la CIN ${g.cin()} et immatriculé${h.pile(0.5) ? "e" : ""} à la ${g.sigle(["CNSS"])} sous le n° ${g.cnss()},
est employé${h.pile(0.5) ? "e" : ""} depuis le ${g.date()} en qualité de ${c(h, "responsable logistique", "assistante comptable", "ingénieur réseau")}, en ${g.sigle(["CDI"])}, pour un salaire mensuel brut de ${g.montant("MAD")}.
Contact RH : ${g.emailGenerique()} — ${g.tel("ma")}. Conformément à l'${g.article("ma")}, cette attestation est délivrée pour servir et valoir ce que de droit.
${phraseMot(g)}
Fait à ${g.ville("ma")}, le ${g.date()}.`;
  },
};

/* Le plan du jeu : pour chaque pack, ses gabarits et le nombre de documents
   PAR gabarit. */
export const PLAN = {
  core:                  { packs: [],                      gabarits: core,      n: 14 },
  "telecom-ma":          { packs: ["telecom-ma"],          gabarits: telecom,   n: 12 },
  "juridique-fr":        { packs: ["juridique-fr"],        gabarits: juridique, n: 12 },
  "banque-assurance":    { packs: ["banque-assurance"],    gabarits: banque,    n: 12 },
  sante:                 { packs: ["sante"],               gabarits: sante,     n: 12 },
  "expertise-comptable": { packs: ["expertise-comptable"], gabarits: comptable, n: 12 },
  "rh-paie":             { packs: ["rh-paie"],             gabarits: rh,        n: 12 },
};
