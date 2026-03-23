import fs from 'fs-extra';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NgOpenApiGen } from '../lib/ng-openapi-gen';
import { OpenAPIObject } from '../lib/openapi-typings';
import { Options } from '../lib/options';
import formatterSpec from './formatter.json';

const spec = formatterSpec as unknown as OpenAPIObject;

describe('Formatter option', () => {
	const testOutput = path.join(__dirname, 'out', 'formatter-test');

	beforeEach(() => {
		fs.removeSync(testOutput);
	});

	afterEach(() => {
		fs.removeSync(testOutput);
	});

	it('should not fail when formatter is not configured', () => {
		const options: Options = {
			input: 'test.json',
			output: testOutput,
			silent: true,
		};

		const gen = new NgOpenApiGen(spec, options);
		expect(() => gen.generate()).not.toThrow();
		expect(fs.existsSync(testOutput)).toBe(true);
	});

	it('should execute formatter command after generation', () => {
		// Use touch command to create a marker file proving the formatter ran
		const markerFile = path.join(testOutput, '.formatter-ran');
		const options: Options = {
			input: 'test.json',
			output: testOutput,
			silent: true,
			formatter: `touch ${markerFile}`,
		};

		const gen = new NgOpenApiGen(spec, options);
		gen.generate();

		// Verify the formatter command was executed
		expect(fs.existsSync(markerFile)).toBe(true);
	});

	it('should replace {{output}} placeholder with output directory', () => {
		// Create a marker file inside the output directory using the placeholder
		const options: Options = {
			input: 'test.json',
			output: testOutput,
			silent: true,
			formatter: 'touch "{{output}}/.formatter-placeholder-test"',
		};

		const gen = new NgOpenApiGen(spec, options);
		gen.generate();

		// Verify the placeholder was correctly replaced
		expect(fs.existsSync(path.join(testOutput, '.formatter-placeholder-test'))).toBe(true);
	});

	it('should continue generation even if formatter fails', () => {
		const options: Options = {
			input: 'test.json',
			output: testOutput,
			silent: true,
			formatter: 'nonexistent-formatter-command-that-does-not-exist',
		};

		const gen = new NgOpenApiGen(spec, options);

		// Should not throw
		expect(() => gen.generate()).not.toThrow();

		// Files should still be generated
		expect(fs.existsSync(testOutput)).toBe(true);
	});
});
