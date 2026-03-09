import { Model } from './model';
import { OpenAPIObject } from './openapi-typings';
import { Options } from './options';
import { shouldGenerateValidation, ValidationModel } from './validation-model';

/**
 * Generator for validation schemas
 */
export class ValidationGenerator {
	validationModels: Map<string, ValidationModel> = new Map();
	private modelsWithValidation: Set<string> = new Set();

	constructor(
		public openApi: OpenAPIObject,
		public options: Options,
		public models: Map<string, Model>,
	) {
		this.collectModelsWithValidation();
		this.buildValidationModels();
	}

	/**
	 * First pass: determine which models will have validation
	 */
	private collectModelsWithValidation(): void {
		for (const [name, model] of this.models) {
			if (shouldGenerateValidation(model, this.options)) {
				this.modelsWithValidation.add(name);
			}
		}
	}

	/**
	 * Second pass: build validation models with nested references
	 */
	private buildValidationModels(): void {
		for (const [name, model] of this.models) {
			if (this.modelsWithValidation.has(name)) {
				const validationModel = new ValidationModel(model, this.openApi, this.options, this.models, this.modelsWithValidation);
				if (validationModel.hasValidations) {
					this.validationModels.set(name, validationModel);
				}
			}
		}
	}

	/**
	 * Get all validation models as an array for template rendering
	 */
	getValidationModelsArray(): ValidationModel[] {
		return [...this.validationModels.values()];
	}
}
