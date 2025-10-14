import * as vscode from "vscode";
import type z from "zod";
import type {
	RpcError,
	RpcMessage,
	RpcRequest,
	RpcSuccess,
} from "./rpcProtocol";
import type { Procedure, RouterDef } from "./rpcTypes";

function isProcedure(obj: unknown): obj is Procedure<z.ZodType, unknown> {
	return (
		obj && typeof obj === "object" && "resolver" in obj && "inputSchema" in obj
	);
}

function getProcedure(
	router: RouterDef,
	path: string,
): Procedure<z.ZodType, unknown> {
	const parts = path.split(".");
	let current: any = router;
	for (const part of parts) {
		if (current && typeof current === "object" && part in current) {
			current = current[part];
		} else {
			throw new Error(`Path not found: ${path}`);
		}
	}

	if (!isProcedure(current)) {
		throw new Error(`Path is not a procedure: ${path}`);
	}
	return current;
}

export function attachRouterToPanel(
	router: RouterDef,
	panel: vscode.WebviewPanel,
	context: vscode.ExtensionContext,
) {
	const subscribe = panel.webview.onDidReceiveMessage(
		async (msg: RpcMessage) => {
			if (msg.kind !== "rpc/request") return;

			const request = msg as RpcRequest;
			try {
				const procedure = getProcedure(router, request.path);
				const parsed = procedure.inputSchema.safeParse(request.input);
				if (!parsed.success) {
					const response: RpcError = {
						kind: "rpc/error",
						id: request.id,
						error: { message: `Invalid input: ${parsed.error.message}` },
					};
					panel.webview.postMessage(response);
					return;
				}

				const result = await procedure.resolver(parsed.data, {
					panel,
					context,
					vscode,
				});
				const response: RpcSuccess = {
					kind: "rpc/success",
					id: request.id,
					result,
				};
				panel.webview.postMessage(response);
			} catch (error) {
				const response: RpcError = {
					kind: "rpc/error",
					id: request.id,
					error: {
						message: error instanceof Error ? error.message : "Unknown error",
					},
				};
				panel.webview.postMessage(response);
			}
		},
	);

	panel.onDidDispose(() => subscribe.dispose(), null, []);
}
