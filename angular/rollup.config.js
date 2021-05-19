const rollupTypescript = require('@rollup/plugin-typescript');
const { RollupOptions } = require('rollup');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');

/** @type {RollupOptions} */
export default {
	input: 'src/index.ts',
	output: [
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
