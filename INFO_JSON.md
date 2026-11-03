# Banques C / C++ / Rust — édition diversifiée

Trois fichiers JSON actifs, tableaux UTF-8 directement chargeables par le site :

| Fichier | Niveau 1 | Niveau 2 | Niveau 3 | Exercices | Sous-questions |
| --- | ---: | ---: | ---: | ---: | ---: |
| `database/questions_c.json` | 100 | 100 | 100 | 300 | 360 |
| `database/questions_cpp.json` | 100 | 100 | 100 | 300 | 360 |
| `database/questions_rust.json` | 100 | 100 | 100 | 300 | 360 |
| **Total** | **300** | **300** | **300** | **900** | **1 080** |

Le quota « 100 par niveau » porte sur les entrées d’exercice : certaines ont
plusieurs sous-questions sur le même code. Les anciennes éditions sont conservées
dans `database/archive/` et ne sont ni chargées ni publiées.
La liste active est `BANK_FILES` dans `assets/core.js`.

## Contenu et diversité

Chaque langage propose 60 familles, 20 par niveau, avec cinq variantes par
famille : deux QCM à réponse unique, deux QCM à réponses multiples et un exercice
à deux sous-questions (unique puis multiple). Les variantes partagent une notion,
mais les formats demandent soit un résultat/diagnostic, soit une analyse des
propriétés du code. Les codes, questions, distracteurs et explications sont
produits à partir du catalogue éditorial de `scripts/question-bank/`.

Les niveaux portent sur les notions, pas sur le nombre de cases à cocher :

- Niveau 1 : valeurs, expressions, contrôle, fonctions, données et collections.
- Niveau 2 : conversions, contrats d’API, propriété, alias, invalidation,
  erreurs et itérateurs.
- Niveau 3 : durées de vie, séquencement, représentations, généricité,
  ressources, exceptions et concurrence.

Chaque langage comporte 180 sous-questions multiples : exactement 60 à une bonne
réponse, 60 à deux et 60 à trois. Les positions sont mélangées dans les JSON.
Le navigateur les mélange encore par séance, en conservant les indices canoniques
pour la notation et l’ordre affiché pour la reprise après rechargement.

La diversité ne signifie pas 900 notions indépendantes : les cinq variantes
intentionnelles d’une famille servent à consolider un même raisonnement.
`variant_group` permet de les espacer au tirage. Les premiers niveaux gardent
volontairement des exercices simples.

## Schéma

Métadonnées communes : `id`, `language` (`c`, `cpp`, `rust`), `topic`, `subtopic`,
`difficulty` (1–3), `standard`, `code`, `explanation`, `tags`, `variant_group`,
`last_seen_at`, `seen_count`, `verification`.

- `single_choice` : `question`, `options`, `correct_answer`, `correct_option`.
- `multiple_choice` : `question`, `options`, `correct_answers`.
- `multi_question` : liste `questions`, chaque élément ayant `id`, `prompt`,
  `type`, `options`, `explanation`, `last_seen_at`, et les indices de correction.

Les indices commencent à zéro. Une sélection multiple doit correspondre
exactement à l’ensemble attendu. La validation d’un exercice groupé exige une
sélection dans toutes les sous-questions ; chaque correction reste distincte.

Les anciens formats, dont `snippets` avec repères A/B/C, restent compris par
la normalisation pour de futurs contenus.

## Dernière présentation et site statique

Les JSON distribués contiennent `last_seen_at: null` et `seen_count: 0`.
Ces fichiers sont communs à tous les visiteurs et ne peuvent pas être réécrits
par un navigateur sur un hébergement statique.

Au premier affichage d’un exercice dans une séance, le site enregistre dans son
JSON local (`localStorage`, clé `atelier-c-rust-v1`) :

```json
{
  "exposures": {
    "C-2026-L1-01-V1": {
      "last_seen_at": "2026-11-03T14:30:00.000Z",
      "seen_count": 1
    }
  },
  "history": [
    {
      "id": "C-2026-L1-01-V1",
      "variant_group": "c_integer_division",
      "language": "c",
      "last_seen_at": "2026-11-03T14:30:00.000Z"
    }
  ]
}
```

La date est enregistrée même sans réponse, seulement lorsque l’exercice est
réellement affiché. Une reprise de la même séance n’ajoute pas de présentation.
L’exercice et ses sous-questions en mémoire reçoivent la même date ISO UTC.
L’historique conserve les 500 dernières présentations et les compteurs par
exercice restent dans `exposures`. Tout reste local au navigateur, sans compte.

## Tirage et plafond de 20 %

Une répétition est :

1. un exercice affiché au cours des sept derniers jours ;
2. une variante d’une des dix dernières familles pertinentes présentées dans
   cette fenêtre, même si son identifiant n’est pas encore apparu ;
3. une nouvelle occurrence de la même famille dans la séance en préparation.

Le tirage choisit d’abord des exercices non récents de familles distinctes, en
favorisant les révisions dues parmi les candidats de même statut de fraîcheur.
Il complète seulement si nécessaire avec des répétitions, puis mélange l’ordre
final. Aucun identifiant ne peut apparaître deux fois dans la séance.

Pour `f` exercices frais, le nombre de répétitions `r` est borné par
`r <= floor(f / 4)`, ce qui garantit `r / (f + r) <= 20 %` **sur la taille réelle**.
Exemple : huit frais autorisent deux répétitions, soit dix exercices. Trois frais
n’autorisent aucune répétition ; si tous les candidats sont récents, aucun tirage
n’est proposé. Le plafond n’est jamais levé pour remplir artificiellement une
séance. L’interface indique le raccourcissement ou le blocage.

La même règle vaut dans « À revoir » : une erreur récente ne peut pas remplir à
elle seule une séance immédiate de révision. Il faut attendre l’expiration de
la fenêtre ou pratiquer d’autres notions. Les filtres étroits peuvent réduire
fortement la taille de séance. Les paramètres sont exportés dans `assets/core.js`.

## Validation et reproduction

```sh
python3 scripts/question-bank/generate.py
python3 scripts/question-bank/validate.py /tmp/atelier-question-banks
```

La génération sans option écrit trois candidats dans `/tmp/atelier-question-banks`.
`--write` régénère les fichiers actifs ; la première exécution conserve les anciens
JSON dans l’archive. Le catalogue emploie une graine déterministe pour permettre
une revue des changements.

Le validateur compile les 900 exemples avec GCC C17, G++ C++17 et rustc Rust 2021.
Il compare les sorties exactes pour `verification.kind: "output"`, vérifie les
refus pour `compile_fail`, et les échecs d’exécution pour `panic`. Les exemples
`analysis` sont compilés **mais jamais exécutés** : ils illustrent notamment des
comportements indéfinis et contrats violés. Les compilateurs vérifient les chemins
techniques ; ils ne constituent pas une preuve de chaque affirmation pédagogique.

Validation du 3 novembre 2026 : **900 exemples contrôlés, aucun échec**.
Les tests JS vérifient le schéma, la répartition, les mélanges, la notation, la
reprise et le plafond sur de nombreuses combinaisons de réserves et de tailles.
