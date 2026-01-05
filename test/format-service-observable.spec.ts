import { NgOpenApiGen } from '../lib/ng-openapi-gen';
import { OpenAPIObject } from '../lib/openapi-typings';
import { Options } from '../lib/options';
import formatServiceNamesSpec from './format-service-names.json';
import options from './format-service-observable.config.json';

const spec = formatServiceNamesSpec as unknown as OpenAPIObject;

const gen = new NgOpenApiGen(spec, options as Options);
gen.generate();

describe('Generation tests with Observable services', () => {
	it('Should generate Observable-based service methods', () => {
		const usersService = gen.services.get('Users');
		expect(usersService).toBeDefined();
		if (usersService) {
			const ts = gen.templates.apply('service', usersService);
			expect(ts).toContain('import { Observable } from \'rxjs\'');
			expect(ts).toContain('import { map } from \'rxjs/operators\'');
			expect(ts).toContain('private getUsers$Response(params?: GetUsersParams, context?: HttpContext): Observable<');
			expect(ts).toContain('public getUsers(params?: GetUsersParams, context?: HttpContext): Observable<');
			expect(ts).toContain('.pipe(');
			expect(ts).toContain('map((r: StrictHttpResponse<');
			expect(ts).not.toContain('firstValueFrom');
			expect(ts).not.toContain('Promise<');
		}
	});
});
