type RemoteInterfaceShape = Record<
  string,
  (...args: Array<any>) => Promise<any>
>;

export type RemoteRequest<
  Interface extends RemoteInterfaceShape,
  Method extends keyof Interface,
> = { id: number; method: Method; arguments: Parameters<Interface[Method]> };

export type RemoteResponse<
  Interface extends RemoteInterfaceShape,
  Method extends keyof Interface,
> = { id: number; result: ReturnType<Interface[Method]> };

export function serverReceive<
  Interface extends RemoteInterfaceShape,
  Method extends keyof Interface,
>(
  implementation: Interface,
  reply: (response: RemoteResponse<Interface, Method>) => Promise<void>,
  request: RemoteRequest<Interface, Method>,
) {
  return implementation[request.method]!(...request.arguments).then(
    (result: ReturnType<Interface[Method]>) =>
      reply({ id: request.id, result }),
  );
}

export function clientFactory<
  Interface extends Record<string, (...args: Array<any>) => Promise<any>>,
>(
  send: (request: RemoteRequest<Interface, keyof Interface>) => Promise<void>,
): [
  (response: RemoteResponse<Interface, keyof Interface>) => Promise<void>,
  Interface,
] {
  let idCounter = 0;
  const pendingRequests = new Map<number, (result: any) => void>();
  return [
    async (response) => {
      const resolve = pendingRequests.get(response.id);
      pendingRequests.delete(response.id);
      resolve!(response.result);
    },
    new Proxy(
      {},
      {
        get(_, method: string) {
          return (...args: Array<any>) => {
            const id = idCounter++;
            const resulting = new Promise((resolve) => {
              pendingRequests.set(id, resolve);
            });
            return send({
              id,
              method: method as keyof Interface,
              arguments: args as Parameters<Interface[keyof Interface]>,
            }).then(() => resulting);
          };
        },
      },
    ) as Interface,
  ];
}
