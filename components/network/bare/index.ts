import "./polyfills";
// polifils first
import { decodeMultiStream, encode } from "@msgpack/msgpack";
import {
  clientFactory,
  type RemoteRequest,
  type RemoteResponse,
  serverReceive,
} from "../../remoteApi";
import {
  type NetworkInInterface,
  type NetworkOutInterface,
} from "../../store/store";
import { hyperswarmNetworkFactory } from "../hyperswarmNetwork";

const [networkInClientReceive, networkInClient] =
  clientFactory<NetworkInInterface>(async (request) => {
    BareKit.IPC.write(encode(request));
  });

const hyperswarmNetworkOut = hyperswarmNetworkFactory(networkInClient);

void (async () => {
  for await (const decoded of decodeMultiStream(BareKit.IPC)) {
    // TODO: validate decoded data
    if ("method" in (decoded as any)) {
      // TODO: validate decoded data
      const request = decoded as RemoteRequest<
        NetworkOutInterface,
        keyof NetworkOutInterface
      >;
      await serverReceive(
        hyperswarmNetworkOut,
        async (response) => {
          BareKit.IPC.write(encode(response));
        },
        request,
      );
    } else {
      // TODO: validate decoded data
      const response = decoded as RemoteResponse<
        NetworkInInterface,
        keyof NetworkInInterface
      >;
      await networkInClientReceive(response);
    }
  }
})();
