# Direct messages

Backend contracts and storage:

- [x] Persist replies to multiple messages, selected quote text and forwarded-message references
- [x] Persist reaction add/remove events for direct and group messages
- [x] Validate attachment types, 10-attachment count, 50 MB per-file size, and location coordinates
- [ ] Route group reaction events to group members; the current send filter has no group-membership context
- [ ] Implement upload progress and attachment transfer/resume state
- [ ] Implement live-location update lifecycle, permissions, expiry and privacy controls
- [ ] Implement device export/save API for received attachments

Frontend integration:

- [ ] Quote/reply, multiple, slice of text: Илюшенька, тут нужно в `DirectConversationScreen` добавить выбор одного или нескольких сообщений и выделение фрагмента текста; передавать `replyTo` и `quotedText` в `updateDirectMessage`, показывать цитаты в пузыре и переходить к исходному сообщению по нажатию.
- [ ] Forward: Илюшенька, тут нужно добавить действие пересылки из меню сообщения и экран выбора чатов; создавать новое сообщение с `forwardedFrom` и исходными вложениями.
- [ ] Reactions: Илюшенька, тут нужно нарисовать список реакций и picker одного emoji; подключить `updateMessageReaction` к double-tap/меню сообщения и показывать `reactions` из `getDirectMessages`.
- [ ] Attachment limits: Илюшенька, тут нужно показывать ошибку при превышении 10 вложений или 50 МБ на файл и блокировать отправку; передавать размер как `sizeBytes`.
- [ ] Upload progress: Илюшенька, тут нужно добавить прогресс и отмену загрузки для каждого вложения, а также состояние повтора; backend progress API ещё не реализован.
- [ ] Save to device: Илюшенька, тут нужно добавить действие «Сохранить» в preview/меню файла; backend экспорт в галерею/файловую систему ещё не реализован.
- [ ] Previews: Илюшенька, тут нужно подключить `AttachmentPreview` в composer и сообщении, расширить просмотр для каждого типа ниже; сейчас компонент распознаёт изображения, видео, аудио и webxdc.
- [ ] Contact: Илюшенька, тут нужно добавить выбор контакта и карточку предпросмотра; передавать attachment `type: "contact"`.
- [ ] Links: Илюшенька, тут нужно добавить распознавание URL и карточку ссылки с заголовком/превью; передавать `type: "link"`.
- [ ] Files: Илюшенька, тут нужно добавить preview с именем, размером и кнопкой сохранения; передавать `type: "file"`, `mimeType`, `sizeBytes`.
- [ ] Images: Илюшенька, тут нужно добавить image picker, thumbnail и полноэкранный просмотр; передавать `type: "image"`.
- [ ] Videos: Илюшенька, тут нужно добавить video picker, playback preview и duration; передавать `type: "video"`.
- [ ] Audios: Илюшенька, тут нужно добавить waveform/player и playback controls; передавать `type: "audio"`.
- [ ] Static location: Илюшенька, тут нужно добавить отправку и карту-превью координат из `location`; передавать `type: "static-location"`.
- [ ] Live location: Илюшенька, тут нужно добавить выбор длительности, активный индикатор и карту с обновлениями; передавать `type: "live-location"`; backend-цикл обновления ещё нужно реализовать.
- [ ] Inline camera: Илюшенька, тут нужно добавить открытие камеры из composer и превью снимка/видео; передавать `type: "camera-image"` или `"camera-video"`.
- [ ] Inline audio: Илюшенька, тут нужно добавить запись, таймер, waveform, прослушивание и отмену; передавать `type: "audio-recording"`.
- [ ] auto save drafts on interval or screen change
- [ ] videocall
- [ ] contact mentions
- [ ] braodcast lists (send same message to multiple contacts)
- [ ] save scroll state
- [ ] filter by media type
- [ ] filter by date
- [ ] filter by tags
- [ ] message sync status
  - [ ] sent (on which devices)
  - [ ] delivered (on which devices)
- [ ] notifications
  - [ ] fire notificaiton on arrival
  - [ ] notification settings for given contact direct messages
    - [ ] mute for a time
- [ ] user is typing indicator (off by default)
- [ ] message tags (this to emulate pinned, archived, prefereed etc), the navigation ui will be in the conversation toolbar
- [ ] disappearing messages
- [ ] stickers gif support
- [ ] media gallery
- [ ] the "media gallery" should also be collaboritve file workspace, like ms teams
- [ ] message scheduling (send at a given time)
- [ ] connect to ai (only local)
- [ ] ai search (only local, just to generate the filters)
- [ ] text to speech on messages
- [ ] speech to text on audios
- [ ] markdown in message body
- [ ] reminder on message (ex, in 2 hours)
- [ ] view once message (selfdestruct on open)
- [ ] prevent screenshots
- [ ] Plausible deniability — deniable encryption so you can't prove a message exists (for very provate messages, ponder)

# Groups

- [ ] organize in lists
- [ ] membership managment
- [ ] threads as group lists (zulip style, group is for access, topic is for organizing)

# Group messages

- [x] Shared message metadata, typed attachments and reaction projections are available in the group-message API
- [ ] Илюшенька, тут нужно подключить те же quote/reply, forward, reactions и attachment UI в `GroupConversationScreen`; групповая доставка реакций ещё ожидает backend membership routing

# Calls

# Articles

- [ ] same features as single messages

# Places

- [ ] organize in lists
- [ ] text search

# Events

- [ ] location
- [ ] text search

# File sharing

- [ ] torrent like, with privacy settings

# General

- [ ] mini apps (like: wechat, webxdc)
- [ ] ephemeral content (disappearing messages, stories, might be implemented with TTL on normal content)
- [ ] offline first like briar, bluetooth, wifidirect, tor
- [ ] detect if on secure connection or vpn or anynizing network
