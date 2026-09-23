declare module "hyperdht" {
  import DHTRPC from "dht-rpc";
  export default class DHT extends DHTRPC {
    constructor(options?: Options);
    createServer(): Server;
    /** make a ed25519 keypair to listen on */
    static keyPair(): KeyPair;
    destroy(): void;
    static BOOTSTRAP: Array<string>;
  }
  type Options = {
    /** ['host:port'] */
    bootstrap?: Array<string>;
    keyPair?: KeyPair;
    /** ms, default 5000 */
    connectionKeepAlive: number;
    /** ms, default 2000 */
    randomPunchInterval: number;
  };
  type Server = {
    on(event: "connection", callback: (socket: Socket) => void): void;
    on(event: "listening"): void;
    on(event: "close"): void;
    listen(keyPair: KeyPair): Promise<void>;
    close(): Promise<void>;
  };
  type Socket = NodeJS.WritableStream &
    NodeJS.WritableStream & {
      remotePublicKey: any;
      /** fully connected */
      on(event: "open", callback: () => void): void;
    };
  type KeyPair = { publicKey: PublicKey; secretKey: SecretKey };
  type PublicKey = Buffer & {};
  type SecretKey = Buffer & {};
}
