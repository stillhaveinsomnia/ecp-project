import { FontAwesome } from "@expo/vector-icons";
import { useLingui } from "@lingui/react/macro";
import { Fragment, useMemo, useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";
import { AccountId } from "../cryptography/cryptography";
import { getContactList, getContactListMembers } from "../queries/contactList";
import { getDirectMessagesSummary } from "../queries/directMessages";
import { Timestamp } from "../queries/Timestamp";
import { useEcpQuery, useRefreshEcpQueries } from "../store/dataApi";
import { useTheme } from "../Theme";
import { BottomTabNavigation } from "../ui/BottomTabNavigation";
import { CryptoAvatar } from "../ui/CryptoAvatar";
import { ScreenLink } from "../ui/ScreenLink";
import { ContactListScreen } from "./ContactListScreen";
import { ContactListsScreen } from "./ContactListsScreen";
import { ContactScreen } from "./ContactScreen";
import { DirectConversationScreen } from "./DirectConversationScreen";

// TODO make the search more powerful

export function DirectMessagesScreen({
  accountId,
  contactListCreatedAt,
}: {
  accountId: AccountId;
  contactListCreatedAt?: Timestamp;
}) {
  const { t } = useLingui();
  const theme = useTheme();
  const refreshECPQueries = useRefreshEcpQueries();
  const [toolbarState, setToolbarState] = useState<
    { type: "default" } | { type: "search"; text: string }
  >({ type: "default" });

  const conversations = useEcpQuery(getDirectMessagesSummary, { accountId });
  const searchMatchingConversations = useMemo(() => {
    if (toolbarState.type === "default" || !toolbarState.text.trim()) {
      return conversations;
    }
    const needle = toolbarState.text.trim().toLowerCase();
    return conversations.filter((item) =>
      item.contactName.toLowerCase().includes(needle),
    );
  }, [conversations, toolbarState]);

  const contactListMembers = useEcpQuery(getContactListMembers, {
    accountId,
    createdAt: contactListCreatedAt,
  });

  const contactListMatchingConversations = useMemo(() => {
    if (!contactListCreatedAt) {
      return searchMatchingConversations;
    }
    return searchMatchingConversations.filter((item) =>
      contactListMembers.includes(item.contactId),
    );
  }, [searchMatchingConversations, contactListCreatedAt, contactListMembers]);

  const filteredConversations = contactListMatchingConversations;

  const contactList = useEcpQuery(getContactList, {
    accountId,
    createdAt: contactListCreatedAt,
  });

  return (
    <Fragment>
      {(() => {
        switch (toolbarState.type) {
          case "default":
            return (
              <View style={{ flexDirection: "row" }}>
                <ScreenLink
                  to={async () => {
                    setToolbarState({ type: "search", text: "" });
                  }}
                  icon="search"
                  hideLabel
                  label={t`Search contacts`}
                />
                <View style={{ flexGrow: 1 }} />
                <ScreenLink
                  to={<ContactScreen accountId={accountId} />}
                  icon="user-plus"
                  label={t`Create new contact`}
                />
              </View>
            );
          case "search":
            return (
              <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
                <ScreenLink
                  to={async () => {
                    setToolbarState({ type: "default" });
                  }}
                  icon="times"
                  hideLabel
                  label={t`Stop searching`}
                />
                <TextInput
                  value={toolbarState.text}
                  onChangeText={(text) => {
                    setToolbarState({ type: "search", text });
                  }}
                  style={[
                    theme.textInputStyle(toolbarState.text),
                    { flexGrow: 1, marginRight: 16, paddingBottom: 6 },
                  ]}
                  placeholderTextColor={theme.secondaryTextColor}
                  placeholder={t`Search`}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
              </View>
            );
        }
      })()}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <ScreenLink
          to={<ContactListsScreen accountId={accountId} />}
          icon="folder"
          hideLabel
          label={t`Contact lists`}
        />
        {contactList && (
          <Fragment>
            <FontAwesome
              name="angle-right"
              size={16}
              color={theme.secondaryTextColor}
            />
            <ScreenLink
              to={
                <ContactListScreen
                  accountId={accountId}
                  createdAt={contactListCreatedAt}
                />
              }
              label={contactList.name}
              styleOverride={{ flexGrow: 1 }}
            />
          </Fragment>
        )}
      </View>
      <FlatList
        data={filteredConversations}
        renderItem={({ item }) => (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <ScreenLink
              to={
                <DirectConversationScreen
                  accountId={accountId}
                  contactId={item.contactId}
                />
              }
              styleOverride={{
                flexDirection: "row",
                paddingHorizontal: 8,
                marginVertical: 4,
                gap: 8,
                flexGrow: 1,
              }}
            >
              <CryptoAvatar accountId={accountId} contactId={item.contactId} />
              <View style={{ flexGrow: 1 }}>
                <View style={{ flexDirection: "row" }}>
                  <Text style={[theme.linkTextStyle, { flexGrow: 1 }]}>
                    {item.contactName}
                  </Text>
                  {item.lastMesssageCreatedAt && (
                    <Text
                      style={[
                        theme.secondaryTextStyle,
                        { alignSelf: "flex-end" },
                      ]}
                    >
                      {new Date(item.lastMesssageCreatedAt).toLocaleString()}
                    </Text>
                  )}
                </View>
                <View
                  style={{ flexDirection: "row", justifyContent: "flex-end" }}
                >
                  {item.unread > 0 && (
                    <Text
                      style={[
                        theme.textStyle,
                        {
                          fontWeight: "bold",
                          backgroundColor: theme.linkTextColor,
                          color: theme.backgroundColor,
                          paddingHorizontal: 4,
                          borderRadius: 8,
                          minWidth: 24,
                          textAlign: "center",
                        },
                      ]}
                    >
                      {item.unread}
                    </Text>
                  )}
                </View>
              </View>
            </ScreenLink>
          </View>
        )}
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        ListEmptyComponent={() =>
          toolbarState.type === "search" ? (
            <Text style={[theme.secondaryTextStyle, { textAlign: "center" }]}>
              {t`No results found`}
            </Text>
          ) : (
            <Text style={[theme.secondaryTextStyle, { textAlign: "center" }]}>
              {t`No messages`}
            </Text>
          )
        }
        refreshing={false}
        onRefresh={refreshECPQueries}
      />
      <BottomTabNavigation accountId={accountId} enabled={true} />
    </Fragment>
  );
}
