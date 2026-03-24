import $RefParser from '@apidevtools/json-schema-ref-parser';
import { execSync } from 'child_process';
import eol from 'eol';

// Import centralized OpenAPI types and utilities
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { parseOptions } from './cmd-args';
import { HTTP_METHODS, deleteDirRecursive, methodName, resolveRef, simpleName, syncDirs } from './gen-utils';
import { Globals } from './globals';
import { HandlebarsManager } from './handlebars-manager';
import { Logger } from './logger';
import { Model } from './model';
import { ModelIndex } from './model-index';
import { ArraySchemaObject, MediaTypeObject, OpenAPIObject, OperationObject, PathItemObject, PathsObject, ReferenceObject, SchemaObject } from './openapi-typings';
import { Operation } from './operation';
import { Options } from './options';
import { Service } from './service';
import { Templates } from './templates';
import { ValidationGenerator } from './validation-generator';

/**
 * Main generator class
 */
export class NgOpenApiGen {
	globals: Globals;
	handlebarsManager: HandlebarsManager;
	templates: Templates;
	models = new Map<string, Model>();
	services = new Map<string, Service>();
	operations = new Map<string, Operation>();
	validationGenerator?: ValidationGenerator;
	outDir: string;
	logger: Logger;
	tempDir: string;
	originalPaths?: PathsObject;

	constructor(public openApi: OpenAPIObject, public options: Options, originalPaths?: PathsObject) {
		this.originalPaths = originalPaths;
		this.logger = new Logger(options.silent);
		this.setDefaults();

		// Validate OpenAPI version
		this.validateOpenApiVersion();

		this.outDir = this.options.output || 'src/app/api';
		// Make sure the output path doesn't end with a slash
		if (this.outDir.endsWith('/') || this.outDir.endsWith('\\')) {
			this.outDir = this.outDir.substring(0, this.outDir.length - 1);
		}
		this.tempDir = this.outDir + '$';

		this.initTempDir();
		this.initHandlebars();
		this.readTemplates();
		this.readModels();
		this.readServices();

		// Always remove models that are only used by excluded operations
		// This is different from ignoreUnusedModels which removes ALL unused models
		this.removeExcludedOperationModels();

		// Additionally ignore all unused models if option is enabled
		if (this.options.ignoreUnusedModels !== false) {
			this.ignoreUnusedModels();
		}
	}

	/**
	 * Set the temp dir to a system temporary directory if option useTempDir is set
	 */
	initTempDir(): void {
		if (this.options.useTempDir === true) {
			const systemTempDir = path.join(os.tmpdir(), `ng-openapi-gen-${path.basename(this.outDir)}$`);
			this.tempDir = systemTempDir;
		}
	}

