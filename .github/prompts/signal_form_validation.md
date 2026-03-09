# Prompt : ng-openapi-gen - Génération des schémas de validation Signal Form

## Objectif

Étendre ng-openapi-gen pour générer automatiquement des fonctions de validation Angular Signal Form à partir des métadonnées OpenAPI, avec un système de mapping configurable via dictionnaire.

## Contexte

- Le projet génère déjà des interfaces TypeScript et des factories de valeurs par défaut
- Angular Signal Forms utilise des validateurs comme `required`, `minLength`, `maxLength`, `min`, `max`, `email`, `pattern`
- Les specs OpenAPI contiennent les informations de validation : `required`, `minLength`, `maxLength`, `minimum`, `maximum`, `pattern`, `format`

---

## 1. Configuration dans `ng-openapi-gen.json`

### Structure complète

```json
{
	"generateValidationSchemas": true,
	"validationConfig": {
		"importPath": "@angular/forms/signals",
		"customImports": [
			{ "name": "date", "path": "@common" },
			{ "name": "phone", "path": "@common/validators" }
		],
		"mapping": {
			"required": {
				"validator": "required",
				"template": "required({{path}})"
			},
			"minLength": {
				"validator": "minLength",
				"template": "minLength({{path}}, {{value}})"
			},
			"maxLength": {
				"validator": "maxLength",
				"template": "maxLength({{path}}, {{value}})"
			},
			"minimum": {
				"validator": "min",
				"template": "min({{path}}, {{value}})"
			},
			"maximum": {
				"validator": "max",
				"template": "max({{path}}, {{value}})"
			},
			"pattern": {
				"validator": "pattern",
				"template": "pattern({{path}}, /{{value}}/)"
			},
			"format:email": {
				"validator": "email",
				"template": "email({{path}})"
			},
			"format:date": {
				"validator": "date",
				"template": "date({{path}})"
			},
			"format:date-time": {
				"validator": "date",
				"template": "date({{path}})"
			}
		},
		"disabled": [],
		"generateForInputDTOOnly": true,
		"functionPrefix": "apply",
		"functionSuffix": "Validation"
	}
}
```

### Description des options

| Option                                     | Type       | Description                                               |
| ------------------------------------------ | ---------- | --------------------------------------------------------- |
| `generateValidationSchemas`                | `boolean`  | Active/désactive la génération des fichiers de validation |
| `validationConfig.importPath`              | `string`   | Chemin d'import par défaut pour les validateurs natifs    |
| `validationConfig.customImports`           | `array`    | Imports additionnels pour validateurs custom              |
| `validationConfig.mapping`                 | `object`   | Dictionnaire de mapping OpenAPI → Signal Form             |
| `validationConfig.disabled`                | `string[]` | Liste des clés de mapping à désactiver                    |
| `validationConfig.generateForInputDTOOnly` | `boolean`  | Ne générer que pour les modèles finissant par `InputDTO`  |
| `validationConfig.functionPrefix`          | `string`   | Préfixe des fonctions générées (défaut: `"apply"`)        |
| `validationConfig.functionSuffix`          | `string`   | Suffixe des fonctions générées (défaut: `"Validation"`)   |

---

## 2. Système de mapping

### Clés de mapping disponibles

| Clé              | Source OpenAPI                                          | Description                        |
| ---------------- | ------------------------------------------------------- | ---------------------------------- |
| `required`       | Propriété dans le tableau `required[]` du schéma parent | Champ obligatoire                  |
| `minLength`      | Propriété `minLength`                                   | Longueur minimale (string)         |
| `maxLength`      | Propriété `maxLength`                                   | Longueur maximale (string)         |
| `minimum`        | Propriété `minimum`                                     | Valeur minimale (number)           |
| `maximum`        | Propriété `maximum`                                     | Valeur maximale (number)           |
| `pattern`        | Propriété `pattern`                                     | Expression régulière               |
| `format:<value>` | Propriété `format` avec valeur spécifique               | Format spécial (email, date, etc.) |
| `x-<name>`       | Extension vendor OpenAPI                                | Extensions custom                  |

### Structure d'une entrée de mapping

```json
{
	"<clé>": {
		"validator": "<nom_fonction>",
		"template": "<template_génération>"
	}
}
```

| Propriété   | Description                                 |
| ----------- | ------------------------------------------- |
| `validator` | Nom de la fonction de validation à importer |
| `template`  | Template de code à générer                  |

---

## 3. Système de template

### Placeholders disponibles

