import {
  QueryClient,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
  UseSuspenseQueryOptions,
} from "@tanstack/react-query";
import { use } from "react";
import { useCurrentScreenForceSuspend } from "../Routing";
import { FeApiContext, EcpMutation, EcpQuery } from "./feApi";

const isTest = process.env.NODE_ENV === "test";

export function createEcpQueryClient() {
  const gcTime = isTest ? Infinity : undefined;
  return new QueryClient({
    defaultOptions: {
      queries: { refetchOnMount: "always", retry: false, gcTime },
      mutations: { retry: false, gcTime },
    },
  });
}

export function useEcpQuery<Params, Result>(
  queryFactory: EcpQuery<Params, Result>,
  params: Params,
  options?: Omit<UseSuspenseQueryOptions<Result>, "queryKey" | "queryFn">,
): Result {
  const feApi = use(FeApiContext);
  const queryClient = useQueryClient();
  const forceSuspend = useCurrentScreenForceSuspend();
  return useSuspenseQuery(
    {
      ...options,
      queryKey: [queryFactory.name, params, forceSuspend],
      async queryFn(): Promise<Result> {
        // await new Promise((resolve) => setTimeout(resolve, 500));
        const result = await queryFactory(params)(feApi);
        if (result === undefined) return null as unknown as Result;
        return result;
      },
    },
    queryClient,
  ).data;
}

export function useRefreshEcpQueries() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries();
  };
}

export function useEcpMutation<Params>(
  mutationFactory: EcpMutation<Params>,
): (params: Params) => Promise<void> {
  const feApi = use(FeApiContext);

  const queryClient = useQueryClient();
  return useMutation(
    {
      async mutationFn(params: Params) {
        // await new Promise((resolve) => setTimeout(resolve, 500));
        await mutationFactory(params)(feApi);
      },
      async onSuccess() {
        await queryClient.invalidateQueries();
      },
    },
    queryClient,
  ).mutateAsync;
}
