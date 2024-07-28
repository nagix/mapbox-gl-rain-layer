import fs from 'fs';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import strip from '@rollup/plugin-strip';

const pkg = JSON.parse(fs.readFileSync('package.json'));
const banner = `/*!
 * mapbox-gl-rain-layer v${pkg.version}
 * ${pkg.homepage}
 * (c) 2021-${new Date().getFullYear()} ${pkg.author}
 * Released under the ${pkg.license} license
 */`;

export default [{
	input: 'src/index.js',
	output: {
		name: 'RainLayer',
		file: `dist/${pkg.name}.js`,
		format: 'umd',
		indent: false,
		sourcemap: true,
		banner,
		globals: {
			'mapbox-gl': 'mapboxgl'
		}
	},
	external: ['mapbox-gl'],
	plugins: [
		resolve({
			browser: true,
			preferBuiltins: false
		}),
		commonjs(),
		json()
	]
}, {
	input: 'src/index.js',
	output: {
		name: 'RainLayer',
		file: `dist/${pkg.name}.min.js`,
		format: 'umd',
		indent: false,
		sourcemap: true,
		banner,
		globals: {
			'mapbox-gl': 'mapboxgl'
		}
	},
	external: ['mapbox-gl'],
	plugins: [
		resolve({
			browser: true,
			preferBuiltins: false
		}),
		commonjs(),
		json(),
		terser({
			compress: {
				pure_getters: true
			}
		}),
		strip({
			sourceMap: true
		})
	]
}, {
	input: 'src/index.js',
	output: {
		file: pkg.module,
		format: 'esm',
		indent: false,
		banner
	},
	external: ['mapbox-gl'],
	plugins: [
		resolve({
			browser: true,
			preferBuiltins: false
		}),
		commonjs(),
		json()
	]
}];
