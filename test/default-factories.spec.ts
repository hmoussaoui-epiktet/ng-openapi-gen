import { NgOpenApiGen } from '../lib/ng-openapi-gen';
import { OpenAPIObject } from '../lib/openapi-typings';
import { Options } from '../lib/options';
import options from './default-factories.config.json';
import defaultFactoriesSpec from './default-factories.json';

const spec = defaultFactoriesSpec as unknown as OpenAPIObject;

const gen = new NgOpenApiGen(spec, options as Options);
gen.generate();

describe('Generation tests using default-factories.json', () => {
	it('User model with default factory', () => {
		const user = gen.models.get('User');
		expect(user).toBeDefined();
		if (user) {
			const ts = gen.templates.apply('model', user);
			expect(ts).toContain('export function userDefault(): User {');
			expect(ts).toContain('id: NaN');
			expect(ts).toContain('name: \'\'');
			expect(ts).toContain('email: \'\'');
			expect(ts).toContain('age: NaN');
			expect(ts).toContain('isActive: false');
			expect(ts).toContain('tags: []');
			expect(ts).toContain('metadata: {}');
		}
	});

	it('Product model with nested reference', () => {
		const product = gen.models.get('Product');
		expect(product).toBeDefined();
		if (product) {
			const ts = gen.templates.apply('model', product);
			expect(ts).toContain('export function productDefault(): Product {');
			expect(ts).toContain('sku: \'\'');
			expect(ts).toContain('price: NaN');
			expect(ts).toContain('inStock: false');
			expect(ts).toContain('category: categoryDefault()');
		}
	});

	it('Category model', () => {
		const category = gen.models.get('Category');
		expect(category).toBeDefined();
		if (category) {
			const ts = gen.templates.apply('model', category);
			expect(ts).toContain('export function categoryDefault(): Category {');
			expect(ts).toContain('id: NaN');
			expect(ts).toContain('name: \'\'');
		}
	});

	it('Status enum should not have default factory', () => {
		const status = gen.models.get('Status');
		expect(status).toBeDefined();
		if (status) {
			const ts = gen.templates.apply('model', status);
			// Enums should not have default factories
			expect(ts).not.toContain('Default()');
		}
	});

	it('NullableField model with nullable property', () => {
		const nullableField = gen.models.get('NullableField');
		expect(nullableField).toBeDefined();
		if (nullableField) {
			const ts = gen.templates.apply('model', nullableField);
			expect(ts).toContain('export function nullableFieldDefault(): NullableField {');
			expect(ts).toContain('value: null');
		}
	});

	it('defaultValue helper should be generated', () => {
		const models = [...gen.models.values()];
		const ts = gen.templates.apply('defaultValueHelper', { models });
		expect(ts).toContain('export const Default = {');
		expect(ts).toContain('get User(): User {');
		expect(ts).toContain('return userDefault();');
		expect(ts).toContain('get Product(): Product {');
		expect(ts).toContain('get Category(): Category {');
		// Enums should not be in the proxy
		expect(ts).not.toContain('get Status()');
	});
});
