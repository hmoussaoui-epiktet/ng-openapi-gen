import fs from 'fs';
import * as Handlebars from 'handlebars';
import { Options } from './options';

/**
 * Handlebars manager
 */
export class HandlebarsManager {
	public instance: typeof Handlebars = Handlebars;

	constructor() {
		// Register built-in helpers
		this.registerBuiltInHelpers();
	}

	private registerBuiltInHelpers(): void {
		// Helper for comparing values
		this.instance.registerHelper('ifEquals', function (this: unknown, arg1: unknown, arg2: unknown, options: Handlebars.HelperOptions) {
			return arg1 === arg2 ? options.fn(this) : options.inverse(this);
		});
	}

	public readCustomJsFile(options: Options): void {
		const customDir = options.templates || '';

		// Attempt to find "handlebars.js" in template folder to allow for custom
		// Handlebars settings (ex: adding helpers)
		const handlerbarsJsFile = customDir ? `${customDir}/handlebars.js` : null;
		if (handlerbarsJsFile && fs.existsSync(handlerbarsJsFile)) {
			// Attempt to import the "handlebars.js" file if it exists
			const handlebarsFn = require(fs.realpathSync(handlerbarsJsFile));
			if (handlebarsFn && typeof handlebarsFn === 'function') {
				// call imported method and pass the Handlebars instance to allow for helpers to be registered
				handlebarsFn.call(this.instance, this.instance);
			}
		}
	}
}
