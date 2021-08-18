const rollupTypescript = require('@rollup/plugin-typescript');
const { RollupOptions } = require('rollup');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const pkg = require('./package.json');
const replace = require('@rollup/plugin-replace');

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
			sourcemap: true
		}
	],
	plugins: [
		nodeResolve({
			browser: true
		}),
		rollupTypescript(),
		commonjs(),
		replace({
			// @vue/reactivity doesn't work when run in production mode.
			// Haven't looked into why yet, so until then we run in non-prod-mode
			'process.env.NODE_ENV': JSON.stringify('unknown'),
			preventAssignment: true
		})
	]
};
