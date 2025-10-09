import { createRequire } from "node:module";
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

const require = createRequire(import.meta.url);
const pkg = require("./package.json");

/**
 * Treat your deps as external so consumers de-duplicate and Node builtins aren’t bundled.
 */
const external = [
	...Object.keys(pkg.dependencies || {}),
	...Object.keys(pkg.peerDependencies || {}),
	/^node:/,
];

export default {
	input: "src/index.ts",
	external,
	plugins: [
		nodeResolve({ preferBuiltins: true }),
		commonjs(),
		typescript({ tsconfig: "./tsconfig.json" }),
	],
	output: [
		{
			file: "dist/index.cjs",
			format: "cjs",
			sourcemap: true,
		},
		{
			file: "dist/index.mjs",
			format: "esm",
			sourcemap: true,
		},
	],
};
