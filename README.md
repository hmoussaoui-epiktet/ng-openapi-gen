## ng-openapi-gen : Un générateur de code OpenAPI 3.0 et 3.1 pour Angular

![Statut du build](https://github.com/cyclosproject/ng-openapi-gen/workflows/build/badge.svg)

Ce projet est un module NPM qui génère des interfaces de modèles et des clients de services web à partir d'une [spécification](https://github.com/OAI/OpenAPI-Specification) [OpenApi 3.0 ou 3.1](https://www.openapis.org/). Les classes générées suivent les principes d'[Angular](https://angular.io/). Le code généré est compatible avec Angular 16+. Le support d'OpenAPI 3.1 a été ajouté depuis ng-openapi-gen 1.0.

Pour un générateur [Swagger / OpenAPI 2.0](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md), utilisez plutôt [ng-swagger-gen](https://github.com/cyclosproject/ng-swagger-gen). Notez que ng-swagger-gen n'est plus maintenu depuis un certain temps.

## Points forts

- Facile à utiliser et à intégrer avec Angular CLI ;
- Supporte les spécifications OpenAPI 3.0 et 3.1 aux formats `JSON` et `YAML` ;
- Chaque chemin OpenAPI est mappé vers une fonction. Ces fonctions sont invoquées via un service `@Injectable` généré ;
    - Alternativement, il est possible de générer un service `@Injectable` par tag. Cela offre une API un peu plus propre au prix d'une taille de bundle plus importante ;
- Supporte à la fois `Promise` (par défaut) et `Observable` comme types de retour pour les services ;
- Permet d'accéder à la `HttpResponse` originale, par exemple pour lire les en-têtes ;
    - Ceci est réalisé en générant une variante suffixée par `$Response` sur les services ;
- `OpenAPI` supporte les combinaisons de types de contenu pour le corps de requête et la réponse. Pour chaque combinaison, une fonction distincte est générée ;
- Il est possible de spécifier un sous-ensemble de fonctions / modèles à générer.
    - Ne pensez pas à cela pour réduire la taille du bundle, car le tree-shaking n'inclut que les fonctions / modèles utilisés, mais pour avoir une bibliothèque plus propre ;
- Il est possible de spécifier une URL racine personnalisée pour les endpoints des services web ;
- Les fichiers générés doivent compiler avec les flags stricts du compilateur TypeScript, tels que `noUnusedLocals` et `noUnusedParameters`.

## Limitations

- Seules les descriptions standard OpenAPI 3.0 / 3.1 seront générées ;
    - Cependant, ng-openapi-gen supporte quelques [extensions vendeur](#extensions-vendeur-supportées) ;
- Les serveurs par opération ne sont pas supportés ;
- Seul le premier serveur est utilisé comme URL racine par défaut dans la configuration ;
- Aucune transformation de données n'est effectuée avant l'envoi / après la réception des données ;
    - Cela signifie qu'une propriété de type `string` et format `date-time` sera toujours générée comme `string`, pas comme `Date`. Sinon, chaque appel API devrait avoir un traitement qui parcourrait le graphe d'objets retourné avant d'envoyer la requête pour remplacer toutes les propriétés date par `Date`. Il en va de même pour les requêtes envoyées. De telles opérations sont hors du périmètre de `ng-openapi-gen` ;

## Migration des versions précédentes vers 1.0+

À partir de la version 1.0, ng-openapi-gen a mis à jour certaines options de configuration par défaut pour mieux s'aligner sur les standards actuels. Voici les paramètres qui ont changé :

- `"module": false` : Auparavant, la valeur par défaut était `ApiModule`. Les `NgModule`s ne sont plus nécessaires depuis l'introduction des composants standalone dans Angular 14. Toutes les classes `@Injectable` générées sont fournies dans le module racine, donc nous n'en avons plus besoin.
- `"services": false` : Auparavant, la valeur par défaut était `true`. Depuis un certain temps déjà, ng-openapi-gen génère des fonctions pour chaque opération API, et les services (un par tag API) ne sont que des wrappers autour de ces fonctions. Comme les services référencent toutes les fonctions, pour les grandes API, la taille du bundle est impactée, car le code pour gérer toutes les fonctions du tag sera inclus, même si vous n'en utilisez qu'une seule.
- `"apiService": "Api"` : Auparavant vide, le service `Api` n'était pas généré, car la valeur par défaut était d'utiliser un service par tag. Mais maintenant nous en avons besoin pour invoquer les fonctions API générées.
- `"enumStyle": "alias"` : Auparavant, la valeur par défaut était `pascal`. Avec ce changement, par défaut nous ne générons plus de TypeScript `enum`. À la place, un type est défini avec une union des valeurs possibles. Toutes les autres options finissent par générer un TypeScript `enum`, qui émet une classe JavaScript, occupant de l'espace dans la taille du bundle.
- `"enumArray": true` : L'inconvénient majeur de `enumStyle: alias` est qu'il n'y a pas de moyen d'itérer toutes les valeurs existantes. Avec `enumArray` nous générons un fichier `.ts` adjacent qui exporte un tableau (du bon type enum) avec tous les éléments.
- `"promises": true` : Par défaut, les services générés retournent des `Promise`s, pas des `Observable`s. Si vous préférez continuer à travailler avec des `Observable`s, définissez `"promises": false`.

Donc, si vous mettez à niveau depuis des versions précédentes et souhaitez que la génération soit similaire, définissez tous ces paramètres dans votre configuration avec leurs valeurs par défaut précédentes correspondantes.

## Installation et exécution

Vous pouvez installer `ng-openapi-gen` globalement ou juste sur votre projet. Voici un exemple pour une installation globale :

```bash
$ npm install -g ng-openapi-gen
$ ng-openapi-gen --input my-api.yaml --output my-app/src/app/api
```

Alternativement, vous pouvez utiliser le générateur directement depuis votre script de build :

```typescript
import $RefParser from 'json-schema-ref-parser';
import { NgOpenApiGen } from 'ng-openapi-gen';

const options = {
	input: 'my-api.json',
	output: 'my-app/src/app/api',
};

// charger la spec openapi et résoudre toutes les $refs
const RefParser = new $RefParser();
const openApi = await RefParser.bundle(options.input, {
	dereference: { circular: false },
});

const ngOpenGen = new NgOpenApiGen(openApi, options);
ngOpenGen.generate();
```

Cela s'attendra à ce que le fichier `my-api.yaml` (ou `my-api.json`) soit dans le répertoire courant, et générera les fichiers dans `my-app/src/app/api`.

## Fichier de configuration et arguments CLI

Si le fichier `ng-openapi-gen.json` existe dans le répertoire courant, il sera lu. Alternativement, vous pouvez exécuter `ng-openapi-gen --config my-config.json` (ou `-c`) pour spécifier un fichier de configuration différent, ou même spécifier l'entrée / sortie comme `ng-openapi-gen -i input.yaml` ou `ng-openapi-gen -i input.yaml -o /tmp/generation`. La seule propriété de configuration requise est `input`, qui spécifie le fichier de spécification `OpenAPI`. La valeur par défaut de `output` est `src/app/api`.

Vous pouvez même générer du code pour plusieurs APIs dans un seul projet, chacune avec son propre fichier de configuration. Dans ce cas, vous voudrez probablement aussi personnaliser les noms, comme avoir une `configuration` et un `apiService` différents pour chaque API.

Pour une liste de toutes les options de configuration possibles, consultez le [fichier JSON schema](https://raw.githubusercontent.com/cyclosproject/ng-openapi-gen/master/ng-openapi-gen-schema.json). Vous pouvez aussi exécuter `ng-openapi-gen --help` pour voir toutes les options disponibles. Chaque option du JSON schema peut être passée comme argument CLI, en camelCase comme `--includeTags tag1,tag2,tag3`, ou en kebab-case comme `--exclude-tags tag1,tag2,tag3`.

Voici un exemple de fichier de configuration :

```json
{
	"$schema": "node_modules/ng-openapi-gen/ng-openapi-gen-schema.json",
	"input": "my-file.json",
	"output": "my-app/src/app/api",
	"ignoreUnusedModels": false
}
```

## Utilisation des appels API fonctionnels

`ng-openapi-gen` génère une fonction avec l'implémentation de chaque appel API réel. Par défaut depuis la version 1.0, les services par tag API ne sont pas générés. Pour utiliser ces fonctions, un service `@Injectable` `Api` est fourni. Ce nom peut être changé avec la configuration `apiService`. Voici un exemple :

```typescript
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Api } from './api/api';
import { getResults } from './api/fn/operations/get-results';
import { Result } from './api/models';

@Component({
	selector: 'app-root',
	imports: [RouterOutlet],
	templateUrl: './app.html',
	styleUrl: './app.css',
})
export class App implements OnInit {
	protected readonly results = signal<Result[] | null>(null);

	private api = inject(Api);

	async ngOnInit() {
		this.results.set(await this.api.invoke(getResults, { limit: 5 }));
	}
}
```

Alternativement, ng-openapi-gen peut être configuré pour générer des services pour chaque tag API. C'était le comportement par défaut avant la version 1.0. Les services fournissent une API légèrement plus propre, au prix d'une taille de bundle supplémentaire. Pour les grandes API, supposons que votre tag a 50 opérations et que vous injectez le service dans un composant, avec les fonctions, seule la fonction correspondante sera incluse avec le code du composant. Cependant, si vous injectez un service, les 50 fonctions seront incluses. Vous pouvez définir l'option de configuration `"services": true`, et l'utiliser ainsi :

```typescript
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Result } from './api/models';
import { ResultsService } from './api/services';

@Component({
	selector: 'app-root',
	imports: [RouterOutlet],
	templateUrl: './app.html',
	styleUrl: './app.css',
})
export class App implements OnInit {
	protected readonly results = signal<Result[] | null>(null);

	private resultsService = inject(ResultsService);

	async ngOnInit() {
		this.results.set(await this.resultsService.getResults({ limit: 5 }));
	}
}
```

Notez qu'il y a des améliorations cosmétiques minimales, au prix de tailles de bundle supplémentaires, surtout pour les grandes API.

## Spécifier l'URL racine / endpoint du service web

Par défaut, le serveur spécifié dans la spécification OpenAPI est utilisé comme URL racine pour les chemins API. Cependant, c'est une exigence courante de configurer cela depuis l'application. Le moyen le plus simple est d'injecter l'instance `ApiConfiguration` (notez qu'elle peut être renommée avec le paramètre `configuration`) dans votre composant bootstrap et de la définir directement :

```typescript
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiConfiguration } from './api/api-configuration';
import { Result } from './api/models';

@Component({
	selector: 'app-root',
	imports: [RouterOutlet],
	templateUrl: './app.html',
	styleUrl: './app.css',
})
export class App implements OnInit {
	protected readonly results = signal<Result[] | null>(null);

	private apiConfiguration = inject(ApiConfiguration);

	async ngOnInit() {
		this.apiConfiguration.rootUrl = 'http://localhost:3000';
	}
}
```

Alternativement, si vous générez un `NgModule` en définissant la configuration `module` (ce qui n'est pas recommandé depuis les composants standalone d'Angular, et est désactivé par défaut dans ng-openapi-gen), vous pouvez utiliser sa méthode `.forRoot({ rootUrl: 'https://www.my-server.com/api'})` lors de l'import du module. Cependant, ceci est conservé uniquement pour des raisons historiques, et pourrait être supprimé à l'avenir.

## Passer des en-têtes de requête / personnaliser la requête

Pour passer des en-têtes de requête, comme l'autorisation ou les clés API, ainsi que pour avoir une gestion centralisée des erreurs, un [intercepteur](https://angular.dev/guide/http/interceptors) standard devrait être utilisé. Voici un exemple d'intercepteur fonctionnel :

```typescript
import { HttpInterceptorFn } from '@angular/common/http';

export const API_INTERCEPTOR: HttpInterceptorFn = (req, next) => {
	console.log('Requête interceptée:', req);
	return next(req);
};
```

Ensuite, utilisez-le dans votre `app.config.ts` :

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { API_INTERCEPTOR } from './api-interceptor';

export const appConfig: ApplicationConfig = {
	providers: [
		// ... autres
		provideHttpClient(withInterceptors([API_INTERCEPTOR])),
	],
};
```

## Configurer un script node

Ce n'est pas une bonne pratique d'avoir du code généré commité dans le système de contrôle de version (comme git). La seule exception est pour les projets utilisant une définition d'API tierce qui ne change jamais, auquel cas ng-openapi-gen est censé être exécuté une seule fois. Pour ignorer le dossier de sortie du générateur dans GIT, en supposant le dossier de sortie par défaut `src/app/api`, créez le fichier `src/app/.gitignore`, avec une ligne contenant `api`.

Si vous utilisez une définition d'API qui peut changer, configurez un script NPM pour vous assurer que chaque fois que votre projet est démarré ou construit, les fichiers générés sont cohérents avec la définition de l'API. Pour ce faire, créez le fichier de configuration `ng-openapi-gen.json` et ajoutez les `scripts` suivants à votre `package.json` :

```json
{
	"scripts": {
		"generate:api": "ng-openapi-gen",
		"start": "npm run generate:api && npm run ng -- serve",
		"build": "npm run generate:api && npm run ng -- build -prod"
	}
}
```

De cette façon, chaque fois que vous exécutez `npm start` ou `npm run build`, les classes API seront re-générées.

Aussi, si vous utilisez plusieurs fichiers de configuration, vous pouvez spécifier plusieurs fois l'appel à `ng-openapi-gen`, comme :

```json
{
	"scripts": {
		"generate:api": "npm run generate:api:a && npm run generate:api:b",
		"generate.api:a": "ng-openapi-gen -c api-a.json",
		"generate.api:b": "ng-openapi-gen -c api-b.json",
		"start": "npm run generate:api && npm run ng -- serve",
		"build": "npm run generate:api && npm run ng -- build -prod"
	}
}
```

## Extensions vendeur supportées

En plus de la spécification OpenAPI 3, les extensions vendeur suivantes sont supportées :

- `x-operation-name` : Définie dans [LoopBack](https://loopback.io/doc/en/lb4/Decorators_openapi.html), cette extension peut être utilisée dans les opérations pour spécifier le nom réel de la méthode. L'`operationId` doit être unique parmi tous les tags, mais avec cette extension, un nom de méthode plus court peut être utilisé par tag (service). Exemple :

```yaml
paths:
    /users:
        get:
            tags:
                - Users
            operationId: listUsers
            x-operation-name: list
            # ...
    /places:
        get:
            tags:
                - Places
            operationId: listPlaces
            x-operation-name: list
            # ...
```

- `x-enumNames` : Générée par [NSwag](https://github.com/RicoSuter/NSwag), cette extension permet aux schémas qui sont des énumérations de personnaliser les noms des enum. Ce doit être un tableau de la même longueur que les valeurs réelles de l'enum. Exemple :

```yaml
components:
    schemas:
        HttpStatusCode:
            type: integer
            enum:
                - 200
                - 404
                - 500
            x-enumNames:
                - OK
                - NOT_FOUND
                - INTERNAL_SERVER_ERROR
```

## Personnalisation des templates

Vous pouvez personnaliser les templates Handlebars en copiant les fichiers désirés du dossier [templates](https://github.com/cyclosproject/ng-openapi-gen/tree/master/templates) (seulement ceux que vous devez personnaliser) vers un dossier de votre projet, puis en le référençant dans le fichier de configuration.

Par exemple, pour faire que les objets étendent une interface de base, copiez le fichier [object.handlebars](https://github.com/cyclosproject/ng-openapi-gen/tree/master/templates) vers votre dossier `src/templates`. Ensuite, dans le fichier `ng-openapi-gen.json`, définissez : `"templates": "src/templates"`. Enfin, le `src/templates/object.handlebars` personnalisé ressemblerait à ceci (basé sur la version 1.0, sujet à changement à l'avenir) :

```handlebars
import { MyBaseModel} from 'src/app/my-base-model';

export interface {{typeName}} extends MyBaseModel {
{{#properties}}
{{{tsComments}}}{{{identifier}}}{{^required}}?{{/required}}: {{{type}}};
{{/properties}}
{{#additionalPropertiesType}}

  [key: string]: {{{.}}};
{{/additionalPropertiesType}}
}
```

## Helpers Handlebars personnalisés

Vous pouvez intégrer vos propres helpers Handlebars pour des templates personnalisés. Pour ce faire, fournissez simplement un fichier `handlebars.js` dans le même répertoire que vos templates qui exporte une fonction recevant l'instance Handlebars qui sera utilisée lors de la génération du code à partir de vos templates.

```js
module.exports = function (handlebars) {
	// Ajout d'un helper handlebars personnalisé : loud
	handlebars.registerHelper('loud', function (aString) {
		return aString.toUpperCase();
	});
};
```

## Génération des schémas de validation (Angular Signal Forms)

ng-openapi-gen peut générer automatiquement des fonctions de validation pour Angular Signal Forms à partir des contraintes définies dans votre spécification OpenAPI.

### Configuration de base

Pour activer la génération des validations, ajoutez la section `validation` dans votre configuration :

```json
{
	"$schema": "node_modules/ng-openapi-gen/ng-openapi-gen-schema.json",
	"input": "my-api.yaml",
	"output": "src/app/api",
	"validation": {
		"enabled": true
	}
}
```

Les fichiers de validation seront générés dans le dossier `validation/` (configurable via `outputDir`).

### Exemple d'utilisation

Supposons que vous ayez un modèle OpenAPI défini ainsi :

```yaml
components:
    schemas:
        UserInputDTO:
            type: object
            required:
                - email
                - name
            properties:
                email:
                    type: string
                    format: email
                name:
                    type: string
                    minLength: 2
                    maxLength: 100
                age:
                    type: integer
                    minimum: 0
                    maximum: 150
                website:
                    type: string
                    pattern: '^https?://.*'
```

ng-openapi-gen générera une fonction de validation :

```typescript
import { email, maxLength, min, max, minLength, pattern, required } from '@angular/forms/signals';
import { SignalFormGroup } from '@angular/forms/signals';
import { UserInputDTO } from '../models/user-input-dto';

export function applyUserInputDTOValidation(form: SignalFormGroup<UserInputDTO>): void {
	const p = form.controls;
	required(p.email);
	email(p.email);
	required(p.name);
	minLength(p.name, 2);
	maxLength(p.name, 100);
	min(p.age, 0);
	max(p.age, 150);
	pattern(p.website, new RegExp('^https?://.*'));
}
```

Utilisez cette fonction avec vos formulaires Angular Signal Forms :

```typescript
import { Component, inject } from '@angular/core';
import { SignalFormBuilder } from '@angular/forms/signals';
import { applyUserInputDTOValidation } from './api/validation/apply-user-input-dto-validation';
import { UserInputDTO } from './api/models';

@Component({
	selector: 'app-user-form',
	templateUrl: './user-form.html',
})
export class UserFormComponent {
	private fb = inject(SignalFormBuilder);

	form = this.fb.group<UserInputDTO>({
		email: '',
		name: '',
		age: null,
		website: '',
	});

	constructor() {
		applyUserInputDTOValidation(this.form);
	}
}
```

### Mapping des contraintes OpenAPI vers les validateurs

Par défaut, ng-openapi-gen mappe les contraintes OpenAPI suivantes :

| Contrainte OpenAPI                    | Validateur Angular | Template généré                              |
| ------------------------------------- | ------------------ | -------------------------------------------- |
| `required` (dans le tableau required) | `required`         | `required({{path}})`                         |
| `minLength`                           | `minLength`        | `minLength({{path}}, {{value}})`             |
| `maxLength`                           | `maxLength`        | `maxLength({{path}}, {{value}})`             |
| `minimum`                             | `min`              | `min({{path}}, {{value}})`                   |
| `maximum`                             | `max`              | `max({{path}}, {{value}})`                   |
| `pattern`                             | `pattern`          | `pattern({{path}}, new RegExp('{{value}}'))` |
| `format: email`                       | `email`            | `email({{path}})`                            |

### Personnalisation du mapping

Vous pouvez surcharger ou étendre le mapping par défaut :

```json
{
	"validation": {
		"enabled": true,
		"mapping": {
			"format:date": {
				"validator": "dateValidator",
				"template": "dateValidator({{path}})"
			},
			"format:phone": {
				"validator": "phoneValidator",
				"template": "phoneValidator({{path}})"
			}
		}
	}
}
```

### Ajout de validateurs personnalisés

Pour utiliser des validateurs personnalisés qui ne proviennent pas de `@angular/forms/signals`, utilisez `customImports` :

```json
{
	"validation": {
		"enabled": true,
		"importPath": "@angular/forms/signals",
		"customImports": [
			{ "name": "dateValidator", "path": "@app/validators" },
			{ "name": "phoneValidator", "path": "@app/validators" }
		],
		"mapping": {
			"format:date": {
				"validator": "dateValidator",
				"template": "dateValidator({{path}})"
			}
		}
	}
}
```

Cela générera les imports suivants :

```typescript
import { required, minLength, maxLength } from '@angular/forms/signals';
import { dateValidator, phoneValidator } from '@app/validators';
```

### Désactivation de certains validateurs

Pour désactiver certains validateurs par défaut, utilisez l'option `disabled` :

```json
{
	"validation": {
		"enabled": true,
		"disabled": ["format:email", "pattern"]
	}
}
```

### Génération pour les modèles InputDTO uniquement

Si vous souhaitez générer les validations uniquement pour les modèles de type "input" (par exemple, ceux se terminant par `InputDTO`), activez l'option `generateForInputDTOOnly` :

```json
{
	"validation": {
		"enabled": true,
		"generateForInputDTOOnly": true
	}
}
```

### Configuration complète

Voici un exemple de configuration complète :

```json
{
	"$schema": "node_modules/ng-openapi-gen/ng-openapi-gen-schema.json",
	"input": "api.yaml",
	"output": "src/app/api",
	"validation": {
		"enabled": true,
		"outputDir": "validation",
		"importPath": "@angular/forms/signals",
		"functionPrefix": "apply",
		"functionSuffix": "Validation",
		"generateForInputDTOOnly": false,
		"customImports": [
			{ "name": "dateValidator", "path": "@app/validators" },
			{ "name": "ibanValidator", "path": "@app/validators/iban" }
		],
		"mapping": {
			"format:date": {
				"validator": "dateValidator",
				"template": "dateValidator({{path}})"
			},
			"format:iban": {
				"validator": "ibanValidator",
				"template": "ibanValidator({{path}})"
			}
		},
		"disabled": []
	}
}
```

### Support des objets imbriqués

ng-openapi-gen génère automatiquement des appels récursifs pour les propriétés qui référencent d'autres modèles. Par exemple :

```yaml
components:
    schemas:
        OrderInputDTO:
            type: object
            required:
                - customer
            properties:
                customer:
                    $ref: '#/components/schemas/CustomerInputDTO'
        CustomerInputDTO:
            type: object
            required:
                - email
            properties:
                email:
                    type: string
                    format: email
```

Générera :

```typescript
// apply-order-input-dto-validation.ts
import { applyCustomerInputDTOValidation } from './apply-customer-input-dto-validation';

export function applyOrderInputDTOValidation(form: SignalFormGroup<OrderInputDTO>): void {
	const p = form.controls;
	applyCustomerInputDTOValidation(p.customer as unknown as SignalFormGroup<CustomerInputDTO>);
}
```

## Développement et contribution

Le générateur lui-même est écrit en TypeScript. Lors du build, le code est transpilé en JavaScript dans le dossier `dist`. Et le dossier `dist` est celui qui est publié sur NPM. Même pour empêcher la publication depuis le mauvais chemin, le fichier `package.json` a `"private": true`, qui est remplacé par `false` dans le processus de build.

Les tests, quant à eux, s'exécutent sur vitest et s'exécutent directement depuis TypeScript.

Après avoir développé les modifications, pour `link` le module et le tester avec d'autres projets node, exécutez ce qui suit :

```bash
npm run build
cd dist
npm link
```

À ce stade, le ng-openapi-gen disponible globalement sera celui compilé dans le dossier `dist`.
