export type RpcRequest = {
	kind: "rpc/request";
	id: string;
	path: string;
	input: unknown;
};

export type RpcSuccess = {
	kind: "rpc/success";
	id: string;
	result: unknown;
};

export type RpcError = {
	kind: "rpc/error";
	id: string;
	error: { message: string };
};

export type RpcMessage = RpcRequest | RpcSuccess | RpcError;

export function isRpcMessage(msg: any): msg is RpcMessage {
	return (
		msg &&
		typeof msg === "object" &&
		typeof msg.kind === "string" &&
		msg.kind.startsWith("rpc/")
	);
}
