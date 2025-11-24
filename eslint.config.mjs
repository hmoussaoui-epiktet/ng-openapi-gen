// @ts-nocheck
const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");
const prettier = require("eslint-config-prettier/flat");

module.exports = tseslint.config(
	{
		files: ["./src/**/*.ts"],
		ignores: ["src/openapi/**/*"],
		extends: [
			eslint.configs.recommended,
			...tseslint.configs.recommended,
			...tseslint.configs.stylistic,
			...angular.configs.tsRecommended,
			prettier,
		],
		processor: angular.processInlineTemplates,
		languageOptions: {
			parserOptions: {
				project: ["tsconfig.json"],
				tsconfigRootDir: __dirname,
			},
		},
		rules: {
			"@angular-eslint/directive-selector": [
				"error",
				{
					type: "attribute",
					prefix: "epk",
					style: "camelCase",
				},
			],
			"@angular-eslint/component-selector": [
				"error",
				{
					type: "element",
					prefix: "epk",
					style: "kebab-case",
				},
			],
			"@typescript-eslint/naming-convention": [
				"error",
				{
					selector: [
						"classProperty",
						"objectLiteralProperty",
						"typeProperty",
						"classMethod",
						"objectLiteralMethod",
						"typeMethod",
						"accessor",
						"enumMember",
						"variable",
					],
					format: null,
				},
			],
			"@angular-eslint/template/elements-content": "off",
			"@angular-eslint/component-class-suffix": "off",
			"@angular-eslint/no-output-rename": "off",
			"@angular-eslint/no-input-rename": "off",
			"@angular-eslint/component-selector": [
				"error",
				{
					type: "element",
					prefix: "epk",
					style: "kebab-case",
				},
			],
			"@angular-eslint/directive-class-suffix": "off",
			"@angular-eslint/directive-selector": "off",
			"@typescript-eslint/dot-notation": "off",
			"@typescript-eslint/ban-ts-comment": "off",
			"@typescript-eslint/no-inferrable-types": "off",
			"@typescript-eslint/no-namespace": "off",
			"@typescript-eslint/no-unused-expressions": "off",
			"@typescript-eslint/no-explicit-any": "error",
			"@typescript-eslint/class-literal-property-style": "off",
			"@typescript-eslint/no-array-delete": "error",
			"@typescript-eslint/consistent-generic-constructors": "off",
			"@typescript-eslint/consistent-type-definitions": "off",
			"@typescript-eslint/no-empty-function": "off",
			"@typescript-eslint/no-unused-vars": [
				"error", // or "error"
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_",
				},
			],
			"jsdoc/newline-after-description": "off",
			"eol-last": "off",
			"id-blacklist": "off",
			"id-match": "off",
			"max-len": [
				"error",
				{
					code: 190,
				},
			],
			"no-bitwise": "off",
			"no-cond-assign": "off",
			"no-underscore-dangle": "off",
			curly: "off",
			"no-unused-vars": "off",
		},
	},
	{
		files: ["**/*.html"],
		extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
		rules: {
			"@angular-eslint/template/interactive-supports-focus": "off",
			"@angular-eslint/template/click-events-have-key-events": "off",
		},
	},
	{
		files: ["./sample/**/*.ts"],
		extends: [
			eslint.configs.recommended,
			...tseslint.configs.recommended,
			...tseslint.configs.stylistic,
			...angular.configs.tsRecommended,
			prettier,
		],
		processor: angular.processInlineTemplates,
		languageOptions: {
			parserOptions: {
				project: ["tsconfig.json"],
				tsconfigRootDir: __dirname,
			},
		},
		rules: {
			"@angular-eslint/directive-selector": [
				"error",
				{
					type: "attribute",
					prefix: "app",
					style: "camelCase",
				},
			],
			"@angular-eslint/component-selector": [
				"error",
				{
					type: "element",
					prefix: "app",
					style: "kebab-case",
				},
			],
		},
	},
);