	/**
	 * Actually generates the files
	 */
	generate(): void {
		// Make sure the temporary directory is empty before starting
		deleteDirRecursive(this.tempDir);
		fs.mkdirsSync(this.tempDir);

		try {
			// Generate each model
			const models = [...this.models.values()];
			for (const model of models) {
				this.write('model', model, model.fileName, 'models');
				if (this.options.enumArray && model.enumArrayFileName) {
					this.write('enumArray', model, model.enumArrayFileName, 'models');
				}
			}

			// Generate each service and function
			const generateServices = !!this.options.services;
			const services = [...this.services.values()];
			for (const service of services) {
				if (generateServices) {
					this.write('service', service, service.fileName, 'services');
				}
			}

			// Generate each function
			const allFunctions = services.reduce(
				(acc, service) => [...acc, ...service.operations.reduce((opAcc, operation) => [...opAcc, ...operation.variants], [])],
				[],
			);

			// Remove duplicates
			const functions = allFunctions.filter((fn, index, arr) => arr.findIndex((f) => f.methodName === fn.methodName) === index);

			for (const fn of functions) {
				this.write('fn', fn, fn.importFile, fn.importPath);
			}

			// Context object passed to general templates
			const general = { services, models, functions };

			// Generate the general files
			this.write('configuration', general, this.globals.configurationFile);
			this.write('response', general, this.globals.responseFile);
			this.write('requestBuilder', general, this.globals.requestBuilderFile);
			if (generateServices) {
				this.write('baseService', general, this.globals.baseServiceFile);
			}
			if (this.globals.apiServiceFile) {
				this.write('apiService', general, this.globals.apiServiceFile);
			}
			if (generateServices && this.globals.moduleClass && this.globals.moduleFile) {
				this.write('module', general, this.globals.moduleFile);
			}

			const modelIndex = this.globals.modelIndexFile || this.options.indexFile ? new ModelIndex(models, this.options) : null;
			if (this.globals.modelIndexFile) {
				this.write('modelIndex', { ...general, modelIndex }, this.globals.modelIndexFile);
			}
			if (this.globals.functionIndexFile) {
				this.write('functionIndex', general, this.globals.functionIndexFile);
			}
			if (generateServices && this.globals.serviceIndexFile) {
				this.write('serviceIndex', general, this.globals.serviceIndexFile);
			}
			if (this.options.indexFile) {
				this.write('index', { ...general, modelIndex }, 'index');
			}
			if (this.globals.defaultValueHelperFile) {
				this.write('defaultValueHelper', general, this.globals.defaultValueHelperFile);
			}

			// Generate validation schemas if enabled
			if (this.options.validation?.enabled) {
				this.validationGenerator = new ValidationGenerator(this.openApi, this.options, this.models);
				const validationModels = this.validationGenerator.getValidationModelsArray();
				const validationDir = this.options.validation.outputDir ?? 'validation';
				const validationMode = this.options.validation.mode ?? 'function';
				const templateName = validationMode === 'schema' ? 'schemaValidation' : 'validation';

				// Generate each validation file
				for (const validationModel of validationModels) {
					this.write(templateName, validationModel, validationModel.validationFileName, validationDir);
				}

				// Generate validation index
				if (validationModels.length > 0 && this.globals.validationIndexFile) {
					this.write('validationIndex', { validationModels, validationDir, validationMode }, this.globals.validationIndexFile);
				}

				// Generate schemas helper (like Default for factories)
				if (validationModels.length > 0 && this.globals.schemasHelperFile) {
					const importPath = this.options.validation.defaultImportPath ?? '@angular/forms/signals';
					this.write('schemasHelper', { validationModels, validationDir, importPath }, this.globals.schemasHelperFile);
				}
			}

			// Now synchronize the temp to the output folder
			syncDirs(this.tempDir, this.outDir, this.options.removeStaleFiles !== false, this.logger);

			// Run formatter if configured
			this.runFormatter();

			this.logger.info(`Generation from ${this.options.input} finished with ${models.length} models and ${services.length} services.`);
		} finally {
			// Always remove the temporary directory
			deleteDirRecursive(this.tempDir);
		}
	}

	private write(template: string, model: any, baseName: string, subDir?: string) {
		const ts = this.setEndOfLine(this.templates.apply(template, model));
		const file = path.join(this.tempDir, subDir || '.', `${baseName}.ts`);
		const dir = path.dirname(file);

		fs.ensureDirSync(dir);
		fs.writeFileSync(file, ts, { encoding: 'utf-8' });
	}

