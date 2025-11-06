import { createWrpcClient } from "@webview-rpc/client";
import { initWRPC } from "@webview-rpc/host";
import { withReactQuery } from "@webview-rpc/react-query";
import z from "zod";

const { router, procedure } = initWRPC.create();

const todoSchema = z.object({
	id: z.string(),
	title: z.string().min(2).max(100),
	completed: z.boolean(),
});
export const appRouter = router({
	storeTodo: procedure.input(todoSchema).resolve(async ({ input }) => {
		console.log("[INFO] Storing todo:", input);
	}),
});

type storeTodoInputType = z.infer<typeof todoSchema>;

export type AppRouter = typeof appRouter;

export const wrpc = withReactQuery<AppRouter>(createWrpcClient<AppRouter>());

const operation = wrpc.useMutation("storeTodo");

type operationMutateVariableType = Parameters<typeof operation.mutate>[0];

// Verify that the types match
type TypesMatch = storeTodoInputType extends operationMutateVariableType
	? operationMutateVariableType extends storeTodoInputType
		? true
		: false
	: false;

// This should compile without errors, proving the types are the same
const _verifyTypes: TypesMatch = true;
