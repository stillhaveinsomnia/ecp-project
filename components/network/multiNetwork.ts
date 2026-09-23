import { AccountId, DeviceId, DeviceSecret } from "../cryptography/cryptography";
import {
  NetworkFactory,
  NetworkInInterface,
  NetworkOutInterface,
} from "../store/store";

/**
 * Creates a NetworkFactory that aggregates multiple underlying NetworkFactories.
 * It multiplexes incoming events and routes outgoing requests to the most
 * appropriate underlying network.
 *
 * Priorities: The order of factories in the array dictates their priority
 * when sending messages. Lower index = higher priority.
 * Example: [LanNetwork, BluetoothNetwork, HyperswarmNetwork]
 */
export function createMultiNetwork(
  factories: NetworkFactory[],
): NetworkFactory {
  return (out: NetworkInInterface): NetworkOutInterface => {
    // Map of deduplicated global connections.
    // Keeps track of how many underlying transports are currently connected to a device.
    // Map<LocalDevice, Set<RemoteDevice>>
    const connectedDevices = new Map<DeviceId, Set<DeviceId>>();

    // Which remote devices are connected via which adapter index.
    // Used for routing 'send' calls.
    // Map<LocalDevice, Map<RemoteDevice, Set<number /* adapterIndex */>>>
    const connectionAdapters = new Map<DeviceId, Map<DeviceId, Set<number>>>();

    // Instantiate all underlying networks
    const adapters = factories.map((factory, index) => {
      return factory({
        async received(deviceId, fromDeviceId, message) {
          // Simply pass through received messages
          await out.received(deviceId, fromDeviceId, message);
        },
        async connected(deviceId, otherDeviceId) {
          if (!connectionAdapters.has(deviceId)) {
            connectionAdapters.set(deviceId, new Map());
          }
          const deviceMap = connectionAdapters.get(deviceId)!;

          if (!deviceMap.has(otherDeviceId)) {
            deviceMap.set(otherDeviceId, new Set());
          }
          const adaptersSet = deviceMap.get(otherDeviceId)!;

          const isFirstOverallConnection = adaptersSet.size === 0;
          adaptersSet.add(index);

          if (!connectedDevices.has(deviceId)) {
            connectedDevices.set(deviceId, new Set());
          }
          connectedDevices.get(deviceId)!.add(otherDeviceId);

          // Only notify the top-level store once per unique connection
          if (isFirstOverallConnection) {
            await out.connected(deviceId, otherDeviceId);
          }
        },
      });
    });

    return {
      async start(deviceSecret: DeviceSecret) {
        await Promise.all(adapters.map((a) => a.start(deviceSecret)));
      },
      async stop(deviceId: DeviceId) {
        // Clean up connection maps
        connectedDevices.delete(deviceId);
        connectionAdapters.delete(deviceId);

        await Promise.all(adapters.map((a) => a.stop(deviceId)));
      },
      async join(deviceId: DeviceId, topic: AccountId) {
        await Promise.all(adapters.map((a) => a.join(deviceId, topic)));
      },
      async leave(deviceId: DeviceId, topic: AccountId) {
        await Promise.all(adapters.map((a) => a.leave(deviceId, topic)));
      },
      async getStartedDevices() {
        // Aggregate started devices from all adapters
        const started = new Set<DeviceId>();
        for (const adapter of adapters) {
          const devs = await adapter.getStartedDevices();
          for (const d of devs) {
            started.add(d);
          }
        }
        return Array.from(started);
      },
      async getConnectedDevices(deviceId: DeviceId) {
        const devs = connectedDevices.get(deviceId);
        return devs ? Array.from(devs) : [];
      },
      async send(deviceId: DeviceId, toDeviceId: DeviceId, message: unknown) {
        const deviceMap = connectionAdapters.get(deviceId);
        if (!deviceMap) return; // We are not connected to anything from this device

        const adaptersSet = deviceMap.get(toDeviceId);
        if (!adaptersSet || adaptersSet.size === 0) return; // Not connected to the target

        // Find the best adapter (lowest index) that is currently connected
        let bestAdapterIndex = Infinity;
        for (const index of adaptersSet) {
          if (index < bestAdapterIndex) {
            bestAdapterIndex = index;
          }
        }

        if (bestAdapterIndex !== Infinity) {
          await adapters[bestAdapterIndex].send(deviceId, toDeviceId, message);
        }
      },
    };
  };
}
