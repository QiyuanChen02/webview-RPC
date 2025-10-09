import z from "zod";
import type { Procedure, ResolverOpts, RouterDef } from "./rpcTypes";

class ProcedureBuilder<I = undefined, O = unknown> {
	private schema: z.ZodType;

	_input!: I;
	_output!: O;

	constructor(schema: z.ZodType = z.void()) {
		this.schema = schema;
	}

	input<S extends z.ZodType>(schema: S) {
		return new ProcedureBuilder<z.infer<S>, O>(schema);
	}

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

export function createRouter<T extends RouterDef>(def: T): T {
	return def;
}

export const initWRPC = {
	create() {
		return {
			router: createRouter,
			procedure: new ProcedureBuilder(),
		};
	},
};
