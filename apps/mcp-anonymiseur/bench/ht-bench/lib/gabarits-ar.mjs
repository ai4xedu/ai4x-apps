// ============================================================================
// HT-BENCH — gabarits en écriture arabe, bilingues et en arabizi.
//
// Ce qu'un cabinet marocain reçoit vraiment : un courrier ou une attestation
// en arabe, une fiche bilingue où la même personne est écrite dans les deux
// écritures, un paragraphe qui passe du français à l'arabe, des numéros en
// chiffres arabes orientaux (٠٦٦١…), un export WhatsApp ou une transcription
// d'appel en darija écrite en lettres latines (3 = ع, 7 = ح, 9 = ق).
//
// Chaque gabarit porte sa langue (« ar », « fr-ar », « darija-latin ») : le
// rapport donne le rappel et les leurres codés langue par langue. Les mots
// arabes ou darija qui ressemblent à un prénom (سعيد, كريم, Mabrouk…) et les
// mots courants de la darija (wakha, safi, 3afak…) sont des leurres : l'IA
// doit pouvoir les lire.
// ============================================================================
import { L, P } from "./balisage.mjs";

const c = (h, ...options) => h.choix(options);
const avec = (langue, gabarits) => { for (const f of Object.values(gabarits)) f.langue = langue; return gabarits; };
/* Marque gauche-à-droite : WhatsApp la pose devant un numéro partagé. */
const LRM = "‎";

/* Une phrase arabe avec un mot courant qui est aussi un prénom. */
function phraseAr(g) {
  return g.h.choix([
    `عيد ${L("MOT", "سعيد", "arabe")} وكل عام وأنتم بخير.`,
    `الله ${L("MOT", "كريم", "arabe")}، سنجد حلا لهذا المشكل.`,
    `${L("MOT", "صباح", "arabe")} الخير، أرجو أن تكونوا في أحسن حال.`,
    `عندنا ${L("MOT", "أمل", "arabe")} كبير في تسوية الملف قريبا.`,
    `انقطع ${L("MOT", "النور", "arabe")} في الحي طيلة يومين.`,
    `من ${L("MOT", "الجميل", "arabe")} أن نتوصل بالرد في الوقت.`,
    `${L("MOT", "مبروك", "arabe")} عليكم المنزل الجديد.`,
    `الحمد لله على ${L("MOT", "السلامة", "arabe")}.`,
  ]);
}

const D = (g, mot) => L("MOT", mot, "darija");
/* Une réplique en darija : des mots que l'IA doit pouvoir lire. */
function repliqueDarija(g) {
  return g.h.choix([
    `${D(g, "wakha")}, ${D(g, "safi")}`,
    `${D(g, "chokran")} ${D(g, "bzaf")}`,
    `${D(g, "inchallah")} ${D(g, "ghda")}`,
    `${D(g, "hamdoullah")}, kolchi bikhir`,
    `${D(g, "Mabrouk")} 3lik, Allah ykhalik`,
    `Allah ${D(g, "Karim")}, ${D(g, "daba")} nchoufou`,
    `${D(g, "sbah")} lkhir ${D(g, "khouya")}`,
    `${D(g, "bslama")}, ${D(g, "3afak")} 3iyet liya`,
  ]);
}

const heure = (h) => `${String(h.entier(7, 23)).padStart(2, "0")}:${String(h.entier(0, 59)).padStart(2, "0")}:${String(h.entier(0, 59)).padStart(2, "0")}`;
const jour = (h) => `${String(h.entier(1, 28)).padStart(2, "0")}/${String(h.entier(1, 12)).padStart(2, "0")}/${h.entier(2023, 2026)}`;

/* ------------------------------------------------------------------ CORE */
const coreAr = avec("ar", {
  courrierAr(g) {
    const h = g.h, a = g.personneAr(), b = g.personneAr();
    return `${g.villeAr()} في ${g.dateAr()}

من: ${a.m}
${g.adresseAr()}
الهاتف: ${h.pile(0.5) ? g.telAr() : g.tel("ma")}

إلى السيد رئيس ${c(h, "المقاطعة", "الجماعة", "مصلحة الزبناء", "الوكالة")}

الموضوع: ${c(h, "طلب شهادة السكنى", "طلب استرجاع مبلغ", "شكاية بخصوص فاتورة", "طلب نسخة من العقد")}

${c(h, "سلام تام بوجود مولانا الإمام", "تحية طيبة وبعد", "السلام عليكم ورحمة الله")}،

يشرفني أن أتقدم إليكم بطلبي هذا، ${c(h, `بعد اتصالي بالسيد ${g.nom(b.p)}`, `بعد لقائي مع السيدة ${g.prenom(b.p)}`, `بناء على ملفي المودع بتاريخ ${g.dateAr()}`)}، ${c(h,
      `حيث أديت مبلغ ${g.montantAr()} ولم أتوصل بأي وصل.`,
      `وذلك لتسوية مبلغ ${g.montantAr()} لا يزال عالقا.`,
      `علما أن الفاتورة بلغت ${g.montantAr()}.`)}
${phraseAr(g)}
رقم البطاقة الوطنية: ${h.pile(0.4) ? g.cinAr() : g.cin()}
البريد الإلكتروني: ${g.email(a.p)}

وتقبلوا فائق التقدير والاحترام.
الإمضاء: ${a.m}`;
  },
});

