import { NetworkFactory } from "../store/store";

export const networkDummy: NetworkFactory = () => ({
  async start() {},
  async stop() {},
  async send() {},
  async getStartedDevices() {
    return [];
  },
  async getConnectedDevices() {
    return [];
  },
  async join() {},
  async leave() {},
});
