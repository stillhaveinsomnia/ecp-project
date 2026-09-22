review features secion, normalize items -> transform into tests
refactor articles screen to mixed feed: articles/microblog + images/carousels + short Videos
features to replicate for personal messaging: whatsapp, wechat, fb messenger, telegram, snapchat, matrix elementm, briar, delta chat, jami
do not send draft messages
fetures to replicate for team messaging: teams, discord, slack, rocket chat, mattermost, zulip
features from email and email clients
dont accept future timestamps
do not replicate deleted stuff? (ponder)
enforce data size limits (max file size, max number and size of messages, max attachments)
add confirm prompt for destructive actions
add cryptography, account + device signature
add whitelist recipients
fix when ataching big files now the screen is frozen
implement @hyperswarm/dht-relay and hyperswarm relayThrough
implement jami dhtnet (ConnectionManager for trusted peers)
implement webrtc stun turn ice (libwebrtc)
implement LAN discovery (simply being on the same network)
implement multipeer on ios
implement libp2p for desktop (rust library version)
implement tor connectivity
implement mainline dht connectivity (qbittorrent libtorrent rasterbar BEP55 DEP10)
in hyperswarm disconnect from devices not in conctact list
add confirm prompts for destrucive actions (remove account, delete contact)
check frontend performance
check backend performance
profile bandwidth usage (maybe compress files or entire stream)
make website
create more efficient database
ensure data is safe in the database if device is stolen
security audit
mitigate denial of service
bug: fix on direct conversation screen, when bigger text and more messages, the messages layout breaks, differently on andoird and electrton
bug: fix currently selected message by scroll, the layout calcualtion is broken

refactor so that entities
Message - for DM, group message, articles, events
Contact - for contact and account
Biography - for Profile and places

# More

- [ ] let the user choose avatr for their contact (it will replace the cryptoavatar, also update info on account creation screen)
- [ ] while editing a message, dont let user do anything to inadvertently lose chages
- [ ] contact presence status (off by default, research carefully bhow to implement)
- [ ] send invite to download app
- [ ] app lock pin
- [ ] app lock biometric
- [ ] backup device data to zip file
- [ ] backup device data to google drive
- [ ] backup device data to one drive
- [ ] settings screen with text search
- [ ] android background exection
- [ ] ios background exection
- [ ] macos background exection
- [ ] windows background exection
- [ ] linux background exection
- [ ] must update app mechanism
- [ ] data quota managment
- [ ] crash report send
- [ ] conect over hyperswarm
- [ ] connect bloetooth
- [ ] connect wifi direct
- [ ] connect over federated servers
- [ ] relay connection
- [ ] accessibility keyboard navigation
- [ ] acessibility test with screen reader

# Platform support

- [ ] android
  - [ ] binary published on website
  - [ ] published on store
- [ ] ios
  - [ ] dev build
  - [ ] binary published on website
  - [ ] published on store
- [ ] windows
  - [ ] dev build
  - [ ] binary published on website
- [ ] macos
  - [ ] dev build
  - [ ] binary published on website
- [ ] linux
  - [ ] dev build
  - [ ] binary published on website
- [ ] cloud (for replication)
- [ ] premise (for replication)