| Placeholder     | Description                                               | Exemple                      |
| --------------- | --------------------------------------------------------- | ---------------------------- |
| `{{path}}`      | Chemin complet du champ dans le formulaire                | `p.coordonnees.nomNaissance` |
| `{{value}}`     | Valeur de la contrainte OpenAPI                           | `30`, `"^[a-z]+$"`           |
| `{{value.xxx}}` | Sous-propriété si `value` est un objet (extensions `x-*`) | `{{value.min}}`              |
| `{{property}}`  | Nom de la propriété                                       | `nomNaissance`               |
| `{{type}}`      | Type TypeScript de la propriété                           | `string`, `number`           |

### Exemples de templates

```json
{
	"required": {
		"validator": "required",
		"template": "required({{path}})"
	},
	"maxLength": {
		"validator": "maxLength",
		"template": "maxLength({{path}}, {{value}})"
	},
	"pattern": {
		"validator": "pattern",
		"template": "pattern({{path}}, /{{value}}/)"
	},
	"format:email": {
		"validator": "email",
		"template": "email({{path}})"
	},
	"format:tel": {
		"validator": "phone",
		"template": "phone({{path}}, 'FR')"
	},
	"x-date-range": {
		"validator": "dateRange",
		"template": "dateRange({{path}}, '{{value.min}}', '{{value.max}}')"
	}
}
```

---

## 4. Custom Imports

Quand un validateur n'est pas natif de `@angular/forms/signals`, il faut définir son import :

```json
{
	"customImports": [
		{ "name": "date", "path": "@common" },
		{ "name": "phone", "path": "@common/validators" },
		{ "name": "iban", "path": "@app/validators" }
	]
}
```

### Génération des imports

```typescript
// Validateurs natifs → importPath par défaut
import { email, maxLength, required } from '@angular/forms/signals';

// Validateurs custom → customImports
import { date } from '@common';
import { phone } from '@common/validators';
import { iban } from '@app/validators';
```

**Règle** : Si un `validator` du mapping n'est pas dans `customImports`, il est importé depuis `importPath`.

---

## 5. Fichier généré par modèle

### Nom du fichier

Pour un modèle `CandidatCoordonneesInputDTO` → `candidat-coordonnees-input-dto.validation.ts`

### Structure du fichier

```typescript
/* eslint-disable */
/* Code generated by ng-openapi-gen DO NOT EDIT. */

import { email, maxLength, minLength, required } from '@angular/forms/signals';
import { date } from '@common';
import type { SchemaPath } from '@angular/forms/signals';
import type { CandidatCoordonneesInputDTO } from './candidat-coordonnees-input-dto';

export function applyCandidatCoordonneesInputDTOValidation<T extends CandidatCoordonneesInputDTO>(p: SchemaPath<T>, nested = true): void {
	required(p.civilite);

	required(p.nomNaissance);
	maxLength(p.nomNaissance, 30);

	maxLength(p.nomUsage, 30);

	required(p.prenom);
	maxLength(p.prenom, 30);

	required(p.eMail);
	maxLength(p.eMail, 100);
	email(p.eMail);

	required(p.telephone);
	maxLength(p.telephone, 20);
}
```

---

## 6. Gestion des objets imbriqués (nested)

### Signature de la fonction

Toutes les fonctions générées ont un paramètre `nested` avec valeur par défaut `true` :

```typescript
export function applyCandidatInputDTOValidation<T extends CandidatInputDTO>(p: SchemaPath<T>, nested = true): void {
	// Validations du niveau racine
	required(p.someRootField);

	// Appels récursifs conditionnels
	if (nested) {
		applyCandidatCoordonneesInputDTOValidation(p.coordonnees, nested);
		applyCandidatLocalisationInputDTOValidation(p.localisation, nested);
		applyCandidatStatutInputDTOValidation(p.statut, nested);
	}
}
```

### Utilisation

```typescript
// Avec récursion (défaut)
const myForm = form(this.formData, (p) => {
	applyCandidatInputDTOValidation(p);
});

// Sans récursion - gestion manuelle des enfants
const myForm = form(this.formData, (p) => {
	applyCandidatInputDTOValidation(p, false);

	// Gestion manuelle avec conditions spécifiques
	applyCandidatCoordonneesInputDTOValidation(p.coordonnees);
	// localisation gérée différemment selon le contexte...
});
```

### Règles pour les objets imbriqués

1. Si une propriété est de type objet (référence à un autre schéma)
2. ET que ce schéma a une fonction de validation générée
3. ALORS générer l'appel conditionnel dans le bloc `if (nested)`

---

## 7. Index d'export

Générer un fichier `validation-schemas.ts` qui exporte toutes les fonctions :

```typescript
/* eslint-disable */
/* Code generated by ng-openapi-gen DO NOT EDIT. */

export { applyCandidatInputDTOValidation } from './models/candidat-input-dto.validation';
export { applyCandidatCoordonneesInputDTOValidation } from './models/candidat-coordonnees-input-dto.validation';
export { applyCandidatLocalisationInputDTOValidation } from './models/candidat-localisation-input-dto.validation';
export { applyCandidatStatutInputDTOValidation } from './models/candidat-statut-input-dto.validation';
// ...
```

