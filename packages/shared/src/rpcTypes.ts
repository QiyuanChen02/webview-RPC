import type z from "zod";

// Build "a", "a.b", "a.b.c" for any nested object where leaves are Procedure

type StringKeys<T> = Extract<keyof T, string>;

/**
 * Compute the set of dotted path keys into a nested router object.
 * Example: { a: { b: Procedure } } => "a.b"
 */
export type PathKeys<T> = {
	[K in StringKeys<T>]: T[K] extends Procedure<any, any, any>
		? K
		: T[K] extends RouterDef
			? `${K}.${PathKeys<T[K]>}`
			: never;
}[StringKeys<T>];

// Find the Procedure type at a dotted path
export type ProcedureAtPath<
	T,
	P extends string,
> = P extends `${infer K}.${infer Rest}`
	? K extends StringKeys<T>
		? ProcedureAtPath<T[K], Rest>
		: never
	: P extends StringKeys<T>
		? T[P] extends Procedure<any, any, any>
			? T[P]
			: never
		: never;

/**
 * Input type for a procedure at a given path on the router.
 */
export type InputAtPath<
	R extends RouterDef,
	P extends PathKeys<R>,
> = InferInput<ProcedureAtPath<R, P>>;

/**
 * Output type for a procedure at a given path on the router.
 */
export type OutputAtPath<
	R extends RouterDef,
	P extends PathKeys<R>,
> = InferOutput<ProcedureAtPath<R, P>>;

export type ResolverOpts<TContext, TInput> = {
	ctx: TContext;
	input: TInput;
};

/**
 * A Procedure bundles an input schema and a resolver function. The
 * `_input` and `_output` fields exist purely to carry type information
 * through the router definition.
 */
export type Procedure<TContext, S extends z.ZodType, R> = {
	_input: z.infer<S>;
	_output: R;
	_context: TContext;
	inputSchema: S;
	resolver: (input: z.infer<S>, ctx: TContext) => R | Promise<R>;
};

/**
 * Router definition: a mapping of keys to either nested routers or leaf
 * Procedure definitions.
 */
export type RouterDef = { [k: string]: Procedure<any, any, any> | RouterDef };

export type InferInput<P> = P extends { _input: infer I } ? I : never;
export type InferOutput<P> = P extends { _output: infer O }
	? Awaited<O>
	: never;
