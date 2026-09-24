use futures::{prelude::*, stream::SplitSink};
use libp2p::{
    core::upgrade,
    gossipsub, identify, identity, kad, mdns, noise, ping, swarm::{NetworkBehaviour, SwarmEvent}, tcp, yamux, PeerId, SwarmBuilder,
};
use std::{error::Error, collections::hash_map::DefaultHasher, hash::{Hash, Hasher}, net::SocketAddr, time::Duration};
use tracing::{info, warn, error};
use tracing_subscriber::EnvFilter;

use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::{accept_async, WebSocketStream};
use tokio_tungstenite::tungstenite::protocol::Message as WsMessage;
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;

// -----------------------------------------------------------------------------
// 1. IPC Messages (Electron <-> Rust Daemon)
// -----------------------------------------------------------------------------

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type")]
enum IpcMessage {
    /// Electron sends this to broadcast a message to the network
    Broadcast { topic: String, data: String },
    /// Daemon sends this to Electron when a message is received from the network
    Received { topic: String, source: String, data: String },
    /// Status update
    Status { peers: usize },
}

// -----------------------------------------------------------------------------
// 2. Libp2p Network Behaviour
// -----------------------------------------------------------------------------

#[derive(NetworkBehaviour)]
struct EcpBehaviour {
    mdns: mdns::tokio::Behaviour,
    ping: ping::Behaviour,
    identify: identify::Behaviour,
    kademlia: kad::Behaviour<kad::store::MemoryStore>,
    gossipsub: gossipsub::Behaviour,
}

// -----------------------------------------------------------------------------
// 3. Main Loop
// -----------------------------------------------------------------------------

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    // Generate local peer identity
    let local_key = identity::Keypair::generate_ed25519();
    let local_peer_id = PeerId::from(local_key.public());
    info!("Local ECP Peer ID: {}", local_peer_id);

    // Setup Gossipsub
    let message_id_fn = |message: &gossipsub::Message| {
        let mut s = DefaultHasher::new();
        message.data.hash(&mut s);
        gossipsub::MessageId::from(s.finish().to_string())
    };

    let gossipsub_config = gossipsub::ConfigBuilder::default()
        .heartbeat_interval(Duration::from_secs(1))
        .validation_mode(gossipsub::ValidationMode::Strict)
        .message_id_fn(message_id_fn)
        .build()
        .expect("Valid gossipsub config");

    let mut gossipsub = gossipsub::Behaviour::new(
        gossipsub::MessageAuthenticity::Signed(local_key.clone()),
        gossipsub_config,
    ).expect("Correct configuration");

    // We subscribe to a global ECP topic for now
    let topic = gossipsub::IdentTopic::new("ecp-global");
    gossipsub.subscribe(&topic)?;

    // Setup Swarm
    let mut swarm = SwarmBuilder::with_existing_identity(local_key)
        .with_tokio()
        .with_tcp(
            tcp::Config::default(),
            noise::Config::new,
            yamux::Config::default,
        )?
        .with_dns()?
        .with_websocket(
            noise::Config::new,
            yamux::Config::default,
        )
        .await?
        .with_behaviour(|key| {
            let mdns = mdns::tokio::Behaviour::new(mdns::Config::default(), key.public().to_peer_id())?;
            let ping = ping::Behaviour::default();
            let identify = identify::Behaviour::new(identify::Config::new(
                "/ecp/1.0.0".into(),
                key.public(),
            ));
            
            let store = kad::store::MemoryStore::new(key.public().to_peer_id());
            let kademlia = kad::Behaviour::new(key.public().to_peer_id(), store);

            Ok(EcpBehaviour { mdns, ping, identify, kademlia, gossipsub })
        })?
        .build();

    // Listen on local port
    swarm.listen_on("/ip4/0.0.0.0/tcp/0".parse()?)?;

    // Setup IPC WebSocket Server
    let ws_listener = TcpListener::bind("127.0.0.1:45321").await?;
    info!("IPC WebSocket server listening on ws://127.0.0.1:45321");

    let (ws_tx, mut ws_rx) = mpsc::channel::<IpcMessage>(32);
    let (ipc_tx, mut ipc_rx) = mpsc::channel::<IpcMessage>(32);

    // Spawn task to accept WS connection
    tokio::spawn(async move {
        if let Ok((stream, _)) = ws_listener.accept().await {
            info!("Electron frontend connected via WebSocket");
            if let Ok(ws_stream) = accept_async(stream).await {
                let (mut write, mut read) = ws_stream.split();
                
                // Read from WS and send to swarm channel
                let ipc_tx_clone = ipc_tx.clone();
                tokio::spawn(async move {
                    while let Some(Ok(msg)) = read.next().await {
                        if let WsMessage::Text(text) = msg {
                            if let Ok(parsed) = serde_json::from_str::<IpcMessage>(&text) {
                                let _ = ipc_tx_clone.send(parsed).await;
                            }
                        }
                    }
                });

                // Read from swarm channel and write to WS
                while let Some(msg) = ws_rx.recv().await {
                    let json = serde_json::to_string(&msg).unwrap();
                    let _ = write.send(WsMessage::Text(json)).await;
                }
            }
        }
    });

    info!("ECP rust-libp2p daemon is running...");

    loop {
        tokio::select! {
            // Receive from WebSocket (Electron -> Rust)
            Some(msg) = ipc_rx.recv() => {
                match msg {
                    IpcMessage::Broadcast { topic: t, data } => {
                        let topic = gossipsub::IdentTopic::new(t);
                        if let Err(e) = swarm.behaviour_mut().gossipsub.publish(topic, data.into_bytes()) {
                            error!("Publish error: {:?}", e);
                        }
                    }
                    _ => {}
                }
            }

            // Receive from Libp2p Swarm (Rust -> Electron)
            event = swarm.select_next_some() => match event {
                SwarmEvent::NewListenAddr { address, .. } => {
                    info!("Listening on {:?}", address);
                }
                SwarmEvent::Behaviour(EcpBehaviourEvent::Mdns(mdns::Event::Discovered(list))) => {
                    for (peer_id, multiaddr) in list {
                        info!("mDNS discovered a new peer: {peer_id}");
                        swarm.behaviour_mut().kademlia.add_address(&peer_id, multiaddr.clone());
                        swarm.behaviour_mut().gossipsub.add_explicit_peer(&peer_id);
                    }
                }
                SwarmEvent::Behaviour(EcpBehaviourEvent::Mdns(mdns::Event::Expired(list))) => {
                    for (peer_id, _multiaddr) in list {
                        info!("mDNS peer expired: {peer_id}");
                        swarm.behaviour_mut().kademlia.remove_peer(&peer_id);
                        swarm.behaviour_mut().gossipsub.remove_explicit_peer(&peer_id);
                    }
                }
                SwarmEvent::Behaviour(EcpBehaviourEvent::Gossipsub(gossipsub::Event::Message {
                    propagation_source: peer_id,
                    message_id: _id,
                    message,
                })) => {
                    if let Ok(data) = String::from_utf8(message.data) {
                        let msg = IpcMessage::Received {
                            topic: message.topic.into_string(),
                            source: peer_id.to_string(),
                            data,
                        };
                        let _ = ws_tx.send(msg).await;
                    }
                }
                _ => {}
            }
        }
    }
}
