import type {
	InputAtPath,
	OutputAtPath,
	PathKeys,
	RouterDef,
	RpcMessage,
	RpcRequest,
} from "@webview-rpc/shared";
import { isRpcMessage } from "@webview-rpc/shared";

declare global {
	interface Window {
		acquireVsCodeApi?: () => {
			postMessage: (msg: unknown) => void;
		};
	}
}

type PendingEntry = {
	resolve: (v: unknown) => void;
	reject: (e: unknown) => void;
};

/**
 * Creates a typed RPC caller for a given router.
 * Usage:
 *   const rpcCall = createRpcClient<AppRouter>();
 *   const msg = await rpcCall("greeting", undefined);
 */
export function createRpcClient<R extends RouterDef>() {
	const vscode = window.acquireVsCodeApi?.();
	if (!vscode) {
		throw new Error(
			"acquireVsCodeApi() not available. Run inside a VS Code webview.",
		);
	}

	const pending = new Map<string, PendingEntry>();

	// One listener per client instance
	const onMessage = (event: MessageEvent) => {
		const msg = event.data as RpcMessage;
		if (!isRpcMessage(msg)) return;

		if (msg.kind === "rpc/success") {
			pending.get(msg.id)?.resolve(msg.result);
			pending.delete(msg.id);
		} else if (msg.kind === "rpc/error") {
			pending.get(msg.id)?.reject(new Error(msg.error.message));
			pending.delete(msg.id);
		}
	};
	window.addEventListener("message", onMessage);

	// The returned function is fully typed; generics are inferred at call sites
	function rpcCall<P extends PathKeys<R>>(
		path: P,
		input: InputAtPath<R, P>,
	): Promise<OutputAtPath<R, P>> {
		const id = crypto.randomUUID(); // no fallback as requested
		const req: RpcRequest = { kind: "rpc/request", id, path, input };
		vscode.postMessage(req);

		return new Promise<OutputAtPath<R, P>>((resolve, reject) => {
			pending.set(id, { resolve, reject });
		});
	}

	return rpcCall;
}
