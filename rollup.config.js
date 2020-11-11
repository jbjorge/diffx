const rollupTypescript = require('@rollup/plugin-typescript');
const { RollupOptions } = require('rollup');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');

/** @type {RollupOptions} */
export default {
	input: 'index.ts',
	output: [
		// {
		// 	dir: 'dist',
		// 	format: 'cjs',
		// 	exports: 'named',
		// 	sourcemap: true
		// }, {
		{
			dir: 'dist',
			format: 'es',
			exports: 'named',
			sourcemap: true
		}
	],
	plugins: [
		nodeResolve({
			browser: true
		}),
		rollupTypescript(),
		commonjs()
	]
};