const coreBilingue = avec("fr-ar", {
  ficheBilingue(g) {
    const h = g.h, a = g.personneAr(), b = g.personneAr();
    // « و » collé au prénom qui suit : « بين أحمد وفاطمة ».
    const bColle = P("PERSONNE", { ...b.p, traits: [...b.p.traits, "proclitique"] });
    return `FICHE CLIENT — بطاقة الزبون
Nom et prénom / الاسم الكامل : ${g.latin(a.p)} / ${a.m}
CIN / رقم البطاقة الوطنية : ${g.cin()}
Date de naissance / تاريخ الازدياد : ${g.naissance()}
Adresse / العنوان : ${h.pile(0.5) ? g.adresseMa() : g.adresseAr()}
GSM / الهاتف : ${h.pile(0.5) ? g.telAr() : g.tel("ma")}
Ville / المدينة : ${h.pile(0.5) ? g.villeAr() : g.ville("ma")}
E-mail : ${g.email(a.p)}

Observation : ${c(h, "M.", "Mme")} ${g.latinNom(a.p)} a rappelé le ${g.date()} : « أنا ${g.prenom(a.p)}، بغيت نعرف فين وصل الملف ديالي، ${c(h, "عيطو ليا", "تصلو بيا")} على ${h.pile(0.5) ? g.telAr() : g.tel("ma")} ». Le dossier est commun à ${a.m} و${bColle}, ${c(h, "son épouse", "son frère", "sa mère")}, joignable au ${g.tel(h.pile(0.7) ? "ma" : "fr")}.
${phraseAr(g)}`;
  },
});

const coreDarija = avec("darija-latin", {
  whatsapp(g) {
    const h = g.h, a = g.personneArabizi({ forme: h.choix(["prenom-nom", "prenom-seul"]) }), b = g.personneArabizi({ forme: "prenom-nom" }), x = g.personneArabizi();
    const j = jour(h), heures = Array.from({ length: 8 }, () => heure(h)).sort();
    let k = 0;
    const l = (qui, msg) => `[${j}, ${heures[k++]}] ${qui}: ${msg}`;
    return [
      l(a.m, `salam 3likom, wach nta f ${g.ville("ma")}?`),
      l(b.m, `${repliqueDarija(g)}, ana f tri9`),
      l(a.m, `${D(g, "3afak")} sift liya numero dyal ${x.m}, khassni n3ayet lih`),
      l(b.m, `${LRM}${g.tel("ma")}`),
      l(b.m, c(h, `ou l'email dyalo ${g.email(x.p)}`, `ou numero dyal la carte ${g.cin()} ila bghiti dir lih l virement`, `<Médias omis>`)),
      l(a.m, repliqueDarija(g)),
      l(a.m, c(h, `ch7al khassni nkhalsek? ${g.montant("DH")}?`, `ghadi nsifet lik ${g.montant("DH")} ${D(g, "ghda")}`, `ra ${x.m} 9al lia rah sift lik kolchi`)),
      l(b.m, `${repliqueDarija(g)}. ${h.pile(0.4) ? `ila ma jawbch 3iyet l ${LRM}${g.tel("ma")}` : "nchoufou men b3d"}`),
    ].join("\n");
  },
});

/* ---------------------------------------------------------- TELECOM-MA */
const OPERATEURS_AR = ["اتصالات المغرب", "إنوي", "أورونج"];
const OFFRES_AR = ["باقة الإنترنت 10 دراهم", "عرض جوال", "الألياف البصرية", "تعبئة *3"];
const telecomAr = avec("ar", {
  smsAr(g) {
    const h = g.h, a = g.personneAr();
    return `رسالة نصية — ${g.produit(OPERATEURS_AR)}
عزيزي الزبون ${g.prenom(a.p)}، تم تفعيل ${g.produit(OFFRES_AR)} على الخط ${g.telAr()} بتاريخ ${g.dateAr()}.

شكاية الزبون: السلام عليكم، أنا ${a.m}، رقم البطاقة الوطنية ${h.pile(0.5) ? g.cinAr() : g.cin()}. الخط ديالي ${h.pile(0.5) ? g.telAr() : g.tel("ma")} مقطوع من ${g.dateAr()}، وخلصت ${g.montantAr()}.
${phraseAr(g)}
عافاكم تصلو بيا على ${g.telAr()} ولا على ${g.email(a.p)}.
IMEI : ${g.imei()}`;
  },
});
const telecomDarija = avec("darija-latin", {
  transcriptionDarija(g) {
    const h = g.h, cl = g.personneArabizi({ forme: h.choix(["prenom-nom", "minuscules"]) }), cons = g.personneArabizi({ forme: "prenom-seul" });
    return [
      `[Transcription automatique — appel entrant du ${g.date()}, durée ${g.mesure(["6 min 12 s", "184 secondes", "11 min"])}]`,
      `Conseiller : salam, service client, m3ak ${cons.m}, kifach n9der n3awnek ?`,
      `Client : ${D(g, "salam")} ${D(g, "3likom")}, ana ${cl.m}, 3ndi mochkil f ${g.produit(["la facture", "forfait 4G+ 20 Go", "la fibre", "roaming"])}.`,
      `Conseiller : ${D(g, "wakha")}, 3tini numero dyal la carte nationale ${D(g, "3afak")}.`,
      `Client : ${c(h, "hahowa", "ah,", "oui,")} ${g.cin()}.`,
      `Conseiller : ou numero li fih l mochkil ?`,
      `Client : ${g.tel("ma")}${h.pile(0.4) ? `, ou 3ndi tani ${g.tel("ma")}` : ""}.`,
      `Conseiller : l IMEI dyal tilifoun ? dir *#06#.`,
      `Client : ${D(g, "safi")}, ${g.imei()}.`,
      `Conseiller : ${repliqueDarija(g)}. L facture dyal ${g.montant("DH")} ghadi nrejja3ha, ou ghadi tjik SMS. L dossier m9iyed 3la smiya ${cl.m}.`,
      `Client : ${repliqueDarija(g)}.`,
    ].join("\n");
  },
});

