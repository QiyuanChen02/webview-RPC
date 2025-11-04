import type { Procedure, ResolverOpts, RouterDef } from "@webview-rpc/shared";
import z from "zod";

/**
 * Builder to create a Procedure definition with fluent .input() and
 * .resolve() helpers. This is only a compile-time helper - the builder
 * returns a plain Procedure object used at runtime.
 */
class ProcedureBuilder<TContext, TInput = undefined, TOutput = unknown> {
	private schema: z.ZodType;

	_input!: TInput;
	_output!: TOutput;
	_context!: TContext;

	constructor(schema: z.ZodType = z.void()) {
		this.schema = schema;
	}

	/**
	 * Set the input Zod schema for the procedure. Returns a new builder
	 * typed with the inferred input type.
	 */
	input<S extends z.ZodType>(schema: S) {
		return new ProcedureBuilder<TContext, z.infer<S>, TOutput>(schema);
	}

	/**
	 * Finalize the procedure by providing a resolver function.
	 * The returned object satisfies the `Procedure` type expected by the router.
	 *
	 * @param resolver - Function implementing the procedure logic
	 */
	resolve<R>(
		resolver: (opts: ResolverOpts<TContext, TInput>) => R | Promise<R>,
	): Procedure<TContext, typeof this.schema, R> {
		return {
			inputSchema: this.schema,
			resolver: (input, ctx) => resolver({ input: input as TInput, ctx }),
			_input: undefined as TInput,
			_output: undefined as R,
			_context: undefined as TContext,
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
 * tRPC-like initialization for WRPC. Use initWRPC.context<YourContext>().create()
 * to get a typed router and procedure builder, or initWRPC.create() for no context.
 *
 * @example
 * ```ts
 * // With context
 * type MyContext = { db: Database; user: User };
 * const t = initWRPC.context<MyContext>().create();
 *
 * const router = t.router({
 *   getUser: t.procedure
 *     .input(z.object({ id: z.string() }))
 *     .resolve(({ input, ctx }) => {
 *       // ctx is typed as MyContext
 *       return ctx.db.findUser(input.id);
 *     }),
 * });
 *
 * // Without context
 * const t2 = initWRPC.create();
 * const router2 = t2.router({
 *   ping: t2.procedure.resolve(() => 'pong'),
 * });
 * ```
 */
export const initWRPC = {
	/**
	 * Initialize WRPC with a specific context type.
	 */
	context<TContext>() {
		return {
			create() {
				return {
					router: createRouter,
					procedure: new ProcedureBuilder<TContext>(),
				};
			},
		};
	},
	/**
	 * Initialize WRPC without context.
	 */
	create() {
		return {
			router: createRouter,
			procedure: new ProcedureBuilder<void>(),
		};
	},
};
