# Anniversary : PRIVATE → Release → PUBLIC

## Jour J — 5 décembre 2026

**Avant l’événement.** Garder `UPMANDEX_RELEASE_READY=0` jusqu’à la validation des deux médias MEW, de la connexion Twitch du propriétaire et des deux testeurs, du refus anonyme et des intégrations OBS/Streamer.bot. Vérifier `EVENTUPMAN_SECRET` et `TWITCH_BROADCASTER_ID` sur la cible. Une fois ces vérifications approuvées, préparer le déploiement normal du domaine avec `UPMANDEX_RELEASE_READY=1`, `UPMANDEX_PRIVATE_ACCESS=1` et l’état Neon `PRIVATE`. Le déploiement de diagnostic qui force PRIVATE sert uniquement à la validation. Ouvrir `/admin` avec le compte du propriétaire et vérifier que le panneau affiche PRIVATE, trois comptes autorisés et aucun blocage. Vérifier aussi la page d’attente dans une fenêtre privée. Terminer cette préparation avant le jour J.

**Au reveal.** Sur `upmandex.com/admin`, cliquer une fois sur **Release UPMANDEX**, saisir exactement `Release UPMANDEX` et attendre que le panneau confirme PUBLIC. Dans une nouvelle fenêtre privée, ouvrir l’accueil et le Dex, puis vérifier que l’administration et les soumissions non approuvées restent refusées. Aucun changement de variable ni commande n’est nécessaire au moment du clic.

**En cas d’échec.** Cliquer sur **Refresh status** et se fier à l’état relu. Si PUBLIC est confirmé mais que le site doit être refermé, cliquer **Return to PRIVATE**, saisir exactement `Return to PRIVATE`, puis vérifier la page d’attente depuis une fenêtre privée. Si l’état est indisponible, arrêter les tentatives et faire vérifier l’accès à Neon avant de reprendre.

**MEW.** Les deux soumissions sont encore non approuvées et pointent vers leurs originaux accessibles anonymement. Préparer exactement deux copies dans le stockage privé existant. Sous autorisation d’écriture séparée, vérifier les SHA-256, le refus de lecture directe anonyme, puis les droits propriétaire et ADMIN via la route média avec les nouvelles références. Faire confirmer séparément le retrait après ces preuves, revérifier l’absence de référence partagée, retirer les deux originaux seulement, puis vérifier des réponses anonymes 404 ou 410. Le mode d’exécution historique combiné ci-dessous ne doit pas servir à franchir cette confirmation entre les copies et la suppression.

## État local

Le propriétaire confirme également le build Windows complet Next.js 16.2.6 réussi. Aucun nouveau build n'est requis tant que le code applicatif ne change pas.

Le propriétaire confirme le résultat `outcome: passed` du test PostgreSQL sur le clone 4G-D :
PRIVATE → PUBLIC → PRIVATE, persistance, concurrence, audit et données métier préservées.
Ce test est acquis ; ne pas rejouer la réconciliation ni le test Release sur la vraie Anniversary.
La migration de publication reste à appliquer sur la vraie cible après autorisation distincte.
Sur Vercel, une configuration PRIVATE incomplète force désormais PRIVATE, même si la table indique PUBLIC.

Projet existant : `upmandex`, `prj_R6Hdw8elr07EAAOT50AGsRXnBC5O`.
Branche de code : `anniversary`. Les essais sur une base et un stockage de test isolés vérifiés sont autorisés.
Les actions sur Anniversary réelle, les Blob réels, le déploiement et le domaine restent soumis à autorisation distincte.
Le paquet existant `tools/lot-5b-package-preview.mjs` inclut les modifications locales,
mais exclut les exports, secrets, fichiers d'environnement, tests et outils de migration.
La nouvelle migration SQL de publication est incluse comme source ; aucune commande de build ne l'exécute.

## Mécanisme

