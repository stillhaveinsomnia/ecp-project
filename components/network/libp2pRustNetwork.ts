import { spawn } from "child_process";
import { Platform } from "react-native";
import { DeviceId, DeviceSecret, AccountId } from "../cryptography/cryptography";
import { NetworkFactory, NetworkInInterface, NetworkOutInterface } from "../store/store";

/**
 * Interface to the rust-libp2p daemon (ecp-daemon).
 * This spawns the Rust binary and communicates with it via WebSocket IPC.
 */
export function createLibp2pRustNetwork(): NetworkFactory {
  return (out: NetworkInInterface): NetworkOutInterface => {
    let daemonProcess: any = null;
    let ws: WebSocket | null = null;
    let sendQueue: any[] = [];
    const startedDevices = new Set<DeviceId>();
    const connectedDevices = new Map<DeviceId, Set<DeviceId>>(); // deviceId -> set of otherDeviceIds

    function connectWebSocket() {
      if (ws) return;
      console.log("[rust-libp2p] Connecting to daemon WebSocket...");
      ws = new WebSocket("ws://127.0.0.1:45321");
      
      ws.onopen = () => {
        console.log("[rust-libp2p] WebSocket connected!");
        while (sendQueue.length > 0) {
          const msg = sendQueue.shift();
          ws!.send(JSON.stringify(msg));
        }
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "Received") {
            const item = JSON.parse(msg.data);
            
            // For now, we assume the daemon handles global broadcast and 
            // we dispatch it to all started devices.
            for (const deviceId of startedDevices) {
              await out.received(deviceId, msg.source as DeviceId, item);
            }
          }
        } catch (e) {
          console.error("[rust-libp2p] Failed to parse message:", e);
        }
      };

      ws.onclose = () => {
        console.log("[rust-libp2p] WebSocket closed.");
        ws = null;
      };
    }

    return {
      async start(deviceSecret: DeviceSecret) {
        if (Platform.OS !== "web") {
          console.warn("[rust-libp2p] Daemon is only supported on Desktop (Electron). Skipping.");
          return;
        }
        
        const deviceId = deviceSecret.id;
        startedDevices.add(deviceId);
        connectedDevices.set(deviceId, new Set());

        if (!daemonProcess) {
          console.log("[rust-libp2p] Spawning ecp-daemon process...");
          // In production, the binary path would be bundled with Electron.
          daemonProcess = spawn("cargo", ["run"], { cwd: "../../desktop-daemon" });

          daemonProcess.stdout.on("data", (data: any) => {
            const output = data.toString();
            console.log(`[rust-libp2p] ${output}`);
            
            if (output.includes("IPC WebSocket server listening") && !ws) {
              connectWebSocket();
            }
          });

          daemonProcess.stderr.on("data", (data: any) => {
            console.error(`[rust-libp2p ERROR] ${data.toString()}`);
          });
        }
      },
      
      async stop(deviceId: DeviceId) {
        startedDevices.delete(deviceId);
        connectedDevices.delete(deviceId);

        if (startedDevices.size === 0) {
          console.log("[rust-libp2p] Stopping ecp-daemon...");
          if (ws) {
            ws.close();
            ws = null;
          }
          if (daemonProcess) {
            daemonProcess.kill();
            daemonProcess = null;
          }
        }
      },

      async send(deviceId: DeviceId, toDeviceId: DeviceId, message: unknown) {
        const payload = {
          type: "Broadcast",
          topic: "ecp-global",
          data: JSON.stringify(message),
        };
        
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(payload));
        } else {
          sendQueue.push(payload);
        }
      },

      async getStartedDevices() {
        return Array.from(startedDevices);
      },

      async getConnectedDevices(deviceId: DeviceId) {
        const set = connectedDevices.get(deviceId);
        return set ? Array.from(set) : [];
      },

      async join(deviceId: DeviceId, topic: AccountId) {
        // Send a join command to Rust daemon if needed (currently global topic is hardcoded)
      },

      async leave(deviceId: DeviceId, topic: AccountId) {
        // Send a leave command to Rust daemon if needed
      }
    };
  };
}