	/**
	 * Runs the configured formatter command on the output directory
	 */
	private runFormatter(): void {
		if (!this.options.formatter) {
			return;
		}

		// Replace {{output}} placeholder with the actual output directory
		const command = this.options.formatter.replace(/\{\{output\}\}/g, this.outDir);

		this.logger.info(`Running formatter: ${command}`);
		try {
			execSync(command, {
				stdio: this.options.silent ? 'ignore' : 'inherit',
				cwd: process.cwd(),
			});
			this.logger.info('Formatter completed successfully.');
		} catch (error) {
			this.logger.warn(`Formatter command failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private initHandlebars() {
		this.handlebarsManager = new HandlebarsManager();
		this.handlebarsManager.readCustomJsFile(this.options);
	}

	private readTemplates() {
		const hasLib = __dirname.endsWith(path.sep + 'lib');
		const builtInDir = path.join(__dirname, hasLib ? '../templates' : 'templates');
		const customDir = this.options.templates || '';
		this.globals = new Globals(this.options);
		this.globals.rootUrl = this.readRootUrl();
		this.templates = new Templates(builtInDir, customDir, this.handlebarsManager.instance);
		this.templates.setGlobals(this.globals);
	}

	private readRootUrl() {
		if (!this.openApi.servers || this.openApi.servers.length === 0) {
			return '';
		}
		const server = this.openApi.servers[0];
		let rootUrl = server.url;
		if (rootUrl == null || rootUrl.length === 0) {
			return '';
		}
		const vars = server.variables || {};
		for (const key of Object.keys(vars)) {
			const value = String(vars[key].default);
			rootUrl = rootUrl.replace(`{${key}}`, value);
		}
		return rootUrl;
	}

	private readModels() {
		const schemas = (this.openApi.components || {}).schemas || {};
		for (const name of Object.keys(schemas)) {
			const schema = schemas[name];
			if (!schema) continue;

			// Resolve reference if needed
			let resolvedSchema: SchemaObject;
			if ('$ref' in schema) {
				// It's a ReferenceObject, resolve it
				resolvedSchema = resolveRef(this.openApi, schema.$ref) as SchemaObject;
			} else {
				// It's already a SchemaObject
				resolvedSchema = schema;
			}

			const model = new Model(this.openApi, name, resolvedSchema, this.options);
			this.models.set(name, model);
		}

		// Update imports with hasDefaultFactory info if option is enabled
		if (this.options.generateDefaultFactories) {
			this.updateImportsWithFactoryInfo();
		}
	}

	/**
	 * Updates all model imports to indicate if the referenced model has a default factory
	 */
	private updateImportsWithFactoryInfo() {
		for (const model of this.models.values()) {
			for (const imp of model.imports) {
				// Check if the imported model is an object (has a factory)
				const referencedModel = this.models.get(imp.name);
				if (referencedModel && referencedModel.isObject) {
					imp.hasDefaultFactory = true;
				}
			}
		}
	}

	private readServices() {
		const defaultTag = this.options.defaultTag || 'Api';
		const includeTags = this.options.includeTags || [];
		const excludeTags = this.options.excludeTags || [];

		// First read all operations, as tags are by operation
		const operationsByTag = new Map<string, Operation[]>();
		if (this.openApi.paths) {
			for (const opPath of Object.keys(this.openApi.paths)) {
				const pathSpec = this.openApi.paths[opPath] as PathItemObject;
				if (!pathSpec) continue;
				for (const method of HTTP_METHODS) {
					const methodSpec = (pathSpec as any)[method] as OperationObject;
					if (methodSpec) {
						let id = methodSpec.operationId;
						if (id) {
							// Make sure the id is valid
							id = methodName(id);
						} else {
							// Generate an id
							id = methodName(`${opPath}.${method}`);
							this.logger.warn(`Operation '${opPath}.${method}' didn't specify an 'operationId'. Assuming '${id}'.`);
						}
						if (this.operations.has(id)) {
							// Duplicated id. Add a suffix
							let suffix = 0;
							let newId = id;
							while (this.operations.has(newId)) {
								newId = `${id}_${++suffix}`;
							}
							this.logger.warn(`Duplicate operation id '${id}'. Assuming id ${newId} for operation '${opPath}.${method}'.`);
							id = newId;
						}

						const operation = new Operation(this.openApi, opPath, pathSpec, method, id, methodSpec, this.options);
						// Set a default tag if no tags are found
						if (operation.tags.length === 0) {
							this.logger.warn(`No tags set on operation '${opPath}.${method}'. Assuming '${defaultTag}'.`);
							operation.tags.push(defaultTag);
						}

						// Skip operations that have ANY excluded tag
						if (excludeTags.length > 0 && operation.tags.some((tag) => excludeTags.includes(tag))) {
							this.logger.info(`Ignoring operation '${id}' because it has an excluded tag`);
							continue;
						}

						// Skip operations that don't have ANY included tag (when includeTags is specified)
						if (includeTags.length > 0 && !operation.tags.some((tag) => includeTags.includes(tag))) {
							this.logger.info(`Ignoring operation '${id}' because it has no included tag`);
							continue;
						}

						for (const tag of operation.tags) {
							let operations = operationsByTag.get(tag);
							if (!operations) {
								operations = [];
								operationsByTag.set(tag, operations);
							}
							operations.push(operation);
						}

						// Store the operation
						this.operations.set(id, operation);
					}
				}
			}

			// Then create a service per tag, as long as the tag is included
			const tags = this.openApi.tags || [];
			for (const tagName of operationsByTag.keys()) {
				if (includeTags.length > 0 && !includeTags.includes(tagName)) {
					this.logger.info(`Ignoring tag ${tagName} because it is not listed in the 'includeTags' option`);
					continue;
				}
				if (excludeTags.length > 0 && excludeTags.includes(tagName)) {
					this.logger.info(`Ignoring tag ${tagName} because it is listed in the 'excludeTags' option`);
					continue;
				}
				const operations = operationsByTag.get(tagName) || [];
				const tag = tags.find((t) => t.name === tagName) || { name: tagName };
				const service = new Service(tag, operations, this.options);
				this.services.set(tag.name, service);
			}
		}
	}

	/**
	 * Removes models that are ONLY used by excluded operations.
	 * This always runs, regardless of ignoreUnusedModels option.
	 * Models that are not referenced by any operation (orphan models) are kept.
	 */
	private removeExcludedOperationModels() {
		// Collect all models referenced in the original paths (before any filtering)
		const modelsInPaths = new Set<string>();
		const pathsToScan = this.originalPaths ?? this.openApi.paths;
		if (pathsToScan) {
			for (const pathKey of Object.keys(pathsToScan)) {
				const pathItem = pathsToScan[pathKey];
				if (!pathItem) continue;
				this.collectModelsFromPathItem(pathItem, modelsInPaths);
			}
		}

		// Collect all models used by included services
		const usedByServices = this.collectModelsUsedByServices();

		// Remove models that:
		// 1. Are referenced in some path (not orphan)
		// 2. But are NOT used by any included service (used by excluded operations)
		for (const model of this.models.values()) {
			const isReferencedInPaths = modelsInPaths.has(model.name);
			const isUsedByServices = usedByServices.has(model.name);

			if (isReferencedInPaths && !isUsedByServices) {
				this.logger.debug(`Removing model ${model.name} because it is only used by excluded operations`);
				this.models.delete(model.name);
			}
		}
	}

	/**
	 * Collects all model names referenced in a path item
	 */
	private collectModelsFromPathItem(pathItem: PathItemObject, models: Set<string>) {
		const methods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const;
		for (const method of methods) {
			const operation = (pathItem as any)[method] as OperationObject | undefined;
			if (!operation) continue;

			// Check parameters
			if (operation.parameters) {
				for (const param of operation.parameters) {
					if ('$ref' in param) {
						models.add(simpleName(param.$ref));
					} else if (param.schema) {
						this.collectModelsFromSchema(param.schema, models);
					}
				}
			}

			// Check request body
			if (operation.requestBody) {
				if ('$ref' in operation.requestBody) {
					models.add(simpleName(operation.requestBody.$ref));
				} else if (operation.requestBody.content) {
					for (const content of Object.values(operation.requestBody.content)) {
						if (content.schema) {
							this.collectModelsFromSchema(content.schema, models);
						}
					}
				}
			}

			// Check responses
			if (operation.responses) {
				for (const response of Object.values(operation.responses)) {
					if (!response) continue;
					if ('$ref' in response) {
						models.add(simpleName(response.$ref));
					} else if (response.content) {
						for (const content of Object.values(response.content) as MediaTypeObject[]) {
							if (content.schema) {
								this.collectModelsFromSchema(content.schema, models);
							}
						}
					}
				}
			}
		}
	}

	/**
	 * Recursively collects model names from a schema
	 */
	private collectModelsFromSchema(schema: SchemaObject | ReferenceObject, models: Set<string>) {
		if ('$ref' in schema) {
			const name = simpleName(schema.$ref);
			if (!models.has(name)) {
				models.add(name);
				// Also collect dependencies from the referenced model
				const referencedModel = this.models.get(name);
				if (referencedModel) {
					this.allReferencedNames(referencedModel.schema).forEach((n) => {
						if (!models.has(n)) {
							models.add(n);
							this.collectDependenciesForExcluded(n, models);
						}
					});
				}
			}
			return;
		}

		// Handle array items
		if ('items' in schema && (schema as ArraySchemaObject).items) {
			this.collectModelsFromSchema((schema as ArraySchemaObject).items, models);
		}

		// Handle object properties
		if (schema.properties) {
			for (const prop of Object.values(schema.properties)) {
				this.collectModelsFromSchema(prop, models);
			}
		}

		// Handle allOf, oneOf, anyOf
		for (const key of ['allOf', 'oneOf', 'anyOf'] as const) {
			if (schema[key]) {
				for (const subSchema of schema[key]) {
					this.collectModelsFromSchema(subSchema, models);
				}
			}
		}

		// Handle additionalProperties
		if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
			this.collectModelsFromSchema(schema.additionalProperties, models);
		}
	}

	/**
	 * Collects dependencies for excluded models check
	 */
	private collectDependenciesForExcluded(name: string, models: Set<string>) {
		const model = this.models.get(name);
		if (!model) return;
		this.allReferencedNames(model.schema).forEach((n) => {
			if (!models.has(n)) {
				models.add(n);
				this.collectDependenciesForExcluded(n, models);
			}
		});
	}

	/**
	 * Collects all models used by the current services (with dependencies)
	 */
	private collectModelsUsedByServices(): Set<string> {
		const usedNames = new Set<string>();
		for (const service of this.services.values()) {
			for (const imp of service.imports) {
				if (imp.path.includes('/models/')) {
					usedNames.add(imp.typeName);
				}
			}
			for (const op of service.operations) {
				for (const variant of op.variants) {
					for (const imp of variant.imports) {
						if (imp.path.includes('/models/')) {
							usedNames.add(imp.typeName);
						}
					}
				}
			}
			for (const imp of service.additionalDependencies) {
				usedNames.add(imp);
			}
		}

		// Collect dependencies on models themselves
		const referencedModels = Array.from(usedNames);
		usedNames.clear();
		referencedModels.forEach((name) => this.collectDependencies(name, usedNames));

		return usedNames;
	}

	private ignoreUnusedModels() {
		const usedNames = this.collectModelsUsedByServices();

		// Then delete all unused models
		for (const model of this.models.values()) {
			if (!usedNames.has(model.name)) {
				this.logger.debug(`Ignoring model ${model.name} because it is not used anywhere`);
				this.models.delete(model.name);
			}
		}
	}

	private collectDependencies(name: string, usedNames: Set<string>) {
		const model = this.models.get(name);
		if (!model || usedNames.has(model.name)) {
			return;
		}

		// Add the model name itself
		usedNames.add(model.name);
		// Then find all referenced names and recurse
		this.allReferencedNames(model.schema).forEach((n) => this.collectDependencies(n, usedNames));
	}

	private allReferencedNames(schema: SchemaObject | ReferenceObject | undefined): string[] {
		if (!schema) {
			return [];
		}
		// Type guard for ReferenceObject
		if ('$ref' in schema) {
			return [simpleName(schema.$ref)];
		}
		// Now we know it's a SchemaObject
		const result: string[] = [];
		(schema.allOf || []).forEach((s) => Array.prototype.push.apply(result, this.allReferencedNames(s)));
		(schema.anyOf || []).forEach((s) => Array.prototype.push.apply(result, this.allReferencedNames(s)));
		(schema.oneOf || []).forEach((s) => Array.prototype.push.apply(result, this.allReferencedNames(s)));
		if (schema.properties) {
			for (const prop of Object.keys(schema.properties)) {
				Array.prototype.push.apply(result, this.allReferencedNames(schema.properties[prop]));
			}
		}
		if (typeof schema.additionalProperties === 'object') {
			Array.prototype.push.apply(result, this.allReferencedNames(schema.additionalProperties));
		}
		// Type guard for ArraySchemaObject (has items property)
		if ('type' in schema && schema.type === 'array' && 'items' in schema) {
			Array.prototype.push.apply(result, this.allReferencedNames(schema.items));
		}
		return result;
	}

	private validateOpenApiVersion(): void {
		const version = this.openApi.openapi;
		if (!version) {
			throw new Error('OpenAPI specification version is missing');
		}

		// Check if it's a supported version (3.0.x or 3.1.x)
		const versionRegex = /^3\.(0|1)(\.\d+)?$/;
		if (!versionRegex.test(version)) {
			throw new Error(`Unsupported OpenAPI version: ${version}. Only OpenAPI 3.0.x and 3.1.x are supported.`);
		}

		this.logger.info(`Using OpenAPI specification version: ${version}`);
	}

	private setEndOfLine(text: string): string {
		switch (this.options.endOfLineStyle) {
			case 'cr':
				return eol.cr(text);
			case 'lf':
				return eol.lf(text);
			case 'crlf':
				return eol.crlf(text);
			default:
				return eol.auto(text);
		}
	}

	private setDefaults(): void {
		if (this.options.module === undefined) {
			this.options.module = false;
		} else if (this.options.module === true) {
			this.options.module = 'ApiModule';
		}
		if (!this.options.enumStyle) {
			this.options.enumStyle = 'alias';
		}
		if (this.options.enumStyle === 'alias' && this.options.enumArray == null) {
			this.options.enumArray = true;
		}
	}
}

