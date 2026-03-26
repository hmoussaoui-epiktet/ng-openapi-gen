import { NgOpenApiGen } from '../lib/ng-openapi-gen';
import { OpenAPIObject } from '../lib/openapi-typings';
import { Options } from '../lib/options';
import options from './x-validators-schema.config.json';
import xValidatorsSpec from './x-validators-schema.json';

const spec = xValidatorsSpec as unknown as OpenAPIObject;

const gen = new NgOpenApiGen(spec, options as Options);
gen.generate();

describe('Generation tests using x-validators with schema mode', () => {
	describe('NumeroTelephoneInputDTO schema generation', () => {
		it('should have validation model', () => {
			const validationModel = gen.validationGenerator?.validationModels.get('NumeroTelephoneInputDTO');
			expect(validationModel).toBeDefined();
		});

		it('should have correct schemaName (camelCase + ProfileSchema suffix)', () => {
			const validationModel = gen.validationGenerator?.validationModels.get('NumeroTelephoneInputDTO');
			expect(validationModel?.schemaName).toBe('numeroTelephoneInputDTOProfileSchema');
		});

		it('should use rootPath prefix in generated code', () => {
			const validationModel = gen.validationGenerator?.validationModels.get('NumeroTelephoneInputDTO');
			expect(validationModel).toBeDefined();

			const telephoneValidations = validationModel?.propertyValidations.find((p) => p.name === 'telephone');
			expect(telephoneValidations).toBeDefined();

			// Should use rootPath, not p
			expect(telephoneValidations?.validations.some((v) => v.code.includes('rootPath.telephone'))).toBe(true);
			expect(telephoneValidations?.validations.some((v) => v.code.includes('p.telephone'))).toBe(false);
		});

		it('should include required validator from x-validators', () => {
			const validationModel = gen.validationGenerator?.validationModels.get('NumeroTelephoneInputDTO');
			const telephoneValidations = validationModel?.propertyValidations.find((p) => p.name === 'telephone');
			expect(telephoneValidations?.validations.some((v) => v.validator === 'required')).toBe(true);
			expect(telephoneValidations?.validations.some((v) => v.code === 'required(rootPath.telephone)')).toBe(true);
		});

		it('should include phoneFr validator from x-validators', () => {
			const validationModel = gen.validationGenerator?.validationModels.get('NumeroTelephoneInputDTO');
			const telephoneValidations = validationModel?.propertyValidations.find((p) => p.name === 'telephone');
			expect(telephoneValidations?.validations.some((v) => v.validator === 'phoneFr')).toBe(true);
		});

		it('should include custom message in phoneFr validator', () => {
			const validationModel = gen.validationGenerator?.validationModels.get('NumeroTelephoneInputDTO');
			const telephoneValidations = validationModel?.propertyValidations.find((p) => p.name === 'telephone');
			const phoneFrValidation = telephoneValidations?.validations.find((v) => v.validator === 'phoneFr');
			expect(phoneFrValidation?.code).toBe('phoneFr(rootPath.telephone, { message: \'Format de téléphone invalide\' })');
		});

		it('should have correct custom imports', () => {
			const validationModel = gen.validationGenerator?.validationModels.get('NumeroTelephoneInputDTO');
			expect(validationModel?.customValidatorImports.some((i) => i.name === 'phoneFr' && i.path === '@common')).toBe(true);
		});

		it('should have correct native imports', () => {
			const validationModel = gen.validationGenerator?.validationModels.get('NumeroTelephoneInputDTO');
			expect(validationModel?.nativeValidatorImports).toContain('required');
		});
	});

	describe('AgenceInputDTO schema generation', () => {
		it('should have correct schemaName', () => {
			const validationModel = gen.validationGenerator?.validationModels.get('AgenceInputDTO');
			expect(validationModel?.schemaName).toBe('agenceInputDTOProfileSchema');
		});

		it('should include required and maxLength for libelle field', () => {
			const validationModel = gen.validationGenerator?.validationModels.get('AgenceInputDTO');
			const libelleValidations = validationModel?.propertyValidations.find((p) => p.name === 'libelle');
			expect(libelleValidations?.validations.some((v) => v.validator === 'required')).toBe(true);
			expect(libelleValidations?.validations.some((v) => v.code === 'maxLength(rootPath.libelle, 30)')).toBe(true);
		});

		it('should have native imports (required, maxLength) from defaultImportPath', () => {
			const validationModel = gen.validationGenerator?.validationModels.get('AgenceInputDTO');
			expect(validationModel?.nativeValidatorImports).toContain('required');
			expect(validationModel?.nativeValidatorImports).toContain('maxLength');
		});
	});

	describe('AdresseInputDTO schema generation', () => {
		it('should have correct schemaName', () => {
			const validationModel = gen.validationGenerator?.validationModels.get('AdresseInputDTO');
			expect(validationModel?.schemaName).toBe('adresseInputDTOProfileSchema');
		});

		it('should include zipCodeFr validator for codePostal', () => {
			const validationModel = gen.validationGenerator?.validationModels.get('AdresseInputDTO');
			const codePostalValidations = validationModel?.propertyValidations.find((p) => p.name === 'codePostal');
			expect(codePostalValidations?.validations.some((v) => v.validator === 'zipCodeFr')).toBe(true);
			expect(codePostalValidations?.validations.some((v) => v.code === 'zipCodeFr(rootPath.codePostal)')).toBe(true);
		});
	});

	describe('ContactInputDTO schema generation with nested validation', () => {
		it('should have correct schemaName', () => {
			const validationModel = gen.validationGenerator?.validationModels.get('ContactInputDTO');
			expect(validationModel?.schemaName).toBe('contactInputDTOProfileSchema');
		});

		it('should include email validator mapped to advancedEmail', () => {
			const validationModel = gen.validationGenerator?.validationModels.get('ContactInputDTO');
			const emailValidations = validationModel?.propertyValidations.find((p) => p.name === 'email');
			expect(emailValidations?.validations.some((v) => v.validator === 'advancedEmail')).toBe(true);
			expect(emailValidations?.validations.some((v) => v.code === 'advancedEmail(rootPath.email)')).toBe(true);
		});

		it('should include iban and bic validators', () => {
			const validationModel = gen.validationGenerator?.validationModels.get('ContactInputDTO');

			const ibanValidations = validationModel?.propertyValidations.find((p) => p.name === 'iban');
			expect(ibanValidations?.validations.some((v) => v.code === 'iban(rootPath.iban)')).toBe(true);

			const bicValidations = validationModel?.propertyValidations.find((p) => p.name === 'bic');
			expect(bicValidations?.validations.some((v) => v.code === 'bic(rootPath.bic)')).toBe(true);
		});

		it('should have nested validation for adresse with correct schemaName', () => {
			const validationModel = gen.validationGenerator?.validationModels.get('ContactInputDTO');
			const nestedAdresse = validationModel?.nestedValidations.find((n) => n.identifier === 'adresse');
			expect(nestedAdresse).toBeDefined();
			expect(nestedAdresse?.schemaName).toBe('adresseInputDTOProfileSchema');
		});
	});

	describe('Function mode should use p prefix', () => {
		// Create a separate generator with function mode
		const functionModeOptions = {
			...options,
			validation: {
				...options.validation,
				mode: 'function' as const,
			},
		};
		const functionGen = new NgOpenApiGen(spec, functionModeOptions as Options);
		functionGen.generate();

		it('should use p prefix in function mode', () => {
			const validationModel = functionGen.validationGenerator?.validationModels.get('NumeroTelephoneInputDTO');

			const telephoneValidations = validationModel?.propertyValidations.find((p) => p.name === 'telephone');
			expect(telephoneValidations?.validations.some((v) => v.code.includes('p.telephone'))).toBe(true);
			expect(telephoneValidations?.validations.some((v) => v.code.includes('rootPath.telephone'))).toBe(false);
		});

		it('should have functionName in function mode', () => {
			const validationModel = functionGen.validationGenerator?.validationModels.get('NumeroTelephoneInputDTO');
			expect(validationModel?.functionName).toBe('applyNumeroTelephoneInputDTOValidation');
		});
	});

	describe('Schemas helper generation', () => {
		it('should have schemasHelperFile in globals when generateSchemasHelper is true', () => {
			expect(gen.globals.schemasHelperFile).toBe('schemas');
		});

		it('should generate schemasHelper template with correct content', () => {
			const validationModels = gen.validationGenerator?.getValidationModelsArray() ?? [];
			const validationDir = 'validation';
			const importPath = '@angular/forms/signals';

			const ts = gen.templates.apply('schemasHelper', { validationModels, validationDir, importPath });

			// Should import Schema type
			expect(ts).toContain('import type { Schema } from \'@angular/forms/signals\'');

			// Should import types and schemas
			expect(ts).toContain('NumeroTelephoneInputDTO');
			expect(ts).toContain('numeroTelephoneInputDTOProfileSchema');

			// Should export Schemas object
			expect(ts).toContain('export const Schemas');
			expect(ts).toContain('get NumeroTelephoneInputDTO(): Schema<NumeroTelephoneInputDTO>');
		});

		it('should include modelFileName in validation models', () => {
			const validationModel = gen.validationGenerator?.validationModels.get('NumeroTelephoneInputDTO');
			expect(validationModel?.modelFileName).toBe('numero-telephone-input-dto');
		});
	});

	describe('Index template with Schemas export', () => {
		it('should export Schemas in index when schemasHelperFile is set', () => {
			// Mock the model data needed for index template
			const indexModel: Record<string, unknown> = {
				...gen.globals,
				modelIndex: { imports: [] as unknown[] },
				services: [] as unknown[],
				functions: [] as unknown[],
			};

			const ts = gen.templates.apply('index', indexModel);

			// Should export Schemas
			expect(ts).toContain('export { Schemas } from \'./schemas\'');
		});
	});
});
