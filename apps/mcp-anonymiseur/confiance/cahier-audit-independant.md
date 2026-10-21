# Cahier des charges — audit indépendant de Nanomizer

*Pour un cabinet d'audit de sécurité. Objectif : qu'un tiers confirme, ou
infirme, que ce qui atteint l'assistant d'IA ne contient pas les valeurs
réelles, dans les limites annoncées.*

## Périmètre

- Connecteur Nanomizer v2.3 (extension `.mcpb` pour Claude Desktop), tel que
  livré aux clients : macOS et Windows.
- Hors périmètre : l'assistant d'IA lui-même, le poste du client, l'appli web.

## Questions auxquelles l'audit doit répondre

1. **Fuites** : sur un corpus fourni par l'auditeur (pas le nôtre), quelle part
   des valeurs sensibles atteint l'IA en clair, par type ? Le journal « Ce que
   Claude a vu » dit-il vrai ?
2. **Réseau** : le connecteur ouvre-t-il une connexion sortante, dans un
   parcours normal ou d'erreur ?
3. **Clé et fichiers réels** : peut-on amener l'IA, par un message ou un
   document piégé, à lire la clé, un fichier décodé ou le journal brut ?
4. **Contournement des outils** : un fichier, un nom d'onglet, une formule ou
   un commentaire Excel peut-il faire passer une valeur ?
5. **Remise des chiffres** : une vraie valeur peut-elle écraser une cellule
   modifiée par l'IA, ou finir dans un fichier lu par l'IA ?
6. **Licence et essai** : la vérification hors ligne fuit-elle quoi que ce
   soit ? (Le contournement de la licence est connu et assumé ; il n'est pas un
   constat.)

## Ce que nous fournissons

- Le code source, la suite de tests (125 tests), le banc d'essai et son corpus,
  la campagne de validation de l'artefact.
- Une licence d'audit et l'accès à l'équipe pendant la mission.

## Livrables attendus

- Taux de détection mesuré sur le corpus de l'auditeur, par type de donnée.
- Liste des constats classés par gravité, avec reproduction.
- Une page publiable de synthèse, que nous diffuserons telle quelle, constats
  compris.