---

## 8. Mapping par défaut

Si `mapping` n'est pas défini dans la config, utiliser ces valeurs par défaut :

```typescript
const DEFAULT_MAPPING = {
	required: { validator: 'required', template: 'required({{path}})' },
	minLength: { validator: 'minLength', template: 'minLength({{path}}, {{value}})' },
	maxLength: { validator: 'maxLength', template: 'maxLength({{path}}, {{value}})' },
	minimum: { validator: 'min', template: 'min({{path}}, {{value}})' },
	maximum: { validator: 'max', template: 'max({{path}}, {{value}})' },
	pattern: { validator: 'pattern', template: 'pattern({{path}}, /{{value}}/)' },
	'format:email': { validator: 'email', template: 'email({{path}})' },
};
```

---

## 9. Cas particuliers à gérer

### Tableaux

Ne pas générer de validation pour les éléments de tableau. Les tableaux sont gérés manuellement.

```json
{
	"missions": {
		"type": "array",
		"items": { "$ref": "#/components/schemas/MissionDTO" }
	}
}
```

→ Pas de validation générée pour `missions`

### Nullable

Ne pas ajouter `required` si la propriété a `nullable: true` même si elle est dans le tableau `required` du parent.

### AllOf / OneOf

Fusionner les contraintes de validation de tous les schémas composés.

### Imports optimisés

N'importer que les validateurs effectivement utilisés dans le fichier.

---

## 10. Exemple complet

### Input OpenAPI (swagger.json)

```json
{
	"components": {
		"schemas": {
			"CandidatCoordonneesInputDTO": {
				"type": "object",
				"required": ["nomNaissance", "prenom", "eMail", "telephone"],
				"properties": {
					"civilite": {
						"type": "integer"
					},
					"nomNaissance": {
						"type": "string",
						"maxLength": 30
					},
					"nomUsage": {
						"type": "string",
						"maxLength": 30,
						"nullable": true
					},
					"prenom": {
						"type": "string",
						"maxLength": 30
					},
					"eMail": {
						"type": "string",
						"maxLength": 100,
						"format": "email"
					},
					"telephone": {
						"type": "string",
						"maxLength": 20,
						"pattern": "^(?:(?:\\+|00)33|0)\\s*[1-9](?:[\\s.-]*\\d{2}){4}$"
					}
				}
			}
		}
	}
}
```

### Output généré

```typescript
/* eslint-disable */
/* Code generated by ng-openapi-gen DO NOT EDIT. */

import { email, maxLength, pattern, required } from '@angular/forms/signals';
import type { SchemaPath } from '@angular/forms/signals';
import type { CandidatCoordonneesInputDTO } from './candidat-coordonnees-input-dto';

export function applyCandidatCoordonneesInputDTOValidation<T extends CandidatCoordonneesInputDTO>(p: SchemaPath<T>, nested = true): void {
	required(p.nomNaissance);
	maxLength(p.nomNaissance, 30);

	maxLength(p.nomUsage, 30);

	required(p.prenom);
	maxLength(p.prenom, 30);

	required(p.eMail);
	maxLength(p.eMail, 100);
	email(p.eMail);

	required(p.telephone);
	maxLength(p.telephone, 20);
	pattern(p.telephone, /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/);
}
```

---

## 11. Résumé des fichiers à créer/modifier

| Fichier                       | Action   | Description                              |
| ----------------------------- | -------- | ---------------------------------------- |
| `ng-openapi-gen-schema.json`  | Modifier | Ajouter les nouvelles options de config  |
| `lib/validation-generator.ts` | Créer    | Logique de génération des validations    |
| `lib/template-engine.ts`      | Créer    | Moteur de template pour les placeholders |
| `lib/validation-model.ts`     | Créer    | Modèle de données pour les validations   |
| `lib/ng-openapi-gen.ts`       | Modifier | Intégrer l'appel au ValidationGenerator  |

---

## 12. Contraintes d'implémentation

1. **Rétrocompatibilité** : Ne pas modifier les fichiers existants (interfaces, services) si `generateValidationSchemas` est `false`
2. **Optionnel** : Les fichiers de validation ne sont générés que si activés
3. **Conventions** : Respecter les mêmes conventions de nommage que les modèles existants (kebab-case pour fichiers, PascalCase pour types)
4. **Performance** : Ne parser les contraintes de validation qu'une seule fois par schéma
5. **Robustesse** : Gérer les cas où un schéma référencé n'a pas de fonction de validation générée
