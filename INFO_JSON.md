# Banque d’exercices C / Rust

1 000 questions : 450 C, 450 Rust, 100 comparaisons. Aucune interface web.

Fichiers : questions_all.json, questions_c.json, questions_rust.json, questions_comparison.json, metadata.json.

## Champs
- `id` : identifiant stable (C-, R-, CR-)
- `language` : `c`, `rust`, `comparison`
- `topic`, `subtopic`, `tags` : classement
- `difficulty` : 1 à 3
- `type` : output, compilation, behavior, code_review, repair, concept, comparison
- `code`, `question`, `options` : affichage
- `correct_answer` : index zéro-based de la bonne option
- `correct_option` : texte de la bonne option (contrôle)
- `explanation` : correction pédagogique
- `variant_group` : groupe conceptuel pour répétition espacée
- `standard` : C17 / Rust 2021

## Pédagogie
Les exercices comportent des variations paramétriques volontaires. Ils renforcent les automatismes plutôt que de multiplier artificiellement les notions. Il y a 30 familles de C, 36 familles de Rust et 10 familles comparatives.

Attention : les extraits C ne forment pas tous un fichier autonome ; certains s’exécutent dans `main` avec les headers usuels (`stdio.h`, `stdlib.h`, `string.h`). Les extraits Rust sont en général autonomes. Ne pas confondre comportement indéfini en C et segfault garanti ; Rust distingue refus de compilation et panic d’exécution.

JSON UTF-8, tableaux à plat directement utilisables par un front-end statique.

Contrôle structurel : 906 extraits distincts, 94 répétitions exactes, 76 familles de variantes. Voir validation.json.
