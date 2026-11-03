# Atelier — C, C++ & Rust · version 1.5

Site statique d’entraînement prévu pour Render et GitHub, avec interface
responsive pour iPhone et iPad et mode sombre automatique ou manuel.

## Banques et exercices

Trois banques actives, une par langage :

- `database/questions_c.json` : 300 exercices C17.
- `database/questions_cpp.json` : 300 exercices C++17.
- `database/questions_rust.json` : 300 exercices Rust 2021.

Chaque fichier contient **100 exercices par niveau de difficulté** (1, 2, 3).
Cela représente **900 exercices, 1 080 sous-questions, 180 familles de notions**.
Chaque famille possède cinq variantes de formats différents, au lieu de dizaines
de changements purement numériques. Certaines variantes restent volontairement
proches pour la consolidation ; le tirage tient compte de leur famille.

QCM uniques, choix multiples à une/deux/trois bonnes options, et exercices à deux
questions partageant un code. L’ordre des options varie dans les fichiers et à
l’affichage ; il est conservé à la reprise d’une séance. Toutes les questions
reçoivent une correction expliquée après validation.

Les niveaux avancés couvrent notamment aliasing et séquencement C, RAII et
exceptions C++, emprunts et durées de vie Rust, généricité et concurrence.
Les éditions précédentes sont archivées dans `database/archive/` et ne sont pas
publiées. Les anciens acquis restent stockés sur l’appareil mais ne sont pas
attribués aux nouveaux identifiants ; les compteurs concernent la nouvelle banque.

## Progression et répétitions

Séances filtrables de 5, 10, 20 ou 30 exercices, suivi par langage et thématique,
révision des erreurs et reprise des réponses non encore validées.

Le site enregistre la date de première présentation dans chaque séance, même
sans réponse, avec `last_seen_at` et `seen_count` dans son JSON local. Dans les
fichiers distribués, la date initiale est `null` : le navigateur ne peut pas
modifier un fichier JSON publié sur un site statique.

Le tirage espace les exercices vus dans les **sept derniers jours**, les variantes
des **dix dernières familles** pertinentes et les familles déjà retenues dans la
séance. Au plus **20 % de la taille réelle** peut provenir de ces répétitions.
Le site raccourcit ou bloque une séance si les filtres ne permettent pas de
respecter ce plafond, y compris dans « À revoir ». Le plafond n’est pas levé.
Voir [INFO_JSON.md](INFO_JSON.md) pour la définition exacte et des exemples.

Progression, dates de présentation et thème restent dans `localStorage`, sur le
navigateur et l’appareil utilisés, sans compte ni synchronisation. Effacer les
données du site les supprime. La navigation privée peut ne pas les conserver.
Les JSON doivent être chargés via HTTP ; le site n’est pas conçu pour un usage
hors connexion. Aucun compilateur n’est exécuté dans le navigateur.

## Démarrer et construire

Prérequis : Python 3 pour le serveur, Node.js 22 recommandé pour les tests/builds.
Aucune dépendance à installer.

```sh
python3 -m http.server 5173 --bind 127.0.0.1
```

Ouvrir `http://localhost:5173` ; ne pas ouvrir `index.html` en `file://`.

```sh
node tests/core.test.mjs
node scripts/build.mjs
```

Avec npm : `npm test`, `npm run build`, `npm run dev`.
Le build recrée seulement `dist/` et copie les trois banques de `BANK_FILES`, sans
archives, catalogue éditorial ni tests.

## Vérifier les exercices

```sh
python3 scripts/question-bank/generate.py
python3 scripts/question-bank/validate.py /tmp/atelier-question-banks
```

Le premier script génère des candidats dans `/tmp/atelier-question-banks` ;
`--write` les enregistre dans `database/` en préservant l’ancienne édition.
Le second exige GCC, G++ et rustc et peut prendre plusieurs minutes : il compile
les 900 extraits, vérifie les sorties, erreurs de compilation et panic attendus.
Les cas de comportement indéfini sont compilés mais jamais exécutés.
Les scénarios et leurs explications restent éditables dans
`scripts/question-bank/{c,cpp,rust}.py`.

Tests navigateur avec Chromium installé et un profil isolé :

```sh
python3 tests/run-browser.py 320,740 dark
python3 tests/run-browser.py 834,1112
```

Le scénario teste présentation sans réponse, dates, ordre stable, brouillons,
notations et révision avec délai. Lancer `tests/browser.html` manuellement
réinitialise les données de l’origine : utiliser un profil de test.
Une validation sur Safari réel sous iOS reste à effectuer.

## Déployer sur Render

Connecter le dépôt GitHub comme **Static Site** :

- Commande de construction : `node scripts/build.mjs`.
- Dossier de publication : `dist`.

`render.yaml` propose aussi la configuration Blueprint ; `.node-version`
précise Node 22. Aucun secret ni variable d’environnement requis. Avec le
déploiement automatique activé, un push sur la branche suivie déclenche le build.

## Architecture

```text
index.html                  Structure, navigation, paramètres
assets/app.js               Interface, séances et présentation des options
assets/core.js              Banques, notation, tirage, dates et plafond
assets/storage.js           Lecture/écriture des données locales
assets/styles.css           Interface responsive
assets/theme.{js,css}        Thèmes système, clair et sombre
database/questions_*.json   Trois banques actives
database/archive/           Éditions retirées, non publiées
scripts/question-bank/      Catalogue, génération et validation par compilateur
scripts/build.mjs           Assemblage statique
tests/core.test.mjs          Schéma, notation, historique et tirage
tests/browser.html          Parcours navigateur
tests/run-browser.py        Serveur et Chromium temporaires isolés
render.yaml                 Hébergement statique Render
INFO_JSON.md                Schéma et règles pédagogiques détaillés
```
