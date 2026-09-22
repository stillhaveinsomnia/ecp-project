import { decode, encode } from "@msgpack/msgpack";
import { Platform } from "react-native";
import {
  clientFactory,
  RemoteRequest,
  RemoteResponse,
  serverReceive,
} from "../remoteApi";
import {
  NetworkFactory,
  NetworkInInterface,
  NetworkOutInterface,
} from "../store/store";

export const websocketNetworkFactory: NetworkFactory = (
  networkInImplementation,
) => {
  const ws = new WebSocket(
    Platform.select({
      web: "ws://localhost:8091",
      ios: "ws://127.0.0.1:8090",
      android: "ws://10.0.2.2:8090",
      default: "",
    }),
  );
  ws.binaryType = "arraybuffer";

  const websocketReady = new Promise<void>((resolve) => {
    ws.onopen = () => {
      resolve();
      console.log("WebSocket connection opened");
    };
  });

  const [clientReply, client] = clientFactory<NetworkOutInterface>(
    async (request) => {
      await websocketReady;
      ws.send(encode(request));
    },
  );

  ws.onmessage = async (event) => {
    const decoded = decode(new Uint8Array(event.data));
    if ("method" in (decoded as any)) {
      // TODO validate
      const request = decoded as RemoteRequest<
        NetworkInInterface,
        keyof NetworkInInterface
      >;
      await serverReceive(
        networkInImplementation,
        async (response) => ws.send(encode(response)),
        request,
      );
    } else {
      // TODO validate
      const response = decoded as RemoteResponse<
        NetworkOutInterface,
        keyof NetworkOutInterface
      >;
      await clientReply(response);
    }
  };

  ws.onerror = (event) => {
    console.log("WebSocket error", event);
  };

  ws.onclose = () => {
    console.log("WebSocket connection closed");
  };

  return client;
};
