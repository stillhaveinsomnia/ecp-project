declare module "dht-rpc" {
  export default class DHT {
    constructor(options?: Options);
    toArray(): Array<{ host: string; port: number }>;
    addNode(node: { host: string; port: number }): void;
    static bootstrapper(port: number, host: string): DHT;
  }
  type Options = { nodes: Array<{ host: string; port: number }> };
}
