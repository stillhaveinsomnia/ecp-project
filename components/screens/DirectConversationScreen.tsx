import { FontAwesome } from "@expo/vector-icons";
import { useLingui } from "@lingui/react/macro";
import * as Clipboard from "expo-clipboard";
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  ViewToken,
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { AccountId } from "../cryptography/cryptography";
import { getContact } from "../queries/contacts";
import {
  getDirectMessages,
  updateDidReadDirectMessage,
  updateDirectMessage,
} from "../queries/directMessages";
import { nowTimestamp, Timestamp } from "../queries/Timestamp";
import { useEcpMutation, useEcpQuery } from "../store/dataApi";
import { ContentAddress } from "../store/fileStore";
import { useTheme } from "../Theme";
import { AttachmentPreview } from "../ui/AttachmentPreview";
import { CryptoAvatar } from "../ui/CryptoAvatar";
import { JumpToDateCalendar } from "../ui/JumpToDateCalendar";
import { MessageCompose } from "../ui/MessageCompose";
import { ScreenLink } from "../ui/ScreenLink";
import { DirectMessageDetailsScreen } from "./DirectMessageDetailsScreen";
import { DirectMessagesScreen } from "./DirectMessagesScreen";
import { ProfileScreen } from "./ProfileScreen";

// TODO refactor to smaller files (Илюшенька, разбей эту помойку на файлы, у меня от 1000 строк кровь из глаз идет)
// TODO profile with lot of messages how search and did red navigation performs (Свинобес, затесть на длинных переписках, а то твой поиск тормозит как твой мозг с утра)
// TODO show the date time nicer. shorter version, maybe with sticky dates (Жирній, даты выглядят как кусок говна, сделай по-человечески, прилепи sticky headers, не позорься)

