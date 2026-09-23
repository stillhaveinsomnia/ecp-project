declare module "hyperswarm" {
  import DHT, { KeyPair, PublicKey } from "hyperdht";
  export default class Hyperswarm {
    constructor(options?: Options);
    on(
      event: "connection",
      callback: (connection: Connection, info: PeerInfo) => void,
    ): void;
    join(
      /** A 32-byte buffer that represents the topic to announce */
      topic: Buffer,
      options: { server: boolean; client: boolean },
    ): Promise<PeerDiscovery>;
    leave(topic: Buffer): Promise<void>;
    /**
     * Emitted when internal values are changed, useful for user interfaces.
     * For example: emitted when swarm.connecting or swarm.connections changes.
     */
    on(event: "update", callback: () => void): void;
    suspended: boolean;
    connectin: number;
    destroyed: boolean;
    joinPeer(noisePublicKey: PublicKey): void;
    leavePeer(noisePublicKey: PublicKey): void;
    status(topic: Buffer): PeerDiscovery | undefined;
    flush(): Promise<void>;
    /** Number that indicates connections in progress */
    connecting: number;
    connections: Set<Connection>;
    /** A Map containing all connected peers, of the form: (Noise public key hex string) -> PeerInfo object */
    peers: Map<string, PeerInfo>;
    keyPair: { publicKey: Buffer; secretKey: Buffer };
    dht: DHT;
    listen(): Promise<void>;
    destroy(): Promise<void>;
  }
  type Options = {
    /** A Noise keypair that will be used to listen/connect on the DHT. Defaults to a new key pair */
    keyPair?: KeyPair;
    /** A unique, 32-byte, random seed that can be used to deterministically generate the key pair */
    seed?: any;
    maxPeers?: number;
    /** A sync function of the form remotePublicKey => (true|false). If true, the connection will be rejected. Defaults to allowing all connections. */
    firewall?(remotePublicKey: PublicKey): boolean;
    /** A DHT instance. Defaults to a new instance. */
    dht?: DHT;
    bootstrap?: Array<string>;
  };
  type Connection = {
    end(): void;
    on(event: "data", callback: (data: Buffer) => void): void;
    on(event: "close", callback: () => void): void;
    on(event: "error", callback: (error: unknown) => void): void;
    write(data: Buffer): void;
    pipe(stream: any): void;
  } & ReadableStream<Buffer>;
  type PeerInfo = {
    publicKey: PublicKey;
    topics: Array<Buffer>;
    prioritized: boolean;
    ban(banStatus: boolean): void;
  };
  type PeerDiscovery = {
    /** Waits for the topic to be fully announced on the DHT */
    flushed(): Promise<void>;
    /** Waits for the swarm to connect to pending peers */
    flush(): Promise<void>;
    refresh(config: { client: boolean; server: boolean }): Promise<void>;
    destroy(): Promise<void>;
  };
}