- `SitePublication`, une ligne `anniversary`, initialisée PRIVATE uniquement par une migration autorisée.
- Lecture serveur sans cache partagé à chaque contrôle ; une erreur de lecture ferme l'accès.
- `/api/admin/release` : rôle ADMIN relu en base + Twitch ID stable de l'administrateur principal.
- POST JSON même origine, texte de confirmation exact, version attendue.
- Une seule instruction PostgreSQL modifie l'état et ajoute date, Twitch ID et transition à l'historique JSON.
- Deux demandes concurrentes avec la même version : une seule réussit, l'autre reçoit 409.
- Aucun build, import de module, GET ou rendu de page ne crée ou ne modifie cet état.
- `Return to PRIVATE` reste disponible même si la préparation Release est désactivée.
- Les contrôles de rôle, propriété et authentification existants restent actifs après Release.

## Variables à configurer après autorisation

Pré-vérification Windows unique : `node .\tools\prepare-anniversary-launch.mjs`.
Diagnostic ciblé sans écriture : `node .\tools\prepare-anniversary-launch.mjs --diagnose-snapshot`.
Il compare les composantes de l'empreinte approuvée et deux lectures SQL du même snapshot, avec le contexte
canonique `pg_catalog` puis le contexte initial de connexion. Il n'affiche que les empreintes, compteurs,
noms des tables/objets de schéma concernés et indicateurs d'égalité, jamais les lignes ou secrets.
Une incohérence de contexte a été corrigée dans l'installation : la pré-vérification utilisait déjà
`SET LOCAL search_path = pg_catalog`, mais pas la relecture sous verrou. Les définitions retournées par
`pg_get_constraintdef` et autres fonctions de description dépendent de la visibilité des objets SQL.
Les deux lectures utilisent désormais le même contexte ; aucune définition ni ligne n'est retirée du contrôle.
Le calcul de l'empreinte d'approbation est inchangé. Une nouvelle autorisation n'est requise que si ses
composantes ont réellement changé ; le diagnostic produit alors la nouvelle empreinte, sans l'appliquer.
Par défaut, ce programme ne fait que des lectures distantes. Il réutilise la configuration privée existante,
vérifie Anniversary et sa sauvegarde par API Neon et SQL READ ONLY, et prépare deux fichiers ignorés :
un rapport avec empreinte d'approbation et références Blob publiques, et un `.env` avec la vraie connexion
Anniversary vérifiée et l'ID stable du propriétaire ADMIN déjà lié. Aucun secret n'est imprimé dans le terminal.
La liste privée préparée contient uniquement le propriétaire ; ajouter seulement les testeurs explicitement autorisés.

L'application réelle de la publication est préparée dans le même outil, mais reste non autorisée :
`--install-publication=anniversary --approved-plan=<empreinte réellement vérifiée>`.
Elle refuse une cible ou une empreinte différente, une autre migration en attente, des données modifiées,
et impose PRIVATE. Les données métier sont comparées avant/après sous verrou puis relues après reconnexion.
Ni ce mode ni la pré-vérification ne déploient, ne changent les variables Vercel, le domaine ou les Blob.
Ne pas lancer le mode d'installation avant autorisation explicite du propriétaire.

Dans Vercel → projet **upmandex** → Settings → Environment Variables :

| Variable | Preview de test | Futur déploiement du domaine |
| --- | --- | --- |
| `DATABASE_URL` | Clone de test vérifié | Branche Neon `anniversary` vérifiée |
| `UPMANDEX_ENV` | `anniversary` | `anniversary` |
| `UPMANDEX_PRIVATE_ACCESS` | `1` | `1`, y compris après Release |
| `UPMANDEX_PRIVATE_TWITCH_IDS` | IDs stables autorisés | IDs stables autorisés, principal inclus |
| `UPMANDEX_RELEASE_ADMIN_TWITCH_ID` | ID principal | ID principal |
| `UPMANDEX_RELEASE_READY` | `0` jusqu'à validation isolée | `0` jusqu'à validation des prérequis, puis `1` avant le dernier déploiement privé |
| `UPMANDEX_ADMIN_TEST_PREVIEW` | `1` | Supprimé ou `0` |
| `UPMANDEX_TEST_DATABASE_HOST` | Hôte du clone vérifié | Inutilisé |
| `AUTH_URL` | URL canonique de Preview | `https://upmandex.com` |
| `AUTH_SECRET`, `AUTH_TWITCH_ID`, `AUTH_TWITCH_SECRET` | Secrets dédiés/configurés | Secrets autorisés |
| `PRIVATE_BLOB_READ_WRITE_TOKEN` | Stockage Blob **privé** | Stockage Blob **privé** |

