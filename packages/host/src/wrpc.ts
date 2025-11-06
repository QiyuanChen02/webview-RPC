import type { Procedure, ResolverOpts, RouterDef } from "@webview-rpc/shared";
import z from "zod";

/**
 * Builder to create a Procedure definition with fluent .input() and
 * .resolve() helpers. This is only a compile-time helper - the builder
 * returns a plain Procedure object used at runtime.
 */
class ProcedureBuilder<
	TContext,
	TSchema extends z.ZodType = z.ZodVoid,
	TOutput = unknown,
> {
	private schema: TSchema;

	constructor(schema: TSchema = z.void() as unknown as TSchema) {
		this.schema = schema;
	}

	/**
	 * Set the input Zod schema for the procedure. Returns a new builder
	 * typed with the inferred input type.
	 */
	input<S extends z.ZodType>(schema: S) {
		return new ProcedureBuilder<TContext, S, TOutput>(schema);
	}

	/**
	 * Finalize the procedure by providing a resolver function.
	 * The returned object satisfies the `Procedure` type expected by the router.
	 *
	 * @param resolver - Function implementing the procedure logic
	 */
	resolve<R>(
		resolver: (
			opts: ResolverOpts<TContext, z.infer<TSchema>>,
		) => R | Promise<R>,
	): Procedure<TContext, TSchema, R> {
		const proc: Procedure<TContext, TSchema, R> = {
			inputSchema: this.schema,
			resolver: (input: z.infer<TSchema>, ctx: TContext) =>
				resolver({ input, ctx }),
			_input: undefined as z.infer<TSchema>,
			_output: undefined as R,
			_context: undefined as TContext,
		};
		return proc;
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
