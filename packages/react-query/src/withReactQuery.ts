import {
	type UseMutationOptions,
	type UseQueryOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import type {
	InputAtPath,
	OutputAtPath,
	PathKeys,
	RouterDef,
} from "@webview-rpc/shared";

export type WrpcClient<R extends RouterDef> = {
	call: <P extends PathKeys<R>>(
		path: P,
		input: InputAtPath<R, P>,
	) => Promise<OutputAtPath<R, P>>;
};

export function withReactQuery<R extends RouterDef>(wrpcClient: WrpcClient<R>) {
	return {
		...wrpcClient,

		useQuery: <P extends PathKeys<R>>(
			path: P,
			input: InputAtPath<R, P>,
			options?: Omit<
				UseQueryOptions<OutputAtPath<R, P>>,
				"queryKey" | "queryFn"
			>,
		) => {
			return useQuery({
				queryKey: [path, input],
				queryFn: () => wrpcClient.call(path, input),
				...options,
			});
		},

		useMutation: <P extends PathKeys<R>>(
			path: P,
			options?: Omit<
				UseMutationOptions<OutputAtPath<R, P>, Error, InputAtPath<R, P>>,
				"mutationFn"
			>,
		) => {
			return useMutation({
				mutationFn: (input: InputAtPath<R, P>) => wrpcClient.call(path, input),
				...options,
			});
		},

		useUtils: () => {
			const qc = useQueryClient();
			return {
				...qc,
				invalidate: (
					path: PathKeys<R>,
					input?: InputAtPath<R, typeof path>,
					options?: Parameters<typeof qc.invalidateQueries>[1],
				) => {
					const queryKey = input === undefined ? [path] : [path, input];
					void qc.invalidateQueries({ queryKey, ...options });
				},

				// TODO: add in other helpers when needed. For now, only invalidate is added. E.g.

				// setData: <P extends PathKeys<R>>(
				// 	path: P,
				// 	data: OutputAtPath<R, P>,
				// 	input?: InputAtPath<R, P>,
				// ) => {
				// 	const queryKey = input === undefined ? [path] : [path, input];
				// 	qc.setQueryData(queryKey, data);
				// },
			};
		},
	};
}
