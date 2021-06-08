const rollupTypescript = require('@rollup/plugin-typescript');
const { RollupOptions } = require('rollup');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const pkg = require('./package.json');

/** @type {RollupOptions} */
export default {
	input: 'src/index.ts',
	external: [
		...Object.keys(pkg.dependencies || {}),
		...Object.keys(pkg.peerDependencies || {}),
	],
	output: [
		{
			dir: 'dist',
			format: 'es',
			exports: 'named',
			sourcemap: false
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
