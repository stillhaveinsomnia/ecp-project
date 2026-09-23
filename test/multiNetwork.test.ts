import { createMultiNetwork } from "../components/network/multiNetwork";
import {
  NetworkFactory,
  NetworkInInterface,
  NetworkOutInterface,
} from "../components/store/store";
import { DeviceId } from "../components/cryptography/cryptography";

// Dummy factory that allows us to simulate connections and receiving messages
function createDummyNetwork(
  onSend: (deviceId: DeviceId, toDeviceId: DeviceId, message: unknown) => void,
): {
  factory: NetworkFactory;
  triggerConnected: (deviceId: string, otherDeviceId: string) => Promise<void>;
  triggerReceived: (
    deviceId: string,
    fromDeviceId: string,
    msg: unknown,
  ) => Promise<void>;
  getStarted: () => Set<string>;
} {
  let outInterface: NetworkInInterface | null = null;
  const started = new Set<string>();

  const factory: NetworkFactory = (out) => {
    outInterface = out;
    return {
      async start(deviceSecret) {
        // Just mock device ID extraction for the test
        started.add(deviceSecret);
      },
      async stop(deviceId) {
        started.delete(deviceId);
      },
      async join() {},
      async leave() {},
      async getStartedDevices() {
        return Array.from(started) as unknown as DeviceId[];
      },
      async getConnectedDevices() {
        return [];
      },
      async send(deviceId, toDeviceId, message) {
        onSend(deviceId, toDeviceId, message);
      },
    };
  };

  return {
    factory,
    async triggerConnected(deviceId, otherDeviceId) {
      if (outInterface) {
        await outInterface.connected(
          deviceId as DeviceId,
          otherDeviceId as DeviceId,
        );
      }
    },
    async triggerReceived(deviceId, fromDeviceId, msg) {
      if (outInterface) {
        await outInterface.received(
          deviceId as DeviceId,
          fromDeviceId as DeviceId,
          msg,
        );
      }
    },
    getStarted: () => started,
  };
}

describe("MultiNetwork", () => {
  test("aggregates started devices and fans out start/stop", async () => {
    const net1 = createDummyNetwork(() => {});
    const net2 = createDummyNetwork(() => {});

    const multiFactory = createMultiNetwork([net1.factory, net2.factory]);
    const multi = multiFactory({
      async received() {},
      async connected() {},
    });

    await multi.start("secret1" as any);
    await multi.start("secret2" as any);

    expect(net1.getStarted().has("secret1")).toBe(true);
    expect(net2.getStarted().has("secret2")).toBe(true);

    const started = await multi.getStartedDevices();
    expect(started).toHaveLength(2);
    expect(started).toContain("secret1");
    expect(started).toContain("secret2");

    await multi.stop("secret1" as any);
    expect(net1.getStarted().has("secret1")).toBe(false);
  });

  test("deduplicates connected events", async () => {
    let connectCount = 0;
    const net1 = createDummyNetwork(() => {});
    const net2 = createDummyNetwork(() => {});

    const multiFactory = createMultiNetwork([net1.factory, net2.factory]);
    const multi = multiFactory({
      async received() {},
      async connected() {
        connectCount++;
      },
    });

    // Sub-network 1 connects
    await net1.triggerConnected("d1", "d2");
    expect(connectCount).toBe(1);

    // Sub-network 2 also connects to the SAME device
    await net2.triggerConnected("d1", "d2");
    // Should NOT trigger the store 'connected' event again
    expect(connectCount).toBe(1);

    const connected = await multi.getConnectedDevices("d1" as any);
    expect(connected).toEqual(["d2"]);
  });

  test("routes send to the highest priority connected adapter", async () => {
    const sentLogs: Array<{ netId: number; target: string; msg: unknown }> = [];

    const net1 = createDummyNetwork((_, target, msg) => {
      sentLogs.push({ netId: 1, target: target as string, msg });
    });
    const net2 = createDummyNetwork((_, target, msg) => {
      sentLogs.push({ netId: 2, target: target as string, msg });
    });

    // net1 has higher priority (index 0)
    const multiFactory = createMultiNetwork([net1.factory, net2.factory]);
    const multi = multiFactory({
      async received() {},
      async connected() {},
    });

    // net2 connects to d2
    await net2.triggerConnected("d1", "d2");

    // send to d2
    await multi.send("d1" as any, "d2" as any, "hello from net2");
    expect(sentLogs).toHaveLength(1);
    expect(sentLogs[0].netId).toBe(2);

    // net1 now connects to d2 (net1 has higher priority)
    await net1.triggerConnected("d1", "d2");

    // send to d2 again
    await multi.send("d1" as any, "d2" as any, "hello from net1");
    expect(sentLogs).toHaveLength(2);
    expect(sentLogs[1].netId).toBe(1); // Routed to net1 instead of net2!
  });

  test("multiplexes received messages transparently", async () => {
    const receivedLogs: Array<{ src: string; msg: unknown }> = [];

    const net1 = createDummyNetwork(() => {});
    const net2 = createDummyNetwork(() => {});

    const multiFactory = createMultiNetwork([net1.factory, net2.factory]);
    multiFactory({
      async received(_, fromDeviceId, msg) {
        receivedLogs.push({ src: fromDeviceId as string, msg });
      },
      async connected() {},
    });

    await net1.triggerReceived("d1", "d2", "msg1");
    await net2.triggerReceived("d1", "d3", "msg2");

    expect(receivedLogs).toHaveLength(2);
    expect(receivedLogs[0].msg).toBe("msg1");
    expect(receivedLogs[1].msg).toBe("msg2");
  });
});