/* ---------------------------------------------------- BANQUE-ASSURANCE */
const banqueAr = avec("ar", {
  avisVirementAr(g) {
    const h = g.h, a = g.personneAr();
    return `إشعار بتحويل — AVIS DE VIREMENT
بنك الأطلس — وكالة ${g.villeAr()}
المستفيد: ${a.m} (${g.latin(a.p)})
رقم الحساب: ${h.pile(0.6) ? g.ribAr() : g.ribMa()}
الآمر بالتحويل: ${g.societe("ma")} — ICE ${g.ice()}
المبلغ: ${g.montantAr()}
التاريخ: ${g.dateAr()}
السبب: ${c(h, "أجرة شهر", "تسديد فاتورة", "تعويض عن حادث", "استرجاع مصاريف")} ${c(h, "مارس", "يونيو", "شتنبر")}
للاستفسار: ${g.telAr()} — ${g.emailGenerique()}
${phraseAr(g)}`;
  },
});

/* --------------------------------------------------------------- SANTÉ */
const santeBilingue = avec("fr-ar", {
  certificatBilingue(g) {
    const h = g.h, pat = g.personneAr(), med = g.personneAr();
    return `CERTIFICAT MÉDICAL — شهادة طبية
Je soussigné(e), Dr ${g.latin(med.p)}, certifie avoir examiné ce jour ${c(h, "M.", "Mme")} ${g.latin(pat.p)} (${pat.m}), né(e) le ${g.naissance()}, CIN ${g.cin()}.
أشهد أنا الموقع أسفله، الدكتور(ة) ${med.m}، أنني فحصت ${g.nom(pat.p)} بتاريخ ${g.dateAr()}، وأن حالته الصحية تستوجب راحة مدتها ${g.mesure(["10 أيام", "١٥ يوما", "شهر واحد"])}.
Traitement : ${g.produit(["paracétamol 1 g", "amoxicilline 1 g", "ibuprofène 400 mg"])}. ${phraseAr(g)}
Dossier n° ${`[[PATIENT:${h.chiffres(h.choix([7, 8]))}]]`} — INPE ${`[[PRATICIEN:${h.chiffres(9)}]]`} — Tél. : ${g.telAr()}`;
  },
});

/* --------------------------------------------------------------- RH-PAIE */
const rhAr = avec("ar", {
  attestationAr(g) {
    const h = g.h, sal = g.personneAr(), drh = g.personneAr();
    return `شهادة العمل
أنا الموقع(ة) أسفله ${drh.m}، بصفتي ${c(h, "مدير الموارد البشرية", "المسير", "المديرة الإدارية")} لشركة ${g.societe("ma")} (ICE ${g.ice()})،
أشهد أن السيد(ة) ${sal.m}، الحامل(ة) للبطاقة الوطنية رقم ${h.pile(0.4) ? g.cinAr() : g.cin()}، والمسجل(ة) بالصندوق الوطني للضمان الاجتماعي تحت رقم ${h.pile(0.4) ? g.cnssAr() : g.cnss()}،
يعمل لدينا منذ ${g.dateAr()} بصفة ${c(h, "تقني", "محاسبة", "رئيس فريق", "عاملة")}، بعقد ${g.sigle(["CDI", "CDD"])}، وبأجرة شهرية إجمالية قدرها ${g.montantAr()}.
${phraseAr(g)}
سلمت هذه الشهادة للمعني(ة) بالأمر بطلب منه للإدلاء بها عند الحاجة.
حرر ب${g.villeAr()} في ${g.dateAr()}.
الهاتف: ${g.telAr()}`;
  },
});

/* Par pack : les gabarits à ajouter au PLAN de gabarits.mjs. */
export const GABARITS_AR = {
  core: { ...coreAr, ...coreBilingue, ...coreDarija },
  "telecom-ma": { ...telecomAr, ...telecomDarija },
  "banque-assurance": banqueAr,
  sante: santeBilingue,
  "rh-paie": rhAr,
};
