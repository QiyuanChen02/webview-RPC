import type * as vscode from "vscode";
import type z from "zod";

// Build "a", "a.b", "a.b.c" for any nested object where leaves are Procedure

type StringKeys<T> = Extract<keyof T, string>;

/**
 * Compute the set of dotted path keys into a nested router object.
 * Example: { a: { b: Procedure } } => "a.b"
 */
export type PathKeys<T> = {
	[K in StringKeys<T>]: T[K] extends Procedure<any, any>
		? K
		: T[K] extends object
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
		? T[P] extends Procedure<any, any>
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

/**
 * Execution context passed to procedure resolvers running on the host.
 */
export type ProcedureCtx = {
	panel: vscode.WebviewPanel;
	context: vscode.ExtensionContext;
	vscode: typeof vscode;
};

export type ResolverOpts<I> = {
	ctx: ProcedureCtx;
	input: I;
};

/**
 * A Procedure bundles an input schema and a resolver function. The
 * `_input` and `_output` fields exist purely to carry type information
 * through the router definition.
 */
export type Procedure<S extends z.ZodType, R> = {
	_input: z.infer<S>;
	_output: R;
	inputSchema: S;
	resolver: (input: z.infer<S>, ctx: ProcedureCtx) => R | Promise<R>;
};

/**
 * Router definition: a mapping of keys to either nested routers or leaf
 * Procedure definitions.
 */
export type RouterDef = { [k: string]: Procedure<any, any> | RouterDef };

export type InferInput<P> = P extends { _input: infer I } ? I : never;
export type InferOutput<P> = P extends { _output: infer O }
	? Awaited<O>
	: never;