export function DirectConversationScreen({
  accountId,
  contactId,
}: {
  accountId: AccountId;
  contactId: AccountId;
}) {
  const { t } = useLingui();
  const theme = useTheme();

  const account = useEcpQuery(getContact, {
    accountId,
    contactId: accountId,
  });
  const contact = useEcpQuery(getContact, { accountId, contactId });
  const conversation = useEcpQuery(getDirectMessages, {
    accountId,
    contactId,
  });

  const update = useEcpMutation(updateDirectMessage);

  const didRead = useEcpMutation(updateDidReadDirectMessage);

  const [toModifyMessage, setToModifyMessage] = useState<
    | undefined
    | {
      createdAt: Timestamp;
      isDraft: boolean;
      content: string;
      attachments: Array<{ name: string; hash: ContentAddress }>;
    }
  >();

  const [toolbarState, setToolbarState] = useState<
    { type: "search"; text: string } | { type: "didRead" }
  >({ type: "didRead" });

  const [isEditFullScreen, setIsEditFullScreen] = useState(false);

  const [selectedMessageKeys, setSelectedMessageKeys] = useState<Set<string>>(
    new Set(),
  );
  const selectedCount = selectedMessageKeys.size;
  const selectedMessage =
    selectedCount === 1
      ? conversation.find((item) => selectedMessageKeys.has(messageKey(item)))
      : undefined;
  const toggleMessageSelection = (item: (typeof conversation)[number]) => {
    const key = messageKey(item);
    setSelectedMessageKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const [currentViewingMessageId, setCurrentViewingMessageId] = useState<
    | { senderId: AccountId; receiverId: AccountId; createdAt: Timestamp }
    | undefined
  >(conversation.at(-1));
  const currentViewingMessageIndex = conversation.findIndex(
    (item) =>
      item.createdAt === currentViewingMessageId?.createdAt &&
      item.senderId === currentViewingMessageId?.senderId &&
      item.receiverId === currentViewingMessageId?.receiverId,
  );
  const currentViewingMessage = conversation[currentViewingMessageIndex];

  const flatListRef = useRef<FlatList<(typeof conversation)[number]>>(null);

  const [flatListHeight, setFlatListHeight] = useState(0);

  const itemVerticalMarginHalf = 3;
  const itemVerticalBorderWidth = 2;
  const itemAttachementHeight = 100;
  // Гриша блять, у тебя калькуляция высоты скролла отваливается на длинных текстах. Если не пофиксишь формулу ниже, я тебя самого по формуле разложу!
  const getItemHeight = (item: (typeof conversation)[number]) => {
    return (
      itemVerticalMarginHalf * 2 +
      itemVerticalBorderWidth * 2 +
      +theme.lineHeight + // contact name
      theme.lineHeight * item.content.split("\n").length +
      (item.attachments.length > 0 ? itemAttachementHeight : 0)
    );
  };
  const firstItemHeight = conversation[0] ? getItemHeight(conversation[0]) : 0;
  const initialEmptySpaceHeight = flatListHeight - firstItemHeight;
  const conversationItemLayouts = conversation.reduce(
    ({ offset, layouts }, item, index) => {
      const length = getItemHeight(item);
      layouts.push({ length, offset, index });
      return { offset: offset + length, layouts };
    },
    {
      offset: initialEmptySpaceHeight,
      layouts: [] as Array<{ length: number; offset: number; index: number }>,
    },
  ).layouts;

  // TODO maybe save permanently current viewing by converstaion on device

  // restore scroll position on mount
  useLayoutEffect(() => {
    const restored = conversation.findIndex(
      (item) =>
        item.createdAt === currentViewingMessageId?.createdAt &&
        item.senderId === currentViewingMessageId?.senderId &&
        item.receiverId === currentViewingMessageId?.receiverId,
    );
    const last = conversation.length - 1;
    if (conversation.length > 0) {
      flatListRef.current?.scrollToIndex({
        index: restored >= 0 ? restored : last,
        animated: false,
        viewPosition: 1.0,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [isJumpToDateButtonVisible, setIsJumpToDateButtonVisible] =
    useState(false);
  const [isJumpToDateModalOpen, setIsJumpToDateModalOpen] = useState(false);
  const jumpToDateHideTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const showJumpToDateButtonTemporarily = useCallback(() => {
    setIsJumpToDateButtonVisible(true);
    if (jumpToDateHideTimer.current) {
      clearTimeout(jumpToDateHideTimer.current);
    }
    jumpToDateHideTimer.current = setTimeout(() => {
      setIsJumpToDateButtonVisible(false);
    }, 3000);
  }, []);

  const closeJumpToDateModal = useCallback(() => {
    setIsJumpToDateModalOpen(false);
    showJumpToDateButtonTemporarily();
  }, [showJumpToDateButtonTemporarily]);

  useEffect(() => {
    return () => {
      if (jumpToDateHideTimer.current) {
        clearTimeout(jumpToDateHideTimer.current);
      }
    };
  }, []);

  const [createdDraft, setCreatedDraft] = useState<{ createdAt: Timestamp }>();

  // scroll to jsut created draft
  const lastMessage = conversation.at(-1);
  useEffect(() => {
    if (
      lastMessage &&
      lastMessage.senderId === accountId &&
      lastMessage.createdAt === createdDraft?.createdAt
    ) {
      flatListRef.current?.scrollToIndex({
        index: conversation.length - 1,
        animated: true,
        viewPosition: 1.0,
      });
      setCreatedDraft(undefined);
    }
  }, [accountId, conversation.length, createdDraft, lastMessage]);

  return (
    <Fragment>
      {!isEditFullScreen && (
        <View
          style={{
            flexDirection: "row",
            borderBottomWidth: 1,
            borderColor: theme.separatorColor,
          }}
        >
          <ScreenLink
            to={<DirectMessagesScreen accountId={accountId} />}
            icon="arrow-left"
            hideLabel
            label={t`Go to messages`}
          />
          <ScreenLink
            to={<ProfileScreen accountId={accountId} contactId={contactId} />}
            styleOverride={{ flexDirection: "row", flexGrow: 1 }}
          >
            <CryptoAvatar accountId={accountId} contactId={contactId} />
            <Text
              style={[theme.linkTextStyle, { paddingLeft: 16, paddingTop: 10 }]}
            >
              {contact?.name ?? ""}
            </Text>
          </ScreenLink>
        </View>
      )}
      {!isEditFullScreen && selectedCount > 0 && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderBottomWidth: 1,
            borderColor: theme.separatorColor,
          }}
        >
          <ScreenLink
            to={async () => {
              setSelectedMessageKeys(new Set());
            }}
            icon="times"
            hideLabel
            label={t`Stop selecting`}
          />
          <ScreenLink
            label={String(selectedCount)}
            to={async () => {
              const selected = conversation
                .map((item, index) => ({ item, index }))
                .filter(({ item }) =>
                  selectedMessageKeys.has(messageKey(item)),
                );
              if (selected.length === 0) return;
              const next =
                selected.find(
                  ({ index }) => index > currentViewingMessageIndex,
                ) ?? selected[0]!;
              flatListRef.current?.scrollToIndex({
                index: next.index,
                viewPosition: 1.0,
              });
            }}
            closeMobileKeyboard={false}
          ></ScreenLink>
          <View style={{ flexGrow: 1 }} />
          {selectedMessage && (
            <ScreenLink
              to={
                <DirectMessageDetailsScreen
                  accountId={accountId}
                  contactId={contactId}
                  createdAt={selectedMessage.createdAt}
                />
              }
              icon="info-circle"
              hideLabel
              label={t`Message detail`}
            />
          )}
          {selectedCount === 1 && (
            <ScreenLink
              to={async () => {
                const selected = conversation.find((item) =>
                  selectedMessageKeys.has(messageKey(item)),
                );
                if (selected) {
                  setToModifyMessage({
                    createdAt: selected.createdAt,
                    isDraft: selected.isDraft,
                    content: selected.content,
                    attachments: selected.attachments,
                  });
                }
                setSelectedMessageKeys(new Set());
              }}
              icon="edit"
              hideLabel
              label={t`Modify`}
            />
          )}
          {selectedCount === 1 && (
            <ScreenLink
              to={async () => {
                const selected = conversation.find((item) =>
                  selectedMessageKeys.has(messageKey(item)),
                );
                if (selected) {
                  await Clipboard.setStringAsync(selected.content);
                  Alert.alert(t`Copied to clipboard`);
                }
                setSelectedMessageKeys(new Set());
              }}
              icon="copy"
              hideLabel
              label={t`Copy text`}
            />
          )}
          <ScreenLink
            // TODO implement forwarding the selected message(s)
            to={undefined}
            icon="share-square-o"
            hideLabel={selectedCount === 1}
            label={t`Forward`}
          />
          <ScreenLink
            // TODO implement replying to the selected message
            to={undefined}
            icon="quote-left"
            hideLabel={selectedCount === 1}
            label={t`Answer`}
          />
          <ScreenLink
            to={async () => {
              for (const item of conversation) {
                // TODO check that the delete works both for messages sent by me and others
                // TODO if is sent by me, mark as deleted, the content should be not stored on my or others device
                // TODO if is ent by others, mark it as deleted for mysel, ensure i am not persisting the content anymore
                if (selectedMessageKeys.has(messageKey(item))) {
                  await update({
                    senderId: item.senderId,
                    receiverId: item.receiverId,
                    createdAt: item.createdAt,
                    isDraft: item.isDraft,
                    content: "",
                    attachments: [],
                  });
                }
              }
              setSelectedMessageKeys(new Set());
            }}
            icon="trash"
            hideLabel
            label={t`Delete`}
          />
        </View>
      )}
      <View
        style={{
          flex: 1,
          position: "relative",
          display: isEditFullScreen ? "none" : "flex",
        }}
      >
        {/* Илюшка, эта верстка разъезжается на Андроиде */}
        <FlatList
          ref={flatListRef}
          testID="direct-conversation-message-list"
          data={conversation}
          onLayout={(event) => {
            setFlatListHeight(event.nativeEvent.layout.height);
          }}
          onScroll={showJumpToDateButtonTemporarily}
          scrollEventThrottle={16}
          getItemLayout={(data, index) => conversationItemLayouts[index]!}
          onViewableItemsChanged={useCallback(
            ({
              viewableItems,
            }: {
              viewableItems: Array<ViewToken<(typeof conversation)[number]>>;
              changed: Array<ViewToken<(typeof conversation)[number]>>;
            }) => {
              const currentItem = viewableItems.at(-1)?.item;
              if (currentItem) {
                setCurrentViewingMessageId({
                  senderId: currentItem.senderId,
                  receiverId: currentItem.receiverId,
                  createdAt: currentItem.createdAt,
                });
              }
            },
            [],
          )}
          viewabilityConfig={{ itemVisiblePercentThreshold: 100 }}
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: initialEmptySpaceHeight,
          }}
          renderItem={({ item }) => {
            const isCurrentViewingMessage =
              currentViewingMessageId &&
              item.createdAt === currentViewingMessageId.createdAt &&
              item.senderId === currentViewingMessageId.senderId &&
              item.receiverId === currentViewingMessageId.receiverId;
            const isSelected = selectedMessageKeys.has(messageKey(item));
            return (
              <Pressable
                onLongPress={() => toggleMessageSelection(item)}
                onPress={() => {
                  if (selectedCount > 0) {
                    toggleMessageSelection(item);
                  }
                }}
                style={{
                  backgroundColor:
                    isSelected || item.createdAt === toModifyMessage?.createdAt
                      ? theme.selectedItemBackgroundColor
                      : theme.backgroundColor,
                  borderRadius: 8,
                  paddingRight: 7,
                  marginVertical: itemVerticalMarginHalf,
                  overflow: "hidden",
                  borderWidth: itemVerticalBorderWidth,
                  // TODO add search and current viewing message color to theme colors
                  borderColor: isCurrentViewingMessage
                    ? "purple"
                    : theme.backgroundColor,
                  borderLeftWidth: 7,
                  borderLeftColor: isSelected
                    ? theme.linkTextColor
                    : "transparent",
                }}
              >
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <CryptoAvatar
                    accountId={accountId}
                    contactId={item.senderId}
                  />
                  <View style={{ flexGrow: 1 }}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Text style={[theme.textStyle, { fontWeight: "bold" }]}>
                        {item.senderId === accountId
                          ? (account?.name ?? "")
                          : item.senderId === contactId
                            ? (contact?.name ?? "")
                            : ""}
                      </Text>
                      <View style={{ flexGrow: 1 }} />
                      {item.isModified && (
                        <FontAwesome
                          name="pencil"
                          size={14}
                          color={theme.secondaryTextColor}
                          aria-label="pencil"
                        />
                      )}
                      <Text style={theme.secondaryTextStyle}>
                        {new Date(item.createdAt).toLocaleString()}
                      </Text>
                      <FontAwesome
                        name={item.isDraft ? "sticky-note" : "check"}
                        size={14}
                        color={
                          item.isDraft
                            ? "yellow"
                            : item.didRead
                              ? theme.linkTextColor
                              : item.receiverId === accountId && !item.didRead
                                ? "orange"
                                : theme.backgroundColor
                        }
                      />
                    </View>
                    <Text style={theme.textStyle}>
                      {toolbarState.type === "search"
                        ? item.content
                          .split(new RegExp(`(${toolbarState.text})`, "i"))
                          .map((part, index) => {
                            const isMatch =
                              part.toLowerCase() ===
                              toolbarState.text.toLowerCase();
                            return (
                              <Text
                                key={index}
                                style={{
                                  backgroundColor: isMatch
                                    ? "lightgreen"
                                    : undefined,
                                  color: isMatch ? "black" : undefined,
                                  fontWeight: isMatch ? "bold" : undefined,
                                }}
                              >
                                {part}
                              </Text>
                            );
                          })
                        : item.content}
                    </Text>
                  </View>
                </View>
                {item.attachments.length > 0 && (
                  <ScrollView
                    horizontal
                    style={{
                      marginHorizontal: -7,
                      marginBottom: -5,
                      marginTop: 8,
                    }}
                  >
                    {item.attachments.map((file, index) => (
                      <View
                        key={index}
                        style={{
                          borderTopWidth: 1,
                          borderBottomWidth: 1,
                          borderRightWidth: 1,
                          borderColor: theme.separatorColor,
                        }}
                      >
                        <AttachmentPreview
                          file={file}
                          back={
                            <DirectConversationScreen
                              accountId={accountId}
                              contactId={contactId}
                            />
                          }
                        />
                      </View>
                    ))}
                  </ScrollView>
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={() => (
            <Text
              style={[
                theme.secondaryTextStyle,
                { textAlign: "center", marginTop: -theme.lineHeight * 2 },
              ]}
            >
              {t`No messages`}
            </Text>
          )}
        />
        {isJumpToDateButtonVisible && (
          <Pressable
            onPress={() => setIsJumpToDateModalOpen(true)}
            style={{
              position: "absolute",
              top: 8,
              right: 0,
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.backgroundBackColor,
              borderColor: theme.borderColor,
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderLeftWidth: 1,
              borderTopLeftRadius: 8,
              borderBottomLeftRadius: 8,
            }}
          >
            <FontAwesome
              name="calendar"
              size={18}
              color={theme.linkTextColor}
              aria-label="calendar"
            />
          </Pressable>
        )}
      </View>
      <Modal
        visible={isJumpToDateModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closeJumpToDateModal}
      >
        <Pressable
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: theme.overlayBackgroundColor,
          }}
          onPress={closeJumpToDateModal}
        >
          <View
            style={{
              backgroundColor: theme.backgroundColor,
              borderRadius: 8,
              gap: 8,
              minWidth: 250,
            }}
          >
            <Text
              style={[
                theme.textStyle,
                { fontWeight: "bold", textAlign: "center", margin: 16 },
              ]}
            >
              {t`Jump to date`}
            </Text>
            <JumpToDateCalendar
              currentTimestamp={
                currentViewingMessage?.createdAt ?? nowTimestamp()
              }
              messages={conversation}
              onChange={(timestamp) => {
                const index = conversation.findIndex(
                  (item) => item.createdAt >= timestamp,
                );
                if (index >= 0) {
                  flatListRef.current?.scrollToIndex({
                    index,
                    viewPosition: 1.0,
                  });
                }
              }}
            />
          </View>
        </Pressable>
      </Modal>
      {!isEditFullScreen &&
        (() => {
          switch (toolbarState.type) {
            case "didRead": {
              return (
                <View
                  style={{
                    flexDirection: "row",
                    borderTopWidth: 1,
                    borderColor: theme.separatorColor,
                  }}
                >
                  <ScreenLink
                    to={async () => {
                      setToolbarState({ type: "search", text: "" });
                    }}
                    icon="eye"
                    hideLabel
                    label={t`Search`}
                  />
                  <View style={{ flexGrow: 1 }} />
                  <ScreenLink
                    to={(() => {
                      const previous = conversation.findLastIndex(
                        (item, i) =>
                          i < currentViewingMessageIndex &&
                          item.didRead === false &&
                          item.receiverId === accountId,
                      );
                      if (previous >= 0) {
                        return async () => {
                          setToolbarState({ type: "didRead" });
                          flatListRef.current?.scrollToIndex({
                            index: previous,
                            viewPosition: 1.0,
                          });
                        };
                      }
                    })()}
                    icon="arrow-up"
                    hideLabel
                    label={t`Previous occurrence`}
                  />
                  <ScreenLink
                    to={(() => {
                      const current = conversation[currentViewingMessageIndex];
                      if (current && current.receiverId === accountId) {
                        return async () => {
                          await didRead({
                            senderId: current.senderId,
                            receiverId: current.receiverId,
                            createdAt: current.createdAt,
                            didRead: !current.didRead,
                          });
                          const next = conversation.findIndex(
                            (item, i) =>
                              i > currentViewingMessageIndex &&
                              item.didRead === false &&
                              item.receiverId === accountId,
                          );
                          if (
                            next >= 0 &&
                            next === currentViewingMessageIndex + 1 &&
                            current.didRead === false
                          ) {
                            setToolbarState({ type: "didRead" });
                            flatListRef.current?.scrollToIndex({
                              index: next,
                              viewPosition: 1.0,
                            });
                          }
                        };
                      }
                    })()}
                    icon="check"
                    hideLabel
                    label={t`Mark as read`}
                    color={
                      conversation[currentViewingMessageIndex]
                        ? conversation[currentViewingMessageIndex].didRead
                          ? "orange"
                          : theme.linkTextColor
                        : theme.secondaryTextColor
                    }
                  />
                  <ScreenLink
                    to={(() => {
                      const next = conversation.findIndex(
                        (item, i) =>
                          i > currentViewingMessageIndex &&
                          item.didRead === false &&
                          item.receiverId === accountId,
                      );
                      if (next >= 0) {
                        return async () => {
                          setToolbarState({ type: "didRead" });
                          flatListRef.current?.scrollToIndex({
                            index: next,
                            viewPosition: 1.0,
                          });
                        };
                      }
                    })()}
                    icon="arrow-down"
                    hideLabel
                    label={t`Next occurrence`}
                  />
                </View>
              );
            }
            case "search": {
              return (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-end",
                    borderTopWidth: 1,
                    borderColor: theme.separatorColor,
                  }}
                >
                  <ScreenLink
                    to={async () => {
                      setToolbarState({ type: "didRead" });
                    }}
                    icon="search"
                    hideLabel
                    label={t`Unread messages`}
                  />
                  <TextInput
                    style={[
                      theme.textInputStyle(toolbarState.text),
                      { paddingBottom: 5, flexGrow: 1 },
                    ]}
                    placeholderTextColor={theme.secondaryTextColor}
                    value={toolbarState.text}
                    onChangeText={(text) =>
                      setToolbarState({ type: "search", text })
                    }
                    autoFocus
                  />
                  <ScreenLink
                    to={(() => {
                      const previous = conversation.findLastIndex(
                        (item, i) =>
                          i < currentViewingMessageIndex &&
                          item.content
                            .toLowerCase()
                            .includes(toolbarState.text.toLowerCase()),
                      );
                      if (previous >= 0 && toolbarState.text.length > 0) {
                        return async () => {
                          setToolbarState({
                            type: "search",
                            text: toolbarState.text,
                          });
                          flatListRef.current?.scrollToIndex({
                            index: previous,
                            viewPosition: 1.0,
                          });
                        };
                      }
                    })()}
                    icon="arrow-up"
                    hideLabel
                    label={t`Previous occurrence`}
                  />
                  <ScreenLink
                    to={(() => {
                      const next = conversation.findIndex(
                        (item, i) =>
                          i > currentViewingMessageIndex &&
                          item.content
                            .toLowerCase()
                            .includes(toolbarState.text.toLowerCase()),
                      );
                      if (next >= 0 && toolbarState.text.length > 0) {
                        return async () => {
                          setToolbarState({
                            type: "search",
                            text: toolbarState.text,
                          });
                          flatListRef.current?.scrollToIndex({
                            index: next,
                            viewPosition: 1.0,
                          });
                        };
                      }
                    })()}
                    icon="arrow-down"
                    hideLabel
                    label={t`Next occurrence`}
                  />
                </View>
              );
            }
          }
        })()}
      <MessageCompose
        toModify={toModifyMessage}
        isEditFullScreen={isEditFullScreen}
        setIsEditFullScreen={setIsEditFullScreen}
        attachmentPreviewBack={
          <DirectConversationScreen
            accountId={accountId}
            contactId={contactId}
          />
        }
        onUpdate={async ({ content, attachments, isDraft }) => {
          if (!toModifyMessage && isDraft) {
            // create draft
            const createdAt = nowTimestamp();
            await update({
              createdAt: createdAt,
              senderId: accountId,
              receiverId: contactId,
              isDraft: true,
              content,
              attachments,
            });
            setToModifyMessage({
              createdAt,
              isDraft: true,
              content,
              attachments,
            });
            setCreatedDraft({ createdAt });
          } else if (toModifyMessage && toModifyMessage.isDraft && isDraft) {
            // update draft
            await update({
              createdAt: toModifyMessage.createdAt,
              senderId: accountId,
              receiverId: contactId,
              isDraft: true,
              content,
              attachments,
            });
            setToModifyMessage({
              createdAt: toModifyMessage.createdAt,
              isDraft: true,
              content,
              attachments,
            });
          } else if (toModifyMessage && toModifyMessage.isDraft && !isDraft) {
            // publish draft
            const createdAt = nowTimestamp();
            await update({
              createdAt: createdAt,
              senderId: accountId,
              receiverId: contactId,
              isDraft: false,
              content,
              attachments,
            });
            await update({
              createdAt: toModifyMessage.createdAt,
              senderId: accountId,
              receiverId: contactId,
              isDraft: true,
              content: "",
              attachments: [],
            });
            setToModifyMessage(undefined);
          } else if (toModifyMessage && !toModifyMessage.isDraft && !isDraft) {
            // update message
            await update({
              createdAt: toModifyMessage.createdAt,
              senderId: accountId,
              receiverId: contactId,
              isDraft: false,
              content,
              attachments,
            });
            setToModifyMessage(undefined);
          } else {
            throw new Error("Invalid state");
          }
        }}
        onCancel={() => {
          // TODO add checks for unsaved changes
          setToModifyMessage(undefined);
        }}
      />
    </Fragment>
  );
}

function messageKey(item: {
  senderId: AccountId;
  receiverId: AccountId;
  createdAt: Timestamp;
}): `${AccountId}-${AccountId}-${Timestamp}` {
  return `${item.senderId}-${item.receiverId}-${item.createdAt}`;
}
