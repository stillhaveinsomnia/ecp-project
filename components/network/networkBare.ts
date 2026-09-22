import { decodeMultiStream, encode } from "@msgpack/msgpack";
import { Worklet } from "react-native-bare-kit";
import {
  clientFactory,
  type RemoteRequest,
  type RemoteResponse,
  serverReceive,
} from "../remoteApi";
import {
  type NetworkFactory,
  type NetworkInInterface,
  type NetworkOutInterface,
} from "../store/store";
import bundle from "./bare/bundle";

export const bareNetworkFactory: NetworkFactory = (networkInImplementation) => {
  const worklet = new Worklet();
  worklet.start("/app.bundle", bundle);

  const [clientReceive, client] = clientFactory<NetworkOutInterface>(
    async (request) => {
      worklet.IPC.write(encode(request));
    },
  );
  void (async () => {
    for await (const decoded of decodeMultiStream(worklet.IPC)) {
      if ("method" in (decoded as any)) {
        // TODO validate
        await serverReceive(
          networkInImplementation,
          async (response) => {
            worklet.IPC.write(encode(response));
          },
          decoded as RemoteRequest<
            NetworkInInterface,
            keyof NetworkInInterface
          >,
        );
      } else {
        // TODO validate
        await clientReceive(
          decoded as RemoteResponse<
            NetworkOutInterface,
            keyof NetworkOutInterface
          >,
        );
      }
    }
  })();

  return client;
};