Conserver également les secrets machine existants ; ne pas les copier dans le dépôt.
Conserver `STREAMERBOT_SECRET` et recopier le `STREAM_CHAT_SECRET` déjà utilisé par la Preview pour
`/api/stream-profile`, `/api/stream-card` et `/api/twitch-achievement-events`, sans changer OBS/Streamer.bot.
`EVENTUPMAN_SECRET` est nécessaire uniquement si `/api/event-redeems` est utilisé.
La version Auth.js installée utilise `AUTH_URL` en priorité et `NEXTAUTH_URL` en repli : conserver les deux cohérents.
`MAINTENANCE_MODE` n'est pas référencé par le code Anniversary inspecté ; ne pas modifier cette variable pour tenter d'ouvrir le site.
`UPMANDEX_RELEASE_READY` est une approbation de préparation, pas une commande Release.
Une fois préparé, le bouton n'a besoin d'aucun changement de variable ni redéploiement.

Dans Twitch Developer Console → application → OAuth Redirect URLs : conserver les callbacks existants
et ajouter exactement `https://upmandex.com/api/auth/callback/twitch`, ainsi que le callback canonique de Preview.

## Confidentialité : blocage à lever avant mise en ligne privée

Les nouvelles soumissions exigent un token de stockage privé ; sans ce token, l'envoi échoue fermé (503).
Leur image est servie via `/api/submission-media/<id>` avec contrôle du propriétaire, administrateur,
possession éventuelle et visibilité d'un Upman approuvé. Une soumission non approuvée ne devient jamais publique à Release.
Les images authentifiées passent directement par le navigateur avec ses cookies ; l'optimiseur partagé
est désactivé pour éviter un cache public ou une récupération sans session (coût : davantage de bande passante).

Les anciens Blob publics ne deviennent pas privés en changeant les pages. Leur affichage reste compatible,
mais leurs URL directes restent publiques. Avant d'approuver la préparation : inventorier les médias confidentiels,
copier vers le stockage privé, vérifier les copies et références, puis retirer les originaux publics et
vérifier l'expiration/invalidation des caches. Ces écritures et retraits nécessitent une autorisation distincte.
Les images confidentielles d'Upmans, galeries et fonds doivent également être incluses dans cette opération.
Ne pas déclarer le site strictement privé tant que ce point n'est pas résolu.

## Ordre des actions distantes — autorisation nécessaire

1. Vérifier les métadonnées Vercel du projet et du domaine, les endpoints Neon et l'état de la sauvegarde.
2. Après vérification de l'identité du test, appliquer uniquement la migration `20261117193000_anniversary_publication`
   sur la cible de test, sans rejouer les scripts de réconciliation. État initial PRIVATE.
3. Déployer en Preview sur le projet existant ; conserver Vercel Authentication et une base isolée.
4. Tester login principal/testeur/refus, crédits créateur, Remove viewer link, collections,
   soumissions et machines ; tester Release et retour PRIVATE exclusivement sur le clone.
5. Résoudre les anciens médias publics ; autoriser la migration de publication sur la vraie Anniversary
   après nouvelle vérification d'identité. Ne modifier aucune des données de collection.
6. Configurer le futur environnement du domaine pour Anniversary, avec publication PRIVATE et OAuth correct.
   Ne pas promouvoir tel quel un build Preview configuré sur le clone : reconstruire avec les variables finales.
7. Après autorisation de déploiement et remplacement du site du domaine, publier le paquet Anniversary
   sur le projet existant. Cette opération remplace l'ancien site en maintenance : elle doit être explicitement autorisée.
   Préparer d'abord le déploiement final avec `--prod --skip-domain` afin de vérifier READY et les protections
   avant l'affectation du domaine. Conserver la référence du déploiement précédent et son environnement original
   pour un retour arrière ; ne jamais restaurer la sauvegarde pré-réconciliation sur la base actuelle de 80 utilisateurs.
