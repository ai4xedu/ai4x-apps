// ============================================================================
// HT-BENCH — la fabrique : une valeur synthétique → sa balise.
// Chaque méthode rend du texte balisé (cf. balisage.mjs) ; les gabarits
// n'écrivent jamais une valeur sensible à la main.
// ============================================================================
import { P, L } from "./balisage.mjs";
import * as I from "./identifiants.mjs";
import { personneMaghreb, personneFr, nomSeul, personneArabe, personneArabizi } from "./noms.mjs";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const ascii = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/[’']/g, "").toLowerCase();

const RUES_MA = ["rue Ibn Battouta", "boulevard Zerktouni", "avenue Hassan II", "rue Al Moutanabbi", "boulevard d'Anfa", "rue Oued Sebou",
  "avenue des FAR", "rue Moulay Youssef", "boulevard Ghandi", "rue Allal Ben Abdellah", "avenue Mohammed VI", "rue Tarik Ibn Ziad", "rue Jbel Toubkal"];
const QUARTIERS_MA = ["Maârif", "Hay Riad", "Agdal", "Gauthier", "Bourgogne", "Hay Mohammadi", "Sidi Maârouf", "Guéliz", "Hivernage", "Souissi", "Talborjt", "Malabata"];
const VILLES_MA = [["Casablanca", "20"], ["Rabat", "10"], ["Marrakech", "40"], ["Tanger", "90"], ["Fès", "30"], ["Agadir", "80"], ["Oujda", "60"], ["Meknès", "50"], ["Kénitra", "14"], ["Tétouan", "93"]];
const RUES_FR = ["rue Paul Bert", "avenue des Tilleuls", "impasse des Lilas", "boulevard Voltaire", "rue de la République", "allée des Peupliers",
  "chemin des Vignes", "place du Marché", "rue Victor Hugo", "quai de la Fosse", "rue des Écoles", "avenue Jean Jaurès"];
const VILLES_FR = [["Lyon", "6900"], ["Paris", "750"], ["Bordeaux", "3300"], ["Nantes", "4400"], ["Lille", "5900"], ["Marseille", "130"], ["Toulouse", "3100"], ["Strasbourg", "6700"], ["Montpellier", "3400"], ["Rennes", "3500"]];
// Écriture arabe : voies, quartiers, villes, mois (calendrier marocain).
const RUES_AR = ["ابن بطوطة", "المتنبي", "واد سبو", "مولاي يوسف", "علال بن عبد الله", "طارق بن زياد", "جبل توبقال", "الزرقطوني", "الحسن الثاني", "محمد الخامس", "أنفا"];
const QUARTIERS_AR = ["المعاريف", "الرياض", "أكدال", "بوركون", "المحمدي", "سيدي معروف", "جليز", "السويسي", "تالبرجت", "النهضة"];
const RESIDENCES_AR = ["الأندلس", "النور", "الأمل", "الياسمين", "الحدائق"];
const LOTISSEMENTS_AR = ["الوفاء", "الصفاء", "رياض السلام", "المسيرة"];
const DOUARS_AR = ["أولاد أحمد", "تافراوت", "لمحاميد", "أيت عمي"];
export const VILLES_AR = ["الدار البيضاء", "الرباط", "مراكش", "طنجة", "فاس", "أكادير", "وجدة", "مكناس", "القنيطرة", "تطوان"];
const MOIS_AR = ["يناير", "فبراير", "مارس", "أبريل", "ماي", "يونيو", "يوليوز", "غشت", "شتنبر", "أكتوبر", "نونبر", "دجنبر"];
const SOC_RACINES = ["Atlas", "Maghreb", "Vectura", "Sahara", "Anfa", "Oasis", "Argane", "Cèdre", "Horizon", "Medina", "Zénith", "Rif", "Tingis", "Alpha", "Lumière", "Azur"];
const SOC_METIERS = ["Négoce", "Logistique", "Distribution", "Conseil", "Bâtiment", "Textile", "Agro", "Services", "Immobilier", "Transports", "Industries", "Informatique"];

export function fabrique(h) {
  const g = {
    h,
    personne(origine = "mix", opts = {}) {
      const ma = origine === "ma" || (origine === "mix" && h.pile(0.62));
      const p = ma ? personneMaghreb(h, opts) : personneFr(h, opts);
      return { m: P("PERSONNE", p), p };
    },
    nom: (p) => P("PERSONNE", nomSeul(p)),
    prenom: (p) => P("PERSONNE", { valeur: p.prenom, variante: p.variante, traits: ["prenom-seul"] }),
    email(p) {
      // Un nom en lettres arabes a une adresse en lettres latines.
      if (p.latin) p = p.latin;
      const pr = ascii(p.prenom).replace(/\s+/g, "-"), no = ascii(p.nom).replace(/\s+/g, "");
      const dom = h.choix(["example.com", "example.org", "example.net", "mail.example", "societe.example.ma", "cabinet.example.fr"]);
      return h.choix([
        P("EMAIL", { valeur: `${pr}.${no}@${dom}`, variante: "prenom.nom" }),
        P("EMAIL", { valeur: `${pr[0]}.${no}@${dom}`, variante: "initiale.nom" }),
        P("EMAIL", { valeur: `${pr.replace(/-/g, "")}${no}${h.entier(1, 99)}@${dom}`, variante: "prenomnom-chiffres" }),
        P("EMAIL", { valeur: `${no}_${pr}@${dom}`, variante: "nom_prenom" }),
        P("EMAIL", { valeur: `${pr}.${no}@${dom}`.toUpperCase(), variante: "majuscules" }),
      ]);
    },
    /* Écriture arabe et arabizi : les mêmes valeurs, d'autres écritures. */
    personneAr(opts = {}) {
      const p = personneArabe(h, opts);
      return { m: P("PERSONNE", p), p };
    },
    personneArabizi(opts = {}) {
      const p = personneArabizi(h, opts);
      return { m: P("PERSONNE", p), p };
    },
    /* La même personne en lettres latines, dans un document bilingue. */
    latin: (p) => P("PERSONNE", { valeur: `${p.latin.prenom} ${p.latin.nom}`, variante: "mag-translitteration", traits: ["bilingue"] }),
    latinNom: (p) => P("PERSONNE", { valeur: p.latin.nom, variante: "mag-translitteration", traits: ["bilingue", "nom-seul"] }),
    telAr: () => P("TEL", I.telMaArabe(h)),
    cinAr: () => P("CIN", I.cinArabe(h)),
    ribAr: () => P("RIB", I.ribMaArabe(h)),
    cnssAr: () => P("CNSS", I.cnssArabe(h)),
    /* L'adresse en arabe : comme adresseMa, la voie est étiquetée, la ville
       qui suit ne l'est pas. Les numéros sont écrits tantôt en chiffres
       latins, tantôt en chiffres arabes orientaux. */
    adresseAr() {
      const n = (a, b) => { const x = String(h.entier(a, b)); return h.pile(0.4) ? I.enChiffresArabes(x) : x; };
      const ville = h.choix(VILLES_AR);
      return h.choix([
        `${P("ADRESSE", { valeur: `رقم ${n(1, 180)}، زنقة ${h.choix(RUES_AR)}، حي ${h.choix(QUARTIERS_AR)}`, variante: "ar-rue" })}، ${ville}`,
        `${P("ADRESSE", { valeur: `${n(1, 180)} شارع ${h.choix(RUES_AR)}`, variante: "ar-rue" })}، ${ville}`,
        `${P("ADRESSE", { valeur: `إقامة ${h.choix(RESIDENCES_AR)}، عمارة ${n(1, 30)}، شقة ${n(1, 40)}، حي ${h.choix(QUARTIERS_AR)}`, variante: "ar-residence" })}، ${ville}`,
        `${P("ADRESSE", { valeur: `تجزئة ${h.choix(LOTISSEMENTS_AR)} رقم ${n(1, 600)}`, variante: "ar-lotissement" })}، ${ville}`,
        `${P("ADRESSE", { valeur: `دوار ${h.choix(DOUARS_AR)} رقم ${n(1, 300)}`, variante: "ar-douar" })}، ${ville}`,
      ]);
    },
    villeAr: () => L("VILLE", h.choix(VILLES_AR), "ar"),
    montantAr() {
      const v = String(h.choix([h.entier(120, 999), h.entier(1000, 99999), h.entier(1000, 99999)]));
      return h.choix([
        L("MONTANT", `${I.enChiffresArabes(v)} درهم`, "ar-chiffres-arabes"),
        L("MONTANT", `${v.replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${h.chiffres(2)} درهم`, "ar"),
        L("MONTANT", `${v} د.م.`, "ar"),
      ]);
    },
    dateAr() {
      const j = h.entier(1, 28), m = h.entier(1, 12), a = h.entier(2019, 2026);
      const jj = String(j).padStart(2, "0"), mm = String(m).padStart(2, "0");
      return h.choix([
        L("DATE", `${j} ${MOIS_AR[m - 1]} ${a}`, "ar-lettres"),
        L("DATE", `${I.enChiffresArabes(String(j))} ${MOIS_AR[m - 1]} ${I.enChiffresArabes(String(a))}`, "ar-lettres-chiffres-arabes"),
        L("DATE", I.enChiffresArabes(`${jj}/${mm}/${a}`), "ar-chiffres-arabes"),
        L("DATE", `${jj}/${mm}/${a}`, "jj-mm-aaaa"),
      ]);
    },
    emailGenerique: () => P("EMAIL", { valeur: `${h.choix(["contact", "service.client", "rh", "compta", "secretariat", "sinistres"])}@${h.choix(["example.com", "societe.example.ma", "example.fr"])}`, variante: "generique" }),
    tel: (pays = "ma") => P("TEL", pays === "fr" ? I.telFr(h) : I.telMa(h)),
    cin: () => P("CIN", I.cin(h)),
    nir: () => P("NIR", I.nir(h)),
    cnss: () => P("CNSS", I.cnss(h)),
    cnssEmployeur: () => P("CNSS", I.cnssEmployeur(h)),
    ice: () => P("ICE", I.ice(h)),
    if: () => P("IF", I.ifiscal(h)),
    rc: () => P("RC", I.rc(h)),
    patente: () => P("PATENTE", I.patente(h)),
    siren: () => P("SIREN", I.siren(h)),
    siret: () => P("SIRET", I.siret(h)),
    tva: () => P("TVA", I.tvaFr(h)),
    ribMa: () => P("RIB", I.ribMa(h)),
    ribFr: () => P("RIB", I.ribFr(h)),
    ibanMa: () => P("IBAN", I.ibanMa(h)),
    ibanFr: () => P("IBAN", I.ibanFr(h)),
    bic: (pays) => P("BIC", I.bic(h, pays)),
    imei: () => P("IMEI", I.imei(h)),
    imsi: () => P("IMSI", I.imsi(h)),
    iccid: () => P("ICCID", I.iccid(h)),
    /* L'adresse étiquetée, c'est la voie (numéro, rue, résidence, quartier).
       Le code postal et la ville qui la suivent ne sont pas étiquetés : le
       moteur peut les coder avec l'adresse, ou les laisser lisibles (une
       ville seule, elle, est un leurre — cf. ville()). */
    adresseMa() {
      const [v, cp] = h.choix(VILLES_MA);
      const ville = v;
      return h.choix([
        `${P("ADRESSE", { valeur: `${h.entier(1, 180)}, ${h.choix(RUES_MA)}, ${h.choix(QUARTIERS_MA)}`, variante: "ma-rue" })}, ${cp}${h.chiffres(3)} ${ville}`,
        `${P("ADRESSE", { valeur: `Résidence ${h.choix(["Al Andalous", "Les Jardins", "Nour", "Al Amal", "Yasmine"])}, Imm. ${h.entier(1, 30)}, Appt ${h.entier(1, 40)}, ${h.choix(QUARTIERS_MA)}`, variante: "ma-residence" })}, ${ville}`,
        `${P("ADRESSE", { valeur: `Lotissement ${h.choix(["Al Wafa", "Assafa", "Riad Salam", "Al Massira"])} n° ${h.entier(1, 600)}`, variante: "ma-lotissement" })}, ${ville}`,
        `${P("ADRESSE", { valeur: `${h.choix(["Douar", "Hay"])} ${h.choix(["Ouled Ahmed", "Tafraout", "Lamhamid", "Ennahda"])} n° ${h.entier(1, 300)}`, variante: "ma-douar-hay" })}, ${ville}`,
      ]);
    },
    adresseFr() {
      const [v, cp] = h.choix(VILLES_FR);
      const cpx = cp + h.chiffres(5 - cp.length);
      const ville = v;
      return h.choix([
        `${P("ADRESSE", { valeur: `${h.entier(1, 140)} ${h.choix(RUES_FR)}`, variante: "fr-rue" })}, ${cpx} ${ville}`,
        `${P("ADRESSE", { valeur: `${h.entier(1, 40)} bis ${h.choix(RUES_FR)}`, variante: "fr-bis" })}, ${cpx} ${ville}`,
        `${P("ADRESSE", { valeur: `Bâtiment ${h.choix(["A", "B", "C"])}, ${h.entier(1, 90)} ${h.choix(RUES_FR)}`, variante: "fr-batiment" })}, ${cpx} ${ville} Cedex`,
      ]);
    },
    societe(pays = "ma") {
      const nom = `${h.choix(SOC_RACINES)} ${h.choix(SOC_METIERS)}`;
      const forme = pays === "fr" ? h.choix(["SAS", "SARL", "SA", "SASU", "EURL"]) : h.choix(["SARL", "SA", "SARL AU", "SNC"]);
      return h.choix([
        P("SOCIETE", { valeur: `${nom.toUpperCase()} ${forme}`, variante: "majuscules" }),
        P("SOCIETE", { valeur: `${nom} ${forme}`, variante: "casse-titre" }),
        P("SOCIETE", { valeur: `Société ${nom} ${forme}`, variante: "societe-forme" }),
      ]);
    },
    naissance() {
      const j = h.entier(1, 28), m = h.entier(1, 12), a = h.entier(1950, 2004);
      return h.choix([
        P("NAISSANCE", { valeur: `${j} ${MOIS[m - 1]} ${a}`, variante: "lettres" }),
        P("NAISSANCE", { valeur: `${String(j).padStart(2, "0")}/${String(m).padStart(2, "0")}/${a}`, variante: "jj-mm-aaaa" }),
      ]);
    },
    // ---------------------------------------------------------- leurres
    montant(devise = h.choix(["MAD", "DH", "dirhams", "€", "EUR"])) {
      const n = h.choix([h.entier(120, 999), h.entier(1000, 99999), h.entier(1000, 99999), h.entier(100000, 9999999)]);
      const groupes = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, h.choix([" ", " ", ".", " "]));
      const dec = h.pile(0.6) ? `,${h.chiffres(2)}` : "";
      return L("MONTANT", `${groupes}${dec} ${devise}`, n >= 100000 ? "grand" : n >= 1000 ? "milliers" : "centaines");
    },
    date() {
      const j = h.entier(1, 28), m = h.entier(1, 12), a = h.entier(2019, 2026);
      return h.choix([
        L("DATE", `${String(j).padStart(2, "0")}/${String(m).padStart(2, "0")}/${a}`, "jj-mm-aaaa"),
        L("DATE", `${j} ${MOIS[m - 1]} ${a}`, "lettres"),
        L("DATE", `${a}-${String(m).padStart(2, "0")}-${String(j).padStart(2, "0")}`, "iso"),
        L("DATE", `${String(j).padStart(2, "0")}.${String(m).padStart(2, "0")}.${a}`, "points"),
      ]);
    },
    article(pays = "fr") {
      return pays === "ma"
        ? h.choix([
          L("ARTICLE", "article 6 de la loi n° 09-08", "loi-ma"),
          L("ARTICLE", "Dahir n° 1-03-194", "dahir"),
          L("ARTICLE", "article 53 du Code du travail", "code-ma"),
          L("ARTICLE", "décret n° 2-04-469", "decret-ma"),
          L("ARTICLE", "article 230 du D.O.C.", "doc"),
          L("ARTICLE", "loi n° 31-08", "loi-ma"),
        ])
        : h.choix([
          L("ARTICLE", "article L. 1235-1 du Code du travail", "code-fr"),
          L("ARTICLE", "article 1240 du Code civil", "code-fr"),
          L("ARTICLE", "article 700 du Code de procédure civile", "code-fr"),
          L("ARTICLE", "article L. 3141-3", "code-fr"),
          L("ARTICLE", "article R. 4624-31", "code-fr"),
          L("ARTICLE", "article 1103 du Code civil", "code-fr"),
          L("ARTICLE", "Soc., 27 septembre 2023, n° 21-24.782", "jurisprudence"),
        ]);
    },
    sigle: (liste) => L("SIGLE", h.choix(liste)),
    ville: (pays = "ma") => L("VILLE", h.choix(pays === "fr" ? VILLES_FR : VILLES_MA)[0]),
    produit: (liste) => L("PRODUIT", h.choix(liste)),
    mesure: (liste) => L("MESURE", h.choix(liste)),
    compte: () => L("COMPTE", h.choix(["4411", "3421", "6111", "6121", "5141", "4455", "411000", "401000", "512100", "706000", "445660", "7111"])),
  };
  return g;
}
