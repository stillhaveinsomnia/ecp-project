import { decode, encode } from "@msgpack/msgpack";
import getPort from "get-port";
import { WebSocket, WebSocketServer } from "ws";
import {
  clientFactory,
  type RemoteRequest,
  type RemoteResponse,
  serverReceive,
} from "../remoteApi";
import type { NetworkInInterface, NetworkOutInterface } from "../store/store";
import { hyperswarmNetworkFactory } from "./hyperswarmNetwork";

const hyperswarmNetwork = hyperswarmNetworkFactory(
  new Proxy(
    {},
    {
      get(_, method: string) {
        return (...args: Array<any>) => {
          return Promise.all(
            Array.from(sockets.values()).map((client) =>
              client[method as keyof NetworkInInterface](
                // @ts-ignore
                ...(args as Parameters<
                  NetworkInInterface[keyof NetworkInInterface]
                >),
              ),
            ),
          );
        };
      },
    },
  ) as NetworkInInterface,
);

const sockets = new Map<WebSocket, NetworkInInterface>();

void getPort({ port: [8090, 8091] }).then((port) => {
  const wss = new WebSocketServer({ port });

  console.log(`WebSocket server listening on port ${port}`);

  wss.on("connection", (ws) => {
    console.log("New WebSocket connection");
    const [clientReply, client] = clientFactory<NetworkInInterface>(
      (request) =>
        new Promise((resolve, reject) => {
          ws.send(encode(request), (err) => (err ? reject(err) : resolve()));
        }),
    );
    sockets.set(ws, client);
    ws.on("message", async (data) => {
      // console.log("Received WebSocket message: " + data.toString());
      const decoded = decode(new Uint8Array(data as ArrayBuffer));
      if ("method" in (decoded as any)) {
        // TODO validate
        await serverReceive(
          hyperswarmNetwork,
          (message) =>
            new Promise((resolve, reject) =>
              ws.send(encode(message), (err) =>
                err ? reject(err) : resolve(),
              ),
            ),
          decoded as RemoteRequest<
            NetworkOutInterface,
            keyof NetworkOutInterface
          >,
        );
      } else {
        // TODO validate
        await clientReply(
          decoded as RemoteResponse<
            NetworkInInterface,
            keyof NetworkInInterface
          >,
        );
      }
    });

    ws.on("error", (error) => {
      console.error(error);
    });

    ws.on("close", () => {
      sockets.delete(ws);
      console.log("WebSocket connection closed");
    });
  });
});
