const rollupTypescript = require('@rollup/plugin-typescript');
const { RollupOptions } = require('rollup');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const pkg = require('./package.json');
const { terser } = require('rollup-plugin-terser');
const replace = require('@rollup/plugin-replace');

/** @type {RollupOptions} */
export default {
	input: 'src/index.ts',
	output: [
		{
			format: 'umd',
			exports: 'named',
			name: 'diffx',
			file: 'dist/diffx.umd.min.js',
			plugins: [terser()]
		},
		{
			format: 'umd',
			exports: 'named',
			name: 'diffx',
			file: 'dist/diffx.umd.js',
		}
	],
	plugins: [
		nodeResolve({
			browser: true
		}),
		rollupTypescript({ tsconfig: 'tsconfig.standalone.json' }),
		commonjs(),
		replace({
			// @vue/reactivity doesn't work when run in production mode.
			// Haven't looked into why yet, so until then we run in non-prod-mode
			'process.env.NODE_ENV': JSON.stringify('unknown'),
			preventAssignment: true
		})
	]
};
