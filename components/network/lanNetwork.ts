import { Platform } from "react-native";
import TcpSocket from "react-native-tcp-socket";
import Zeroconf from "react-native-zeroconf";
import {
  NetworkFactory,
  NetworkInInterface,
  NetworkOutInterface,
} from "../store/store";
import { AccountId, DeviceId, DeviceSecret } from "../cryptography/cryptography";
import { Buffer } from "buffer";

// ECP Zeroconf service type
const ZEROCONF_TYPE = "ecp";
const ZEROCONF_PROTOCOL = "tcp";
const ZEROCONF_DOMAIN = "local.";

export const lanNetworkFactory: NetworkFactory = (out: NetworkInInterface) => {
  let isRunning = false;
  let localDeviceId: DeviceId | null = null;
  
  // Track open sockets to other peers by their DeviceId
  const connectedSockets = new Map<DeviceId, TcpSocket.Socket>();
  
  // Track buffers for NDJSON incoming stream by socket address
  const incomingBuffers = new Map<string, string>();
  
  // The local server instance
  let server: TcpSocket.Server | null = null;
  
  // Zeroconf instance
  const zeroconf = new Zeroconf();

  // Handle incoming data buffer parsing (NDJSON)
  const processIncomingData = async (
    socket: TcpSocket.Socket,
    data: Buffer | string
  ) => {
    const addressKey = `${socket.remoteAddress}:${socket.remotePort}`;
    const chunk = typeof data === "string" ? data : data.toString("utf8");
    const currentBuffer = (incomingBuffers.get(addressKey) || "") + chunk;

    const lines = currentBuffer.split("\n");
    const incompleteLine = lines.pop() || "";
    incomingBuffers.set(addressKey, incompleteLine);

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const message = JSON.parse(line);

        // Handshake interception
        if (message.type === "ecp_lan_handshake" && message.deviceId) {
          const remoteDeviceId = message.deviceId as DeviceId;
          connectedSockets.set(remoteDeviceId, socket);
          
          if (localDeviceId) {
            await out.connected(localDeviceId, remoteDeviceId);
          }
          continue; 
        }

        // Normal message
        if (localDeviceId) {
          let senderDeviceId: DeviceId | null = null;
          for (const [dId, s] of connectedSockets.entries()) {
            if (s === socket) {
              senderDeviceId = dId;
              break;
            }
          }
          if (senderDeviceId) {
             await out.received(localDeviceId, senderDeviceId, message);
          }
        }
      } catch (err) {
        console.warn("Failed to parse LAN message", err);
      }
    }
  };

  const setupSocketListeners = (socket: TcpSocket.Socket) => {
    socket.on("data", (data) => {
      processIncomingData(socket, data);
    });

    socket.on("error", (error) => {
      console.warn("LAN Socket error", error);
    });

    socket.on("close", () => {
      const addressKey = `${socket.remoteAddress}:${socket.remotePort}`;
      incomingBuffers.delete(addressKey);
      
      // Remove from map if disconnected
      for (const [dId, s] of connectedSockets.entries()) {
        if (s === socket) {
          connectedSockets.delete(dId);
          break;
        }
      }
    });
  };

  const startServer = async (): Promise<number> => {
    return new Promise((resolve, reject) => {
      server = TcpSocket.createServer((socket) => {
        setupSocketListeners(socket);
        // Reply with handshake on incoming connections
        if (localDeviceId) {
          socket.write(
            JSON.stringify({
              type: "ecp_lan_handshake",
              deviceId: localDeviceId,
            }) + "\n"
          );
        }
      });

      server.on("error", (error) => {
        console.error("LAN Server error", error);
        reject(error);
      });

      // Port 0 auto-assigns an available ephemeral port
      server.listen({ port: 0, host: "0.0.0.0" }, () => {
        const address = server?.address();
        if (address && typeof address !== "string") {
          resolve(address.port);
        } else {
          reject(new Error("Failed to get server port"));
        }
      });
    });
  };

  const networkOut: NetworkOutInterface = {
    async start(deviceSecret: DeviceSecret) {
      if (Platform.OS !== "android") {
        console.log("LAN Discovery is currently limited to Android by user request");
        return;
      }
      
      localDeviceId = deviceSecret as unknown as DeviceId;

      try {
        const port = await startServer();
        
        // Publish our service on the local network so others can connect to our port
        const serviceName = `ECPNode-${Math.random().toString(36).substring(2, 8)}`;
        zeroconf.publish(serviceName, ZEROCONF_TYPE, ZEROCONF_PROTOCOL, ZEROCONF_DOMAIN, port, {
          txt: "ECP_P2P",
        });

        isRunning = true;
      } catch (e) {
        console.error("Failed to start LAN network", e);
      }
    },

    async stop(deviceId: DeviceId) {
      isRunning = false;
      
      try {
        zeroconf.unpublishService(`ECPNode`);
        zeroconf.stop();
      } catch (e) {}

      if (server) {
        server.close();
        server = null;
      }

      for (const socket of connectedSockets.values()) {
        socket.destroy();
      }
      connectedSockets.clear();
      incomingBuffers.clear();
    },

    async join(deviceId: DeviceId, topic: AccountId) {
      if (!isRunning || Platform.OS !== "android") return;
      
      zeroconf.on("resolved", (service) => {
        // Prevent connecting to ourselves (though OS usually prevents it, but just in case)
        if (!service.addresses || service.addresses.length === 0) return;
        
        const host = service.addresses[0];
        const port = service.port;
        
        // Check if we already have a socket to this IP
        for (const socket of connectedSockets.values()) {
          if (socket.remoteAddress === host) {
            return; // Already connected
          }
        }

        try {
          const clientSocket = TcpSocket.createConnection({ port, host }, () => {
            setupSocketListeners(clientSocket);
            // Send handshake
            if (localDeviceId) {
              clientSocket.write(
                JSON.stringify({
                  type: "ecp_lan_handshake",
                  deviceId: localDeviceId,
                }) + "\n"
              );
            }
          });
        } catch (e) {
          console.warn(`Failed to connect to LAN peer ${host}:${port}`, e);
        }
      });

      zeroconf.scan(ZEROCONF_TYPE, ZEROCONF_PROTOCOL, ZEROCONF_DOMAIN);
    },

    async leave(deviceId: DeviceId, topic: AccountId) {
      // Disconnecting specifically by topic isn't standard in LAN Mesh, 
      // usually we keep sockets open for other topics.
    },

    async getStartedDevices() {
      return localDeviceId ? [localDeviceId] : [];
    },

    async getConnectedDevices(deviceId: DeviceId) {
      return Array.from(connectedSockets.keys());
    },

    async send(deviceId: DeviceId, toDeviceId: DeviceId, message: unknown) {
      const socket = connectedSockets.get(toDeviceId);
      if (socket) {
        try {
          socket.write(JSON.stringify(message) + "\n");
        } catch (e) {
          console.warn("Failed to send LAN message", e);
        }
      }
    },
  };

  return networkOut;
};
