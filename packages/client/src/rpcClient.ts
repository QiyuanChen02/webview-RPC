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

export class Wrpc<R extends RouterDef> {
	constructor(
		private vscode: { postMessage: (msg: unknown) => void },
		private pending: Map<string, PendingEntry>,
	) {}

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
