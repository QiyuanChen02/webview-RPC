/**
 * Message sent from the webview to request invocation of a remote procedure.
 */
export type RpcRequest = {
	kind: "rpc/request";
	id: string;
	path: string;
	input: unknown;
};

/**
 * Message sent from the host to the webview when a procedure completes
 * successfully.
 */
export type RpcSuccess = {
	kind: "rpc/success";
	id: string;
	result: unknown;
};

/**
 * Message sent from the host to the webview when a procedure throws or
 * returns an error.
 */
export type RpcError = {
	kind: "rpc/error";
	id: string;
	error: { message: string };
};

/**
 * Union of all RPC message kinds exchanged between webview and host.
 */
export type RpcMessage = RpcRequest | RpcSuccess | RpcError;

/**
 * Narrowly checks whether an arbitrary value looks like an RPC message.
 * Used to guard incoming postMessage payloads.
 */
export function isRpcMessage(msg: any): msg is RpcMessage {
	return (
		msg &&
		typeof msg === "object" &&
		typeof msg.kind === "string" &&
		msg.kind.startsWith("rpc/")
	);
}