/**
 * Parses the command-line arguments, reads the configuration file and run the generation
 */
export async function runNgOpenApiGen() {
	const options = parseOptions();
	const refParser = new $RefParser();
	let input = options.input;

	const timeout = options.fetchTimeout == null ? 20000 : options.fetchTimeout;

	try {
		// If input is a URL, try downloading it locally first to avoid URL-based $ref resolution issues
		if (input.startsWith('http://') || input.startsWith('https://')) {
			try {
				const response = await fetch(input);
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}
				const specContent = await response.text();

				// Write to a temporary file
				const tempFile = path.join(os.tmpdir(), `ng-openapi-gen-${Date.now()}.json`);
				await fs.writeFile(tempFile, specContent);
				input = tempFile;

				// Clean up temp file after processing
				process.on('exit', () => {
					try {
						fs.unlinkSync(tempFile);
					} catch {
						// Ignore cleanup errors
					}
				});
			} catch (fetchError) {
				console.warn(`Failed to download spec from URL, will try direct parsing: ${fetchError}`);
				// Fall back to original input
				input = options.input;
			}
		}

		// Parse the OpenAPI specification without dereferencing to preserve $ref properties
		// The generator expects $ref properties to remain intact for proper model generation
		const openApi = (await refParser.parse(input, {
			resolve: {
				http: { timeout },
			},
		})) as OpenAPIObject;

		const { excludeTags = [], excludePaths = [], includeTags = [] } = options;
		const originalPaths = JSON.parse(JSON.stringify(openApi.paths ?? {}));
		openApi.paths = filterPaths(openApi.paths ?? {}, excludeTags, excludePaths, includeTags);

		const gen = new NgOpenApiGen(openApi, options, originalPaths);

		gen.generate();
	} catch (err) {
		console.log(`Error on API generation from ${input}: ${err}`);
		process.exit(1);
	}
}

