import { NgOpenApiGen } from '../lib/ng-openapi-gen';
import { OpenAPIObject } from '../lib/openapi-typings';
import { Options } from '../lib/options';
import options from './format-type-names.config.json';
import formatTypeNamesSpec from './format-type-names.json';

const spec = formatTypeNamesSpec as unknown as OpenAPIObject;

const gen = new NgOpenApiGen(spec, options as Options);
gen.generate();

describe('Generation tests using format-type-names.json', () => {
	it('UserDto should be formatted as UserDTO', () => {
		const userDto = gen.models.get('UserDto');
		expect(userDto).toBeDefined();
		if (userDto) {
			expect(userDto.typeName).toBe('UserDTO');
			const ts = gen.templates.apply('model', userDto);
			expect(ts).toContain('export interface UserDTO {');
		}
	});

	it('ProductInfoDto should be formatted as ProductInfoDTO', () => {
		const productInfoDto = gen.models.get('ProductInfoDto');
		expect(productInfoDto).toBeDefined();
		if (productInfoDto) {
			expect(productInfoDto.typeName).toBe('ProductInfoDTO');
			const ts = gen.templates.apply('model', productInfoDto);
			expect(ts).toContain('export interface ProductInfoDTO {');
		}
	});

	it('$SpecialModel should have $ removed', () => {
		const specialModel = gen.models.get('$SpecialModel');
		expect(specialModel).toBeDefined();
		if (specialModel) {
			expect(specialModel.typeName).toBe('SpecialModel');
			const ts = gen.templates.apply('model', specialModel);
			expect(ts).toContain('export interface SpecialModel {');
		}
	});

	it('Test$Params should keep Dto unchanged but remove $', () => {
		const testParams = gen.models.get('Test$Params');
		expect(testParams).toBeDefined();
		if (testParams) {
			expect(testParams.typeName).toBe('TestParams');
			const ts = gen.templates.apply('model', testParams);
			expect(ts).toContain('export interface TestParams {');
			// Should contain 'paramDto' unchanged in property
			expect(ts).toContain('param');
		}
	});
});
