import { Platform, PermissionsAndroid } from "react-native";
import RNBluetoothClassic, {
  BluetoothDevice,
} from "react-native-bluetooth-classic";
import {
  NetworkFactory,
  NetworkInInterface,
  NetworkOutInterface,
} from "../store/store";
import { AccountId, DeviceId, DeviceSecret } from "../cryptography/cryptography";

// ECP specific UUID for RFCOMM connection
const ECP_BLUETOOTH_UUID = "ECP-0000-1000-8000-00805F9B34FB";

export const bluetoothNetworkFactory: NetworkFactory = (out: NetworkInInterface) => {
  let isRunning = false;
  let localDeviceId: DeviceId | null = null;
  const connectedDevices = new Map<DeviceId, BluetoothDevice>();

  // Buffer for incoming messages (to handle fragmented JSON strings)
  const incomingBuffers = new Map<string, string>();

  // Helper to request Android permissions
  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      const apiLevel = parseInt(Platform.Version.toString(), 10);
      const permissions = [];

      if (apiLevel >= 31) {
        permissions.push(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE
        );
      } else {
        permissions.push(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
        );
      }

      for (const permission of permissions) {
        await PermissionsAndroid.request(permission);
      }
    }
  };

  const processIncomingData = async (
    device: BluetoothDevice,
    data: string
  ) => {
    const address = device.address;
    const currentBuffer = (incomingBuffers.get(address) || "") + data;

    // Try parsing newline delimited JSON (ndjson)
    const lines = currentBuffer.split("\n");
    
    // The last element might be an incomplete string
    const incompleteLine = lines.pop() || "";
    incomingBuffers.set(address, incompleteLine);

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const message = JSON.parse(line);

        // Handshake interception
        if (message.type === "ecp_bt_handshake" && message.deviceId) {
          const remoteDeviceId = message.deviceId as DeviceId;
          connectedDevices.set(remoteDeviceId, device);
          
          if (localDeviceId) {
            await out.connected(localDeviceId, remoteDeviceId);
          }
          continue; // Don't pass handshake to upper layer
        }

        // Normal message
        if (localDeviceId) {
          // We don't necessarily know the exact remoteDeviceId unless we find it in our connectedDevices map.
          // Let's find the DeviceId for this BluetoothDevice
          let senderDeviceId: DeviceId | null = null;
          for (const [dId, btDevice] of connectedDevices.entries()) {
            if (btDevice.address === address) {
              senderDeviceId = dId;
              break;
            }
          }
          if (senderDeviceId) {
             await out.received(localDeviceId, senderDeviceId, message);
          }
        }
      } catch (err) {
        console.warn("Failed to parse BT message", err);
      }
    }
  };

  const setupDeviceListeners = (device: BluetoothDevice) => {
    device.onDataReceived((event) => {
      processIncomingData(device, event.data);
    });
  };

  const startAcceptServer = async () => {
    try {
      await RNBluetoothClassic.startAccept({
        uuid: ECP_BLUETOOTH_UUID,
        name: "ECP Node",
      });
      // When a device connects via accept, we should handle it
      RNBluetoothClassic.onDeviceConnected(async (event) => {
         setupDeviceListeners(event.device);
         // Send our handshake
         if (localDeviceId) {
           await event.device.write(JSON.stringify({
             type: "ecp_bt_handshake",
             deviceId: localDeviceId
           }) + "\n");
         }
      });
    } catch (e) {
      console.warn("BT Start Accept failed", e);
    }
  };

  const networkOut: NetworkOutInterface = {
    async start(deviceSecret: DeviceSecret) {
      if (Platform.OS !== "android") {
        console.log("Bluetooth P2P is currently only supported on Android");
        return;
      }
      
      // Mock converting secret to ID (in reality, depends on cryptography)
      localDeviceId = deviceSecret as unknown as DeviceId; // Simplified for this layer

      await requestPermissions();
      
      const enabled = await RNBluetoothClassic.isBluetoothEnabled();
      if (!enabled) {
        await RNBluetoothClassic.requestBluetoothEnabled();
      }

      isRunning = true;
      await startAcceptServer();
    },

    async stop(deviceId: DeviceId) {
      isRunning = false;
      await RNBluetoothClassic.cancelAccept();
      for (const device of connectedDevices.values()) {
        try {
          await device.disconnect();
        } catch (e) {}
      }
      connectedDevices.clear();
      incomingBuffers.clear();
    },

    async join(deviceId: DeviceId, topic: AccountId) {
      if (!isRunning || Platform.OS !== "android") return;
      
      // Bluetooth Classic Discovery
      try {
        const devices = await RNBluetoothClassic.startDiscovery();
        
        for (const device of devices) {
          try {
            const connected = await device.connect({
              uuid: ECP_BLUETOOTH_UUID,
              SECURE_SOCKET: false
            });
            
            if (connected) {
               setupDeviceListeners(device);
               // Send handshake
               await device.write(JSON.stringify({
                 type: "ecp_bt_handshake",
                 deviceId: localDeviceId
               }) + "\n");
            }
          } catch (e) {
            // Failed to connect to this specific device, probably not running ECP or out of range
          }
        }
      } catch (e) {
         console.warn("BT Discovery failed", e);
      } finally {
         await RNBluetoothClassic.cancelDiscovery();
      }
    },

    async leave(deviceId: DeviceId, topic: AccountId) {
       // Since Bluetooth doesn't have "topics" in the same way DHT does, 
       // we can either disconnect from everyone or do nothing.
       // Usually we want to keep connections alive for other topics, so do nothing.
    },

    async getStartedDevices() {
      return localDeviceId ? [localDeviceId] : [];
    },

    async getConnectedDevices(deviceId: DeviceId) {
      return Array.from(connectedDevices.keys());
    },

    async send(deviceId: DeviceId, toDeviceId: DeviceId, message: unknown) {
      const device = connectedDevices.get(toDeviceId);
      if (device) {
        try {
          await device.write(JSON.stringify(message) + "\n");
        } catch (e) {
          console.warn("Failed to send BT message", e);
        }
      }
    },
  };

  return networkOut;
};
