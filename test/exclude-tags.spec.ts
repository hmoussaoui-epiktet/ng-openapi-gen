import { NgOpenApiGen } from '../lib/ng-openapi-gen';
import { OpenAPIObject } from '../lib/openapi-typings';
import { Options } from '../lib/options';
import options from './exclude-tags.config.json';
import excludeTagsSpec from './exclude-tags.json';

const spec = excludeTagsSpec as unknown as OpenAPIObject;

describe('Exclude tags - operations, functions and models', () => {
	let gen: NgOpenApiGen;

	beforeEach(() => {
		gen = new NgOpenApiGen(spec, options as Options);
		gen.generate();
	});

	describe('Services', () => {
		it('should have Users and Public services', () => {
			expect(gen.services.has('Users')).toBe(true);
			expect(gen.services.has('Public')).toBe(true);
		});

		it('should NOT have Admin service', () => {
			expect(gen.services.has('Admin')).toBe(false);
		});

		it('should have correct number of services (2)', () => {
			expect(gen.services.size).toBe(2);
		});
	});

	describe('Operations', () => {
		it('should have Users operations', () => {
			expect(gen.operations.has('getUsers')).toBe(true);
			expect(gen.operations.has('getUserById')).toBe(true);
		});

		it('should have Public operations', () => {
			expect(gen.operations.has('getPublicInfo')).toBe(true);
		});

		it('should NOT have Admin operations', () => {
			expect(gen.operations.has('getAdminSettings')).toBe(false);
			expect(gen.operations.has('updateAdminSettings')).toBe(false);
			expect(gen.operations.has('getAdminUsers')).toBe(false);
		});

		it('should have correct number of operations (3)', () => {
			// getUsers, getUserById, getPublicInfo
			expect(gen.operations.size).toBe(3);
		});
	});

	describe('Models - with ignoreUnusedModels: false', () => {
		it('should have models used by included tags', () => {
			expect(gen.models.has('User')).toBe(true);
			expect(gen.models.has('UserDetails')).toBe(true);
			expect(gen.models.has('PublicInfo')).toBe(true);
		});

		it('should NOT have models ONLY used by excluded Admin tag', () => {
			// These models are only referenced by Admin operations
			expect(gen.models.has('AdminSettings')).toBe(false);
			expect(gen.models.has('AdminSettingsUpdate')).toBe(false);
			expect(gen.models.has('AdminConfig')).toBe(false);
			expect(gen.models.has('AdminUserView')).toBe(false);
		});

		it('should have SharedModel since ignoreUnusedModels is false', () => {
			// SharedModel is not used by any operation but ignoreUnusedModels is false
			expect(gen.models.has('SharedModel')).toBe(true);
		});
	});

	describe('Generated functions', () => {
		it('should generate functions only for included operations', () => {
			const services = [...gen.services.values()];
			const allFunctions = services.reduce(
				(acc, service) => [...acc, ...service.operations.reduce((opAcc, operation) => [...opAcc, ...operation.variants], [])],
				[] as any[],
			);

			const functionNames = allFunctions.map((fn) => fn.methodName);

			// Should have Users and Public functions
			expect(functionNames.some((name) => name.includes('getUsers'))).toBe(true);
			expect(functionNames.some((name) => name.includes('getUserById'))).toBe(true);
			expect(functionNames.some((name) => name.includes('getPublicInfo'))).toBe(true);

			// Should NOT have Admin functions
			expect(functionNames.some((name) => name.includes('getAdminSettings'))).toBe(false);
			expect(functionNames.some((name) => name.includes('updateAdminSettings'))).toBe(false);
			expect(functionNames.some((name) => name.includes('getAdminUsers'))).toBe(false);
		});
	});
});

describe('Exclude tags with ignoreUnusedModels: true', () => {
	let gen: NgOpenApiGen;

	beforeEach(() => {
		const optionsWithIgnore: Options = {
			...(options as Options),
			ignoreUnusedModels: true,
		};
		gen = new NgOpenApiGen(spec, optionsWithIgnore);
		gen.generate();
	});

	it('should NOT have SharedModel when ignoreUnusedModels is true', () => {
		expect(gen.models.has('SharedModel')).toBe(false);
	});

	it('should still NOT have Admin-only models', () => {
		expect(gen.models.has('AdminSettings')).toBe(false);
		expect(gen.models.has('AdminSettingsUpdate')).toBe(false);
		expect(gen.models.has('AdminConfig')).toBe(false);
		expect(gen.models.has('AdminUserView')).toBe(false);
	});

	it('should have models used by included operations', () => {
		expect(gen.models.has('User')).toBe(true);
		expect(gen.models.has('UserDetails')).toBe(true);
		expect(gen.models.has('PublicInfo')).toBe(true);
	});
});