8. Vercel → Settings → Deployment Protection : conserver la protection des **Preview Deployments** ;
   le futur domaine et les URL de son déploiement doivent laisser la protection applicative afficher la page d'attente.
   Ne pas conserver une barrière Vercel Authentication qui bloquerait le domaine après Release.
   Changer cette protection uniquement après validation de l'accès applicatif, avec autorisation.
9. Contrôler anonymement le domaine ET l'URL générée : page d'attente, API privées refusées,
   médias confidentiels inaccessibles. Valider les accès autorisés et OAuth sans ouvrir le site.
10. Le jour décidé, le propriétaire utilise **Release UPMANDEX** et tape la confirmation.
    En cas de problème, **Return to PRIVATE** ferme les nouvelles requêtes. Les contenus déjà téléchargés
    par un utilisateur autorisé ne peuvent pas être révoqués.

## Limites de validation locale

Les tests locaux utilisent un stockage simulé ; le test PostgreSQL complémentaire a ensuite été confirmé réussi par le propriétaire sur le clone 4G-D.
Il reste à autoriser uniquement l'installation de la publication PRIVATE sur la vraie Anniversary, sans y rejouer PUBLIC à titre de test.
Les accès OAuth réels, Blob et Vercel nécessitent un environnement réseau fonctionnel.
Ne relancer aucun audit de migration historique ; les volumes 80/44/482/43 restent ceux confirmés par le propriétaire.

### Dernière validation locale

Traitement MEW désormais autorisé : deux copies privées, deux références de soumission et suppression
des deux anciens originaux uniquement après contrôles d'intégrité, d'accès et de non-partage.
Le token privé reste exclusivement dans le runtime Production. Le transfert ne dépend plus de
l'export de AUTH_SECRET ou du token Blob par la CLI. Les anciens modes signés côté PC sont obsolètes.

Après confirmation du redéploiement, depuis la racine du projet :
`node .\tools\run-mew-runtime.mjs --deploy-session-only`

La commande vérifie Anniversary par l'API Neon, fige son endpoint et les deux références du plan
uniquement dans le paquet serveur, puis déploie sur le projet existant avec `--prod --skip-domain`.
Aucune migration, aucun transfert et aucune bascule de domaine ne sont exécutés par cette commande.
Le paquet ne contient ni secret, ni export, ni outil de migration. Le reçu privé bloque un redéploiement automatique.

La commande affiche le callback Twitch exact de ce déploiement. Dans Twitch Developer Console,
ajouter cette URL aux OAuth Redirect URLs de l'application existante, sans retirer les autres.
Avec le drapeau ponctuel actif et l'identité Vercel vérifiée, Auth.js utilise exclusivement l'URL
Vercel générée pour ce déploiement ; AUTH_URL Production distant et upmandex.com ne changent pas.
Ce comportement disparaît au prochain déploiement normal sans le drapeau ponctuel.

Ouvrir l'URL /waiting affichée, se connecter avec le vrai compte Twitch du propriétaire,
puis ouvrir /api/operations/mew-private-transfer sur ce même déploiement.
Seul le propriétaire identifié par son Twitch ID stable et son rôle ADMIN relu en base voit la confirmation.
Le GET effectue des lectures seulement. Taper `PREPARE TWO MEW` puis confirmer dans les 90 secondes. Ce mode vérifie les deux copies privées et leurs accès, actualise les deux références et s’arrête sur `mew-prepared`, avec zéro suppression.
Le POST exige cette session, la même origine et un ticket signé côté serveur lié à la cible et au propriétaire.
Aucun token de stockage ni AUTH_SECRET n'est envoyé au navigateur.
L'attestation de cible expire après 24 heures. Une cible différente ou expirée bloque toute écriture.

Le moteur existant impose le stockage privé explicite, deux copies SHA-256 identiques, un refus de lecture
anonyme directe et les droits du propriétaire/admin via le gestionnaire média réel avant toute suppression.
Après autorisation distincte, seul un runtime isolé explicitement activé avec `UPMANDEX_MEW_DELETE_ENABLED=1` peut proposer `REMOVE TWO PUBLIC MEW`. Il exige le marqueur de préparation vérifiée, relit les droits, verrouille et revérifie les références, l’absence de partage et l’intégrité des fichiers avant le retrait ciblé.
Une réservation persistante privée interdit les exécutions concurrentes et les rejouements.
Il ne modifie que les deux références MEW et ne déclenche aucune action Release.

