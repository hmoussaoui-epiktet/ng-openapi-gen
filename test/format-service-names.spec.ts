import { NgOpenApiGen } from '../lib/ng-openapi-gen';
import { OpenAPIObject } from '../lib/openapi-typings';
import { Options } from '../lib/options';
import options from './format-service-names.config.json';
import formatServiceNamesSpec from './format-service-names.json';

const spec = formatServiceNamesSpec as unknown as OpenAPIObject;

const gen = new NgOpenApiGen(spec, options as Options);
gen.generate();

describe('Generation tests using format-service-names.json', () => {
	it('Users service should be formatted as UsersApiService', () => {
		const usersService = gen.services.get('Users');
		expect(usersService).toBeDefined();
		if (usersService) {
			expect(usersService.typeName).toBe('UsersApiService');
			const ts = gen.templates.apply('service', usersService);
			expect(ts).toContain('export class UsersApiService extends');
		}
	});

	it('Products service should be formatted as ProductsApiService', () => {
		const productsService = gen.services.get('Products');
		expect(productsService).toBeDefined();
		if (productsService) {
			expect(productsService.typeName).toBe('ProductsApiService');
			const ts = gen.templates.apply('service', productsService);
			expect(ts).toContain('export class ProductsApiService extends');
		}
	});

	it('Test$Params service should have $ removed but keep Service suffix', () => {
		const testParamsService = gen.services.get('Test$Params');
		expect(testParamsService).toBeDefined();
		if (testParamsService) {
			expect(testParamsService.typeName).toBe('TestParamsService');
			const ts = gen.templates.apply('service', testParamsService);
			expect(ts).toContain('export class TestParamsService extends');
			// Should NOT be ApiService for $Params case
			expect(ts).not.toContain('ApiService');
		}
	});
});
