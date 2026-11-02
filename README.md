# Atelier — C, C++ & Rust · version 1.0

Site statique d’entraînement et de consolidation des acquis en C, en C++ et en Rust,
prévu pour Render, relié à un dépôt GitHub, et adapté aux écrans d’iPhone et
d’iPad. La mention **version 1.0** est visible sur la page principale.

## Fonctionnalités

- Mode sombre automatique selon le navigateur, actualisé si le système change.
  Le bouton « Paramètres » permet de choisir Système, Clair ou Sombre ; ce choix
  est conservé localement et appliqué dès le chargement.

- 2 100 exercices : 800 C, 500 C++17 et 800 Rust, soit 3 050 questions.
  Les cinq banques actives sont déclarées dans `BANK_FILES` (`assets/core.js`).
  Les archives ne sont ni chargées ni copiées dans le site publié.
- Séances de 5, 10, 20 ou 30 exercices, filtrées par langage, thématique,
  difficulté et type. Si moins de questions correspondent, la séance est réduite.
- Affichage du code avec numéros de ligne et défilement horizontal.
- Choix uniques (boutons radio) et réponses multiples (cases à cocher).
- Code partagé ou extraits distincts A/B/C pour les exercices à plusieurs
  questions, avec leurs repères préservés : répondre
  à chacune avant de valider ; correction et explication distinctes par question.
- Une réponse multiple est exacte si toutes les bonnes options, et aucune
  mauvaise option, sont cochées. Un exercice est réussi si chaque question
  est réussie. Le bilan détaille aussi le nombre de questions réussies.
- Révision des exercices dont au moins une question a été manquée ; une réussite
  complète retire l’exercice de cette liste.
- Sélection favorisant les familles de notions distinctes et les questions dues.
  Une erreur est immédiatement due ; les réussites successives décalent la
  prochaine échéance de 1, 2, 4, 8, 16 puis 30 jours maximum.
- Progression par langage et thématique, sauvegarde et reprise de la séance,
  y compris des cases cochées avant validation.
- Conservation des anciens acquis C/Rust. Les acquis archivés sont conservés
  dans le stockage mais exclus des compteurs actifs ; une séance comportant un
  exercice retiré est abandonnée sans effacer les acquis C/Rust.

Les données restent dans `localStorage`, sur le navigateur et l’appareil utilisés.
Aucun compte, serveur applicatif, compilateur en ligne ou service tiers n’est
nécessaire. La progression n’est pas synchronisée entre appareils. Effacer les
données du navigateur l’efface aussi ; la navigation privée peut ne pas la conserver.
La banque n’est pas disponible hors connexion : le site doit être chargé via HTTP.

## Démarrer en local

Prérequis : Python 3 pour le serveur ; Node.js 22 recommandé pour les tests et
la génération. Aucune installation de dépendances n’est nécessaire.

```sh
python3 -m http.server 5173 --bind 127.0.0.1
```

Ouvrir `http://localhost:5173`. Ne pas ouvrir `index.html` directement avec
`file://` : les questions sont chargées par `fetch`.

## Vérifier et générer

```sh
node --test tests/core.test.mjs
node scripts/build.mjs
```

Ou avec npm : `npm test`, `npm run build`, `npm run dev`.
Le dossier `dist/` contient le site complet prêt à publier. Les données sources
sont copiées sans modification. Le script de génération recrée uniquement `dist/`.

`tests/core.test.mjs` contrôle les 2 100 exercices et leurs 3 050 questions, les filtres, la diversité des
familles, la notation des choix multiples, la répétition, la migration des
séances et le calcul de la progression.

Le parcours navigateur se teste avec le serveur local en ouvrant
`http://localhost:5173/tests/browser.html` **dans un profil de test**. Le résultat
est `PASS` ou `FAIL`. Cette page réinitialise la progression de cette origine
pour vérifier sélection, correction, reprise après rechargement, bilan et
révision. Elle n’est pas copiée dans `dist/`.

Pour exécuter automatiquement ce parcours avec Chromium installé :

```sh
python3 tests/run-browser.py 390,844
```

Ce script démarre un serveur temporaire et utilise un profil Chromium isolé,
sans toucher à votre progression personnelle.

Les vérifications automatisées ont été réalisées dans Chromium aux formats
mobile et tablette. Une validation sur Safari réel sous iOS reste à effectuer.

## Déployer sur Render depuis GitHub

1. Placer ce projet dans un dépôt GitHub et le pousser sur la branche à déployer.
2. Dans Render, créer un **Static Site** et connecter le dépôt GitHub.
3. Configurer la commande de construction : `node scripts/build.mjs`.
4. Configurer le dossier de publication : `dist`.
5. Déployer ; les prochains commits sur la branche suivie pourront déclencher
   le redéploiement automatique.

Le fichier `render.yaml` décrit également le service statique pour une
configuration par Blueprint. `.node-version` et `package.json` précisent
la version de Node. Aucune variable d’environnement ni aucun secret ne sont requis.
Le dépôt GitHub et le service Render ne sont pas créés par les fichiers du projet.

## Architecture

```text
index.html               Structure et navigation accessibles
assets/
  app.js                 Vues, filtres, séance et interactions
  core.js                Sélection, répétition et statistiques
  storage.js             Chargement et validation des données locales
  styles.css             Mise en page responsive
  theme.css              Palette sombre et fenêtre des paramètres
  theme.js               Préférence et détection du thème système
  favicon.svg            Icône locale
database/
  questions_c.json        450 questions C17
  questions_rust.json     450 questions Rust 2021
  questions_c_v2.json     350 exercices C11, 2 questions chacun
  questions_rust_v2.json  350 exercices Rust, 2 questions chacun
  questions_cpp_all.json 500 exercices C++17, 750 questions
  archive/               Banques retirées, exclues du site publié
scripts/build.mjs        Assemblage statique sans dépendance
tests/core.test.mjs      Tests de données et de logique
tests/browser.html       Parcours de vérification navigateur
tests/run-browser.py     Exécution isolée du parcours avec Chromium
render.yaml              Configuration d’hébergement Render
INFO_JSON.md             Description de la banque et principes pédagogiques
```

Les extraits C peuvent être des fragments destinés à `main` avec les en-têtes
usuels. L’interface rappelle ce contexte. Les corrections respectent les nuances de la banque, notamment
entre comportement indéfini en C, refus de compilation Rust et panic.
