import { NgOpenApiGen } from '../lib/ng-openapi-gen';
import { OpenAPIObject } from '../lib/openapi-typings';
import { Options } from '../lib/options';
import options from './validation-schemas.config.json';
import validationSpec from './validation-schemas.json';

const spec = validationSpec as unknown as OpenAPIObject;

const gen = new NgOpenApiGen(spec, options as Options);
gen.generate();

describe('Generation tests using validation-schemas.json', () => {
	it('CandidatCoordonneesInputDTO should have validation function', () => {
		const model = gen.models.get('CandidatCoordonneesInputDTO');
		expect(model).toBeDefined();
		expect(model?.isObject).toBe(true);

		const validationModel = gen.validationGenerator?.validationModels.get('CandidatCoordonneesInputDTO');
		expect(validationModel).toBeDefined();
		expect(validationModel?.functionName).toBe('applyCandidatCoordonneesInputDTOValidation');
	});

	it('CandidatCoordonneesInputDTO validation should include required validators', () => {
		const validationModel = gen.validationGenerator?.validationModels.get('CandidatCoordonneesInputDTO');
		expect(validationModel).toBeDefined();

		const propNames = validationModel?.propertyValidations.map((p) => p.name);
		expect(propNames).toContain('nomNaissance');
		expect(propNames).toContain('prenom');
		expect(propNames).toContain('eMail');
		expect(propNames).toContain('telephone');
	});

	it('CandidatCoordonneesInputDTO validation should include maxLength validators', () => {
		const validationModel = gen.validationGenerator?.validationModels.get('CandidatCoordonneesInputDTO');
		expect(validationModel).toBeDefined();

		const nomNaissanceValidations = validationModel?.propertyValidations.find((p) => p.name === 'nomNaissance');
		expect(nomNaissanceValidations).toBeDefined();
		expect(nomNaissanceValidations?.validations.some((v) => v.code.includes('maxLength'))).toBe(true);
		expect(nomNaissanceValidations?.validations.some((v) => v.code.includes('30'))).toBe(true);
	});

	it('CandidatCoordonneesInputDTO validation should include email validator', () => {
		const validationModel = gen.validationGenerator?.validationModels.get('CandidatCoordonneesInputDTO');
		expect(validationModel).toBeDefined();

		const emailValidations = validationModel?.propertyValidations.find((p) => p.name === 'eMail');
		expect(emailValidations).toBeDefined();
		expect(emailValidations?.validations.some((v) => v.validator === 'email')).toBe(true);
	});

	it('CandidatCoordonneesInputDTO validation should include pattern validator for telephone', () => {
		const validationModel = gen.validationGenerator?.validationModels.get('CandidatCoordonneesInputDTO');
		expect(validationModel).toBeDefined();

		const telephoneValidations = validationModel?.propertyValidations.find((p) => p.name === 'telephone');
		expect(telephoneValidations).toBeDefined();
		expect(telephoneValidations?.validations.some((v) => v.validator === 'pattern')).toBe(true);
	});

	it('CandidatCoordonneesInputDTO validation should include custom date validator', () => {
		const validationModel = gen.validationGenerator?.validationModels.get('CandidatCoordonneesInputDTO');
		expect(validationModel).toBeDefined();

		const dateNaissanceValidations = validationModel?.propertyValidations.find((p) => p.name === 'dateNaissance');
		expect(dateNaissanceValidations).toBeDefined();
		expect(dateNaissanceValidations?.validations.some((v) => v.validator === 'date')).toBe(true);
	});

	it('CandidatInputDTO should have nested validation for coordonnees', () => {
		const validationModel = gen.validationGenerator?.validationModels.get('CandidatInputDTO');
		expect(validationModel).toBeDefined();

		const nestedNames = validationModel?.nestedValidations.map((n) => n.identifier);
		expect(nestedNames).toContain('coordonnees');
	});

	it('UserWithConstraints should have min/max validators', () => {
		const validationModel = gen.validationGenerator?.validationModels.get('UserWithConstraints');
		expect(validationModel).toBeDefined();

		const ageValidations = validationModel?.propertyValidations.find((p) => p.name === 'age');
		expect(ageValidations).toBeDefined();
		expect(ageValidations?.validations.some((v) => v.validator === 'min')).toBe(true);
		expect(ageValidations?.validations.some((v) => v.validator === 'max')).toBe(true);
	});

	it('SimpleEnum should not have validation (not an object)', () => {
		const validationModel = gen.validationGenerator?.validationModels.get('SimpleEnum');
		expect(validationModel).toBeUndefined();
	});

	it('Generated validation file should have correct imports', () => {
		const validationModel = gen.validationGenerator?.validationModels.get('CandidatCoordonneesInputDTO');
		expect(validationModel).toBeDefined();

		// Native imports
		expect(validationModel?.nativeValidatorImports).toContain('required');
		expect(validationModel?.nativeValidatorImports).toContain('maxLength');
		expect(validationModel?.nativeValidatorImports).toContain('email');
		expect(validationModel?.nativeValidatorImports).toContain('pattern');

		// Custom imports
		expect(validationModel?.customValidatorImports.some((i) => i.name === 'date')).toBe(true);
	});

	it('Generated validation template should produce valid TypeScript', () => {
		const validationModel = gen.validationGenerator?.validationModels.get('CandidatCoordonneesInputDTO');
		expect(validationModel).toBeDefined();

		if (validationModel) {
			const ts = gen.templates.apply('validation', validationModel);
			expect(ts).toContain('export function applyCandidatCoordonneesInputDTOValidation');
			expect(ts).toContain('SchemaPath<T>');
			expect(ts).toContain('nested = true');
			expect(ts).toContain('import { date } from \'@common\'');
			expect(ts).toContain('from \'@angular/forms/signals\'');
		}
	});
});
