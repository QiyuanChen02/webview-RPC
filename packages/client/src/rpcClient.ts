import type {
	InputAtPath,
	OutputAtPath,
	PathKeys,
	RouterDef,
	RpcMessage,
	RpcRequest,
} from "@webview-rpc/shared";
import { isRpcMessage } from "@webview-rpc/shared";

/**
 * Augment the global `window` with the optional VS Code webview API helper.
 * `acquireVsCodeApi` is provided when code runs inside a VS Code webview.
 */
declare global {
	interface Window {
		/**
		 * Returns an object that can post messages to the extension host.
		 */
		acquireVsCodeApi?: () => {
			postMessage: (msg: unknown) => void;
		};
	}
}

/**
 * An entry tracking a pending RPC call's promise handlers.
 * resolve/reject are invoked when a response for the request id arrives.
 */
type PendingEntry = {
	resolve: (v: unknown) => void;
	reject: (e: unknown) => void;
};

/**
 * Client-side wrapper that sends RPC requests to the VS Code extension host
 * and waits for corresponding responses. It is generic over the router
 * definition `R` so call signatures are strongly typed.
 */
export class Wrpc<R extends RouterDef> {
	constructor(
		/** The object returned from acquireVsCodeApi(). */
		private vscode: { postMessage: (msg: unknown) => void },
		/** Map of pending requests by id. */
		private pending: Map<string, PendingEntry>,
	) {}

	/**
	 * Make an RPC call by path with the provided input.
	 * The returned promise resolves when a success message arrives or rejects
	 * when an error message is received.
	 *
	 * @param path - Dotted path to the procedure on the host router
	 * @param input - Input to pass to the remote procedure
	 * @returns The procedure's output as a promise
	 */
	async call<P extends PathKeys<R>>(
		path: P,
		input?: InputAtPath<R, P>,
	): Promise<OutputAtPath<R, P>> {
		const id = crypto.randomUUID();
		const req: RpcRequest = { kind: "rpc/request", id, path, input };
		this.vscode.postMessage(req);

		return new Promise<OutputAtPath<R, P>>((resolve, reject) =>
			this.pending.set(id, { resolve, reject }),
		);
	}
}

/**
 * Create a Wrpc client instance wired to the current window's VS Code API.
 *
 * @throws If `acquireVsCodeApi` is not available (not running in a webview).
 */
export function createWrpcClient<R extends RouterDef>() {
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

	return new Wrpc<R>(vscode, pending);
}