Résultat complet : mew-secured, deux copies vérifiées, deux références privées, deux suppressions
confirmées et anciennes URL inaccessibles. Un cache encore accessible reste cache-verification-pending.
Un échec de suppression répond blocked avec phase, nombres vérifiés, suppressions confirmées et éventuelle
incertitude sur une suppression interrompue ; les références privées sont préservées et aucun nouvel essai n'est automatique.
Un rafraîchissement GET relit le marqueur privé sans réexécuter le transfert. Ne pas republier un formulaire POST.
Les 22 autres médias, les collections et le domaine restent intacts. Retirer la route ponctuelle au prochain
nettoyage normal ; elle est désactivée par défaut et ne figure dans aucun menu d'administration.

Test PostgreSQL réel préparé pour Windows : `node --import tsx .\tools\test-release-neon.mjs` depuis la racine du projet.
Il réutilise `anniversary-migration.env`, retrouve exclusivement le clone 4G-D existant par l'API Neon,
vérifie son parent sauvegarde et son endpoint, puis applique uniquement la migration de publication via Prisma.
Les transactions Release utilisent le SQL et les handlers applicatifs réels, avec identités de session simulées
et rôles relus sur PostgreSQL. OAuth et Blob ne sont pas appelés : leurs variables sont des fixtures limitées
au processus de test. Aucun compte n'est créé ni promu. Le test termine en PRIVATE, contrôle le journal,
la concurrence et l'empreinte de toutes les tables métier. Résumé JSON `passed`, `blocked` ou `failed`, sans secret.
Le script n'a pas été exécuté dans l'environnement Codex ; le propriétaire confirme son succès depuis Windows.

- 29 tests réussis, dont cinq nouveaux tests du véritable gestionnaire de réponse des médias avec stockage simulé.
- Refus avant lecture du stockage, absence de redirection vers le Blob, réponses sans cache partagé,
  interdiction des hôtes arbitraires et maintien du refus des soumissions non approuvées après PUBLIC.
- Le test réel Neon du clone est confirmé depuis Windows. Les lectures distantes actuelles et les essais Blob
  restent bloqués dans Codex par `ENOTFOUND` ; aucun token de stockage privé de test n'est configuré localement.
- Le rapport privé `upmandex-migration-exports/anniversary-media-review-1794942081874.json`
  recense 44 sprites locaux à examiner. Aucun lien Blob littéral retrouvé dans le code et les trois exports :
  cela ne prouve pas l'absence de Blob publics en base ou d'objets sans référence dans le stockage.
- L'inventaire exact des URL à révoquer doit encore être complété par lecture des références actuelles en base
  et listing du stockage. Aucun Blob réel n'a été déplacé, copié, supprimé ni modifié.

## Diagnostic ponctuel du refus Twitch

Après autorisation uniquement : `node .\tools\run-mew-runtime.mjs --deploy-auth-diagnostic-only`.
Le lanceur vérifie le projet existant, déploie avec --prod --skip-domain, désactive MEW et conserve
un reçu privé distinct. Aucun export de secret, aucune migration et aucun transfert ne sont exécutés.
Ajouter le callback Twitch exact affiché sans retirer les callbacks existants, puis tenter une seule connexion sur /waiting.
Le mode --diagnose-access sélectionne automatiquement le nouveau reçu et ne restitue que les codes autorisés.
Les événements UPMANDEX_AUTH_DIAGNOSTIC distinguent configuration PRIVATE, refus de liste, identité ADMIN,
Twitch/Helix, PostgreSQL et Auth.js. Aucun profil, ID complet, jeton, cookie, message ou pile brute ne sont journalisés.
Les règles d’accès et de liaison restent identiques ; l’observation ADMIN utilise les lectures déjà réalisées
par le résolveur. Les tests utilisent une base simulée. Ce déploiement ne lance pas de contrôle MEW.
