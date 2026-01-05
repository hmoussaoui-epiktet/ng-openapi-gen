import { GenType } from './gen-type';
import { fileName, namespace, serviceClass, tsComments, typeName } from './gen-utils';
import { TagObject } from './openapi-typings';
import { Operation } from './operation';
import { Options } from './options';

/**
 * Context to generate a service
 */
export class Service extends GenType {
	constructor(tag: TagObject, public operations: Operation[], options: Options) {
		super(tag.name, serviceClass, options);

		// Generate the correct fileName without the "Api" prefix
		// We want the class name to be "XxxApiService" but the file to be "xxx.service.ts"
		const baseFileName = fileName(typeName(tag.name, options));
		const ns = namespace(tag.name);

		// Add .service suffix to the file name
		const fileNameWithService = baseFileName.endsWith('-service')
			? baseFileName.substring(0, baseFileName.length - '-service'.length) + '.service'
			: baseFileName + '.service';

		if (ns) {
			this.fileName = ns + '/' + fileNameWithService;
		} else {
			this.fileName = fileNameWithService;
		}

		this.tsComments = tsComments(tag.description || '', 0);

		// Collect the imports
		for (const operation of operations) {
			operation.variants.forEach((variant) => {
				// Import the variant fn
				this.addImport(variant);
				// Import the variant parameters
				this.addImport(variant.paramsImport);
				// Import the variant result type
				this.collectImports(variant.successResponse?.spec?.schema);
				// Add the request body additional dependencies
				this.collectImports(variant.requestBody?.spec?.schema, true);
			});

			// Add the parameters as additional dependencies
			for (const parameter of operation.parameters) {
				this.collectImports(parameter.spec.schema, true);
			}

			// Add the responses imports as additional dependencies
			for (const resp of operation.allResponses) {
				for (const content of resp.content ?? []) {
					this.collectImports(content.spec?.schema, true);
				}
			}

			// Security schemes don't have schemas to import in newer OpenAPI versions
			// for (const securityGroup of operation.security) {
			//   securityGroup.forEach(security => this.collectImports(security.spec.schema));
			// }
		}
		this.updateImports();
	}

	protected skipImport(): boolean {
		return false;
	}

	protected initPathToRoot(): string {
		return '../';
	}
}
