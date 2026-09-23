review features secion, normalize items -> transform into tests
refactor articles screen to mixed feed: articles/microblog + images/carousels + short Videos
features to replicate for personal messaging: whatsapp, wechat, fb messenger, telegram, snapchat, matrix elementm, briar, delta chat, jami
do not send draft messages
fetures to replicate for team messaging: teams, discord, slack, rocket chat, mattermost, zulip
features from email and email clients
dont accept future timestamps
do not replicate deleted stuff? (ponder)
- [x] enforce data size limits (max file size, max number and size of messages, max attachments)
add confirm prompt for destructive actions
- [x] add cryptography, account + device signature
add whitelist recipients
fix when ataching big files now the screen is frozen
implement @hyperswarm/dht-relay and hyperswarm relayThrough
implement jami dhtnet (ConnectionManager for trusted peers)
implement webrtc stun turn ice (libwebrtc)
- [x] implement LAN discovery (simply being on the same network)
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
bug: fix on direct conversation screen, when bigger text and more messages, the messages layout breaks, differently on andoird and electrton (Илюша, блять, верстальщик от бога, у тебя верстка разъезжается от двух длинных строк, иди флексы учи, криворукий)
bug: fix currently selected message by scroll, the layout calcualtion is broken (Жирній, ты математику в школе прогуливал? Калькуляция скролла сломана в говно, поправь уже)

refactor so that entities
Message - for DM, group message, articles, events
Contact - for contact and account
Biography - for Profile and places

# More

- [ ] let the user choose avatr for their contact (it will replace the cryptoavatar, also update info on account creation screen) (Свинобес, прикрути выбор аватарки, а то у нас юзеры безликие как твоя фантазия)
- [ ] while editing a message, dont let user do anything to inadvertently lose chages (Илюшенька, сделай так, чтоб юзер случайно не проебал текст при редактировании. Повесь алерт, хоть что-то полезное сделай)
- [ ] contact presence status (off by default, research carefully bhow to implement)
- [ ] send invite to download app
- [x] app lock pin
- [ ] app lock biometric
- [x] backup device data to zip file
- [x] recovery key (AES-256-GCM + HKDF-SHA256 encrypted backup)
- [ ] recovery key restore UI (import from file / QR) (Гриша блять, где экран восстановления из QR кода? Или юзеры должны с экрана фоткать и перепечатывать по одной букве, гений?)
- [ ] settings screen with text search (Сракобес, на экране настроек нужен поиск, а то там черт ногу сломит, как в твоем коде)
- [ ] android background exection
- [ ] ios background exection
- [ ] macos background exection
- [ ] windows background exection
- [ ] linux background exection
- [ ] must update app mechanism
- [ ] data quota managment
- [ ] crash report send
- [x] conect over hyperswarm
- [x] connect bloetooth
- [x] connect wifi direct
- [ ] connect over federated servers
- [ ] relay connection
- [ ] accessibility keyboard navigation (Илюшка, прикрути навигацию с клавиатуры для людей с ограниченными возможностями, хотя ты сам походу с ними, раз такую верстку пушишь)
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
