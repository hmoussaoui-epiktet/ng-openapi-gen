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
			expect(ts).toContain('id: null');
			expect(ts).toContain('name: null');
			expect(ts).toContain('email: null');
			expect(ts).toContain('age: null');
			expect(ts).toContain('isActive: null');
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
			expect(ts).toContain('sku: null');
			expect(ts).toContain('price: null');
			expect(ts).toContain('inStock: null');
			expect(ts).toContain('category: categoryDefault()');
		}
	});

	it('Category model', () => {
		const category = gen.models.get('Category');
		expect(category).toBeDefined();
		if (category) {
			const ts = gen.templates.apply('model', category);
			expect(ts).toContain('export function categoryDefault(): Category {');
			expect(ts).toContain('id: null');
			expect(ts).toContain('name: null');
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
});
