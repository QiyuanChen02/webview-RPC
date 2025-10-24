import type { Procedure, ResolverOpts, RouterDef } from "@webview-rpc/shared";
import z from "zod";

/**
 * Builder to create a Procedure definition with fluent .input() and
 * .resolve() helpers. This is only a compile-time helper - the builder
 * returns a plain Procedure object used at runtime.
 */
class ProcedureBuilder<I = undefined, O = unknown> {
	private schema: z.ZodType;

	_input!: I;
	_output!: O;

	constructor(schema: z.ZodType = z.void()) {
		this.schema = schema;
	}

	/**
	 * Set the input Zod schema for the procedure. Returns a new builder
	 * typed with the inferred input type.
	 */
	input<S extends z.ZodType>(schema: S) {
		return new ProcedureBuilder<z.infer<S>, O>(schema);
	}

	/**
	 * Finalize the procedure by providing a resolver function.
	 * The returned object satisfies the `Procedure` type expected by the router.
	 *
	 * @param resolver - Function implementing the procedure logic
	 */
	resolve<R>(
		resolver: (opts: ResolverOpts<I>) => R | Promise<R>,
	): Procedure<z.ZodType, R> {
		return {
			inputSchema: this.schema,
			resolver: (input, ctx) => resolver({ input: input as I, ctx }),
			_input: undefined as I,
			_output: undefined as R,
		};
	}
}

/**
 * Identity helper to create a typed router definition. Keeps the router
 * object strongly typed while preserving its runtime shape.
 */
export function createRouter<T extends RouterDef>(def: T): T {
	return def;
}

/**
 * Minimal entry to initialise the small WRPC DSL used to declare routers
 * and procedures.
 */
export const initWRPC = {
	create() {
		return {
			router: createRouter,
			procedure: new ProcedureBuilder(),
		};
	},
};
