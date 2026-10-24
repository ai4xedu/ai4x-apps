"""HT-Bench — Microsoft Presidio sur le jeu synthétique, HORS LIGNE.

    python presidio_bench.py <ht-bench.jsonl> <sortie.jsonl>

Configuration « telle que livrée » : AnalyzerEngine, reconnaisseurs par
défaut, modèles spaCy en_core_web_lg et fr_core_news_lg. Chaque document est
analysé en anglais ET en français (la plupart des reconnaisseurs à motifs de
Presidio ne sont déclarés que pour l'anglais) ; on garde l'union des
étendues, sans seuil de score — la configuration la plus favorable au rappel.

Garde réseau : avant tout import de Presidio ou de spaCy, toute tentative de
connexion (socket, résolution DNS) lève une erreur et le script s'arrête en
code 3. (Telle que livrée, Presidio télécharge la liste publique des suffixes
via tldextract au premier e-mail analysé : on la remplace par la copie
embarquée de tldextract.) Les modèles s'installent une fois avec requirements.txt ; le score,
lui, ne touche jamais au réseau.

Sortie : une ligne JSON par document, {"id", "etendues": [{"debut", "fin",
"type", "score"}]}, positions en unités UTF-16 (comme les chaînes JavaScript
du jeu).
"""
import json
import os
import socket
import sys


class ReseauInterdit(RuntimeError):
    pass


def _refus(*_a, **_k):
    raise ReseauInterdit("tentative de connexion réseau pendant le score HT-Bench")


socket.socket.connect = _refus
socket.socket.connect_ex = _refus
socket.create_connection = _refus
socket.getaddrinfo = _refus
for var in ("HF_HUB_OFFLINE", "TRANSFORMERS_OFFLINE", "SPACY_OFFLINE"):
    os.environ[var] = "1"

# Le reconnaisseur d'e-mails de Presidio appelle tldextract, qui TÉLÉCHARGE
# la liste publique des suffixes au premier usage (la garde ci-dessus l'a
# surpris). On lui donne sa copie embarquée : même liste, zéro connexion.
import tldextract  # noqa: E402

tldextract.extract = tldextract.TLDExtract(suffix_list_urls=(), cache_dir=None)


def utf16(texte, i):
    return len(texte[:i].encode("utf-16-le")) // 2


def main():
    if len(sys.argv) != 3:
        print(__doc__, file=sys.stderr)
        return 2
    from presidio_analyzer import AnalyzerEngine
    from presidio_analyzer.nlp_engine import NlpEngineProvider
    import presidio_analyzer

    fournisseur = NlpEngineProvider(nlp_configuration={
        "nlp_engine_name": "spacy",
        "models": [
            {"lang_code": "en", "model_name": "en_core_web_lg"},
            {"lang_code": "fr", "model_name": "fr_core_news_lg"},
        ],
    })
    moteur = AnalyzerEngine(nlp_engine=fournisseur.create_engine(), supported_languages=["en", "fr"])
    version = getattr(presidio_analyzer, "__version__", None)
    if version is None:
        from importlib.metadata import version as v
        version = v("presidio-analyzer")
    with open(sys.argv[1], encoding="utf-8") as f, open(sys.argv[2], "w", encoding="utf-8") as out:
        out.write(json.dumps({"outil": "presidio-analyzer", "version": version,
                              "configuration": "reconnaisseurs par défaut, en + fr (union), en_core_web_lg + fr_core_news_lg, sans seuil"}) + "\n")
        for ligne in f:
            ligne = ligne.strip()
            if not ligne:
                continue
            doc = json.loads(ligne)
            texte = doc["texte"]
            vus = set()
            etendues = []
            for langue in ("en", "fr"):
                for r in moteur.analyze(text=texte, language=langue):
                    cle = (r.start, r.end, r.entity_type)
                    if cle in vus:
                        continue
                    vus.add(cle)
                    etendues.append({"debut": utf16(texte, r.start), "fin": utf16(texte, r.end),
                                     "type": r.entity_type, "score": round(float(r.score), 4)})
            etendues.sort(key=lambda e: (e["debut"], e["fin"], e["type"]))
            out.write(json.dumps({"id": doc["id"], "etendues": etendues}, ensure_ascii=False) + "\n")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except ReseauInterdit as e:
        print(f"❌ {e} — score refusé (installez les modèles d'abord : pip install -r requirements.txt)", file=sys.stderr)
        sys.exit(3)
