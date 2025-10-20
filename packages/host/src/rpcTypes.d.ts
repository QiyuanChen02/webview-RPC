import type * as vscode from "vscode";
import type z from "zod";

type StringKeys<T> = Extract<keyof T, string>;
export type PathKeys<T> = {
	[K in StringKeys<T>]: T[K] extends Procedure<any, any>
		? K
		: T[K] extends object
			? `${K}.${PathKeys<T[K]>}`
			: never;
}[StringKeys<T>];
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
export type InputAtPath<
	R extends RouterDef,
	P extends PathKeys<R>,
> = InferInput<ProcedureAtPath<R, P>>;
export type OutputAtPath<
	R extends RouterDef,
	P extends PathKeys<R>,
> = InferOutput<ProcedureAtPath<R, P>>;
export type ProcedureCtx = {
	panel: vscode.WebviewPanel;
	context: vscode.ExtensionContext;
	vscode: typeof vscode;
};
export type ResolverOpts<I> = {
	ctx: ProcedureCtx;
	input: I;
};
export type Procedure<S extends z.ZodType, R> = {
	_input: z.infer<S>;
	_output: R;
	inputSchema: S;
	resolver: (input: z.infer<S>, ctx: ProcedureCtx) => R | Promise<R>;
};
export type RouterDef = {
	[k: string]: Procedure<any, any> | RouterDef;
};
export type InferInput<P> = P extends {
	_input: infer I;
}
	? I
	: never;
export type InferOutput<P> = P extends {
	_output: infer O;
}
	? Awaited<O>
	: never;
//# sourceMappingURL=rpcTypes.d.ts.map