export function filterPaths(
	paths: PathsObject,
	excludeTags: Options['excludeTags'] = [],
	excludePaths: Options['excludePaths'] = [],
	includeTags: Options['includeTags'] = [],
) {
	paths = JSON.parse(JSON.stringify(paths));
	const filteredPaths: PathsObject = {};

	/**
	 * Check if a path matches any of the exclude patterns
	 * Supports exact match and glob-like patterns with * wildcard
	 */
	const isPathExcluded = (pathKey: string): boolean => {
		if (!excludePaths || excludePaths.length === 0) return false;
		return excludePaths.some((pattern) => {
			if (pattern.includes('*')) {
				// Convert glob pattern to regex: /admin/* -> ^/admin/.*$
				const regexPattern = pattern
					.replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars except *
					.replace(/\*/g, '.*'); // Convert * to .*
				return new RegExp(`^${regexPattern}$`).test(pathKey);
			}
			return pattern === pathKey;
		});
	};

	for (const key in paths) {
		if (!paths.hasOwnProperty(key)) continue;

		if (isPathExcluded(key)) {
			console.log(`Path ${key} is excluded by excludePaths`);
			continue;
		}

		const pathItem = paths[key];
		if (!pathItem) continue;

		let shouldRemovePath = false;
		const httpMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const;

		for (const method of httpMethods) {
			const operation = pathItem[method];
			if (!operation) continue;

			const tags: string[] = operation.tags || [];
			// if tag on method in includeTags then continue
			if (tags.some((tag) => includeTags.includes(tag))) {
				continue;
			}
			// if tag on method in excludeTags then remove the method
			if (tags.some((tag) => excludeTags.includes(tag)) || !!includeTags?.length) {
				console.log(`Path ${key} is excluded by excludeTags`);
				delete (pathItem as any)[method];

				// if path has no method left then "should remove"
				const remainingMethods = httpMethods.filter((m) => pathItem[m]);
				if (remainingMethods.length === 0) {
					shouldRemovePath = true;
					break;
				}
			}
		}
		if (shouldRemovePath) {
			continue;
		}
		filteredPaths[key] = pathItem;
	}
	return filteredPaths;
}
