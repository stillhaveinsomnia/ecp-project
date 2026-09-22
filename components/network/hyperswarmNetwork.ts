import { decodeMultiStream, encode } from "@msgpack/msgpack";
import DHT from "hyperdht";
import Hyperswarm, { type Connection } from "hyperswarm";
import {
  AccountId,
  accountIdToUint8Array,
  type DeviceId,
  deviceIdFromDeviceSecret,
  deviceIdFromUint8Array,
  deviceIdToUint8Array,
  type DeviceSecret,
  deviceSecretToUint8Array,
} from "../cryptography/cryptography";
import { type NetworkFactory } from "../store/store";

const isTest =
  typeof process !== "undefined" && process.env.NODE_ENV === "test";

export const hyperswarmNetworkFactory: NetworkFactory = ({
  connected,
  received,
}) => {
  const hyperswarmNodes = new Map<
    DeviceId,
    ReturnType<typeof hyperswarmNodeFactory>
  >();
  return {
    async start(deviceSecret) {
      const deviceId = deviceIdFromDeviceSecret(deviceSecret);
      if (hyperswarmNodes.has(deviceId)) {
        return;
      }
      const hyperswarmNodePromise = hyperswarmNodeFactory({
        deviceSecret,
        received(fromDeviceId, data) {
          return received(deviceId, fromDeviceId, data);
        },
        connected(otherDeviceId) {
          return connected(deviceId, otherDeviceId);
        },
      });
      hyperswarmNodes.set(deviceId, hyperswarmNodePromise);
      await hyperswarmNodePromise;
    },
    async stop(deviceId) {
      const hyperswarmNode = await hyperswarmNodes.get(deviceId);
      if (hyperswarmNode) {
        hyperswarmNodes.delete(deviceId);
        await hyperswarmNode.stop();
      }
    },
    async send(deviceId, toDeviceId, data) {
      const hyperswarmNode = await hyperswarmNodes.get(deviceId);
      // TODO
      // if (!hyperswarmNode) {
      //   throw new Error(`Device ${deviceId} not started`);
      // }
      await hyperswarmNode?.send(toDeviceId, data);
    },
    async getConnectedDevices(deviceId) {
      const hyperswarmNode = await hyperswarmNodes.get(deviceId);
      // TODO
      // if (!hyperswarmNode) {
      //   throw new Error(`Device ${deviceId} not started`);
      // }
      return (await hyperswarmNode?.getConnectedDevices()) ?? [];
    },
    async getStartedDevices() {
      return Array.from(hyperswarmNodes.keys());
    },
    async join(deviceId, topic) {
      const hyperswarmNode = await hyperswarmNodes.get(deviceId);
      // TODO
      // if (!hyperswarmNode) {
      //   throw new Error(`Device ${deviceId} not started`);
      // }
      await hyperswarmNode?.join(topic);
    },
    async leave(deviceId, topic) {
      const hyperswarmNode = await hyperswarmNodes.get(deviceId);
      if (!hyperswarmNode) {
        throw new Error(`Device ${deviceId} not started`);
      }
      await hyperswarmNode.leave(topic);
    },
  };
};

async function hyperswarmNodeFactory({
  deviceSecret,
  received,
  connected,
}: {
  deviceSecret: DeviceSecret;
  received(fromDeviceId: DeviceId, data: unknown): Promise<void>;
  connected(otherDeviceId: DeviceId): Promise<void>;
}) {
  const deviceId = deviceIdFromDeviceSecret(deviceSecret);
  // console.log(`Starting swarm ${deviceId}`);
  const swarm = new Hyperswarm({
    keyPair: {
      publicKey: Buffer.from(deviceIdToUint8Array(deviceId)),
      secretKey: Buffer.concat([
        Buffer.from(deviceSecretToUint8Array(deviceSecret)),
        Buffer.from(deviceIdToUint8Array(deviceId)),
      ]),
    },
    bootstrap: isTest
      ? [
          // local bootstrap nodes for development
          "127.0.0.1:50000", // ios, desktop
          "10.0.2.2:50000", // android
        ]
      : // internet bootstrap nodes
        DHT.BOOTSTRAP,
    firewall(remotePublicKey) {
      const otherDeviceId = deviceIdFromUint8Array(remotePublicKey);
      const isMe = otherDeviceId === deviceId;
      const isAlreadyConnected = connectionByDeviceId.has(otherDeviceId);
      // this prevents opening duplicate connections
      return isMe || isAlreadyConnected;
    },
  });
  await swarm.listen();
  // console.log(`Swarm started ${deviceId}`);

  const connectionByDeviceId = new Map<DeviceId, Connection>();

  swarm.on("connection", async (connection, info) => {
    const deviceIdString = deviceIdFromUint8Array(info.publicKey);
    connectionByDeviceId.set(deviceIdString, connection);
    console.log(`New swarm connection ${deviceIdString}`);
    await connected(deviceIdString);
    try {
      for await (const message of decodeMultiStream(connection)) {
        await received(deviceIdString, message);
      }
    } catch (error) {
      // should behave as connection.on("error", (error) => {});
      // console.log(`Connection error ${deviceIdString}`, error);
    } finally {
      // should behave as connection.on("close", () => {});
      connectionByDeviceId.delete(deviceIdString);
      console.log(`Connection closed ${deviceIdString}`);
    }
  });

  const topicSubscriptionStatus = new Map<
    AccountId,
    | { type: "joining"; promise: Promise<void> }
    | { type: "joined" }
    | { type: "leaving"; promise: Promise<void> }
    | { type: "left" }
  >();

  return {
    async getConnectedDevices() {
      return Array.from(connectionByDeviceId.keys());
    },
    async send(deviceId: DeviceId, data: unknown) {
      const connection = connectionByDeviceId.get(deviceId);
      if (!connection) {
        throw new Error(`No connection to device ${deviceId}`);
      }
      const encoded = encode(data);
      connection.write(
        Buffer.from(encoded.buffer, encoded.byteOffset, encoded.byteLength),
      );
    },
    async stop() {
      // console.log(`Stopping swarm ${deviceId}`);
      await swarm.destroy();
    },
    async join(contactId: AccountId) {
      const status = topicSubscriptionStatus.get(contactId) ?? { type: "left" };
      if (status.type === "left" || status.type === "leaving") {
        topicSubscriptionStatus.set(contactId, {
          type: "joining",
          promise: (async () => {
            if (status.type === "leaving") await status.promise;
            // console.log(`Joining swarm with topic ${contactId}`);
            const topic = Buffer.from(accountIdToUint8Array(contactId));
            await swarm.join(topic, { server: true, client: true });
            topicSubscriptionStatus.set(contactId, { type: "joined" });
            // console.log(`Joined swarm with topic ${contactId}`);
          })(),
        });
      }
    },
    async leave(contactId: AccountId) {
      const status = topicSubscriptionStatus.get(contactId) ?? { type: "left" };
      if (status.type === "joined" || status.type === "joining") {
        topicSubscriptionStatus.set(contactId, {
          type: "leaving",
          promise: (async () => {
            if (status.type === "joining") await status.promise;
            // console.log(`Leaving swarm with topic ${contactId}`);
            const topic = Buffer.from(accountIdToUint8Array(contactId));
            await swarm.leave(topic);
            topicSubscriptionStatus.set(contactId, { type: "left" });
            // console.log(`Left swarm with topic ${contactId}`);
          })(),
        });
      }
    },
  };
}
