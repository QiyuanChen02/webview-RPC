import path from "node:path";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";

function makeExternal(id) {
	if (id.startsWith("node:")) return true;
	return !id.startsWith(".") && !path.isAbsolute(id);
}

const input = "./src/index.ts";

const code = {
	input,
	external: makeExternal,
	output: [
		{ file: "dist/index.js", format: "esm", sourcemap: true },
		{
			file: "dist/index.cjs",
			format: "cjs",
			exports: "named",
			sourcemap: true,
		},
	],
	plugins: [
		resolve({ preferBuiltins: true }),
		commonjs(),
		typescript({ tsconfig: "tsconfig.json" }),
	],
};

const types = {
	input,
	output: [{ file: "dist/index.d.ts", format: "esm" }],
	plugins: [dts()],
};

export default [code, types];
