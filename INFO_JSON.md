# Banque active d’exercices C / C++ / Rust

Le site charge explicitement cinq fichiers, déclarés dans `BANK_FILES`
(`assets/core.js`) :

| Fichier | Exercices | Questions | Standard |
| --- | ---: | ---: | --- |
| `database/questions_c.json` | 450 | 450 | C17 |
| `database/questions_rust.json` | 450 | 450 | Rust 2021 |
| `database/questions_c_v2.json` | 350 | 700 | C11 |
| `database/questions_rust_v2.json` | 350 | 700 | Rust 2021 |
| `database/questions_cpp_all.json` | 500 | 750 | C++17 |
| **Total** | **2 100** | **3 050** | |

Les exercices de `database/archive/`, notamment les anciennes comparaisons,
ne sont plus proposés. La génération ne copie que les cinq banques actives.

## Questions simples

Les banques initiales sont des tableaux à plat. Chaque exercice fournit :

- `id`, `language`, `topic`, `subtopic`, `difficulty` (1 à 3), `standard` ;
- `type` : output, prediction, compilation, behavior, code_review, repair ou concept ;
- `code`, `question`, `options` ;
- `correct_answer` : index de l’unique bonne option, à partir de zéro ;
- `correct_option` : texte de cette option, pour contrôle ;
- `explanation`, `tags`, `variant_group`.

## Plusieurs questions sur un code

Les banques `_v2` contiennent des exercices `type: "multi_question"`.
`code` est commun à la liste `questions`, qui est la source de référence pour
l’interface. Les champs legacy `question`, `options`, `correct_answer`,
`correct_option` et `explanation` à la racine répètent la première question :
ils ne doivent pas être affichés comme une question supplémentaire.

Chaque élément de `questions` contient `id`, `prompt`, `type`, `options`,
`explanation`, et selon le type :

- `single_choice` : un index `correct_answer`, interface radio ;
- `multiple_choice` : une liste d’indices `correct_answers`, interface à cases
  à cocher. La liste sélectionnée doit correspondre exactement à cette liste,
  sans tenir compte de l’ordre.

Les 700 exercices `_v2` actuels comportent chacun deux questions : une unique
et une multiple. Le code et le nombre de questions sont affichés une seule fois.
Toutes les questions doivent recevoir une sélection avant la correction commune.
Chaque question reçoit sa propre explication. La statistique principale et la
révision portent sur l’exercice : toute question manquée rend l’exercice à revoir.
Le bilan de séance indique aussi le nombre de questions réussies.

`scenario` fournit un contexte de variante, sans modifier la notation.
La normalisation regroupe `structs` avec `structures`, et `conditions` avec
`control_flow`. Les nouvelles thématiques (logique, énumérations, fichiers,
algorithmes) ont leurs propres libellés. Les familles de variantes actives
servent à diversifier la sélection ; leur nombre est calculé par l’interface.

## Exercices C++ à plusieurs extraits

La banque C++ comprend 250 exercices simples et 250 exercices à deux questions,
soit 750 questions. Les exercices groupés utilisent `snippets` à la place de `code` :
chaque élément possède `label` (A, B, C) et `code`. Les 675 extraits de ces groupes
sont tous affichés séparément, avec leur lettre et le standard C++17, avant les
questions. Les repères ne sont jamais fusionnés ni réordonnés.

Le format `prediction` est proposé dans les filtres. Les thèmes C++ incluent
références, qualification const, classes et vecteurs. Le thème `string` rejoint
les chaînes de caractères. Les choix uniques et multiples suivent les mêmes
règles de notation, sauvegarde et révision que pour C et Rust.

## Progression et compatibilité

Les identifiants d’exercices sont stables. Les anciennes réponses C/Rust
à choix unique sont converties au format de sélection par question lors de
la reprise. Les anciennes statistiques sont conservées. Les identifiants retirés
restent stockés mais ne contribuent plus aux compteurs ni à la révision.
Une séance contenant un exercice retiré ou une réponse incompatible est annulée,
sans supprimer les acquis ; une nouvelle séance peut être commencée.

## Contexte pédagogique

Les extraits C ne sont pas tous des fichiers autonomes : certains se placent dans
`main` avec les en-têtes usuels (`stdio.h`, `stdlib.h`, `string.h`). Le code n’est
pas exécuté par le site. Ne pas confondre comportement indéfini et segfault garanti,
ni refus de compilation Rust et panic d’exécution.

Les JSON sources ne sont pas modifiés par la normalisation ni la génération.
Les tests vérifient les formats, les réponses, les filtres et la reprise des séances.
