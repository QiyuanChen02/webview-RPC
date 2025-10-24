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
/**
 * A lightweight client interface used by the React Query wrapper.
 * It only requires a `call` method which maps a path+input to a Promise of the output.
 */

/**
 * Enhances a minimal WRPC client with typed React Query hooks.
 *
 * The returned object spreads the original client and exposes:
 * - useQuery(path, input, options)
 * - useMutation(path, options)
 * - useUtils() helpers for cache invalidation etc.
 *
 * @param wrpcClient - The underlying RPC client with a `call` method.
 */
export function withReactQuery<R extends RouterDef>(wrpcClient: WrpcClient<R>) {
	return {
		...wrpcClient,

		/**
		 * Typed React Query hook for fetching data from an RPC route.
		 *
		 * @param path - The router path key for the query
		 * @param input - The input payload for the call
		 * @param options - Additional React Query options (queryKey/queryFn are provided)
		 */
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

		/**
		 * Typed React Query mutation hook for calling RPC mutations.
		 *
		 * @param path - The router path key for the mutation
		 * @param options - Additional React Query options (mutationFn is provided)
		 */
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

		/**
		 * Utility helpers built on top of React Query's QueryClient.
		 * Currently exposes `invalidate` to invalidate cached queries for a path.
		 */
		useUtils: () => {
			const qc = useQueryClient();
			return {
				...qc,
				/**
				 * Invalidate queries associated with a route and optional input.
				 *
				 * @param path - Route path key
				 * @param input - Optional input to narrow the cache key
				 * @param options - Optional invalidateQueries options
				 */
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
				//  path: P,
				//  data: OutputAtPath<R, P>,
				//  input?: InputAtPath<R, P>,
				// ) => {
				//  const queryKey = input === undefined ? [path] : [path, input];
				//  qc.setQueryData(queryKey, data);
				// },
			};
		},
	};
}
