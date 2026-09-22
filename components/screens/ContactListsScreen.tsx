import { useLingui } from "@lingui/react/macro";
import { Fragment, useMemo, useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";
import { AccountId } from "../cryptography/cryptography";
import { getContactLists } from "../queries/contactList";
import { useEcpQuery, useRefreshEcpQueries } from "../store/dataApi";
import { useTheme } from "../Theme";
import { ScreenLink } from "../ui/ScreenLink";
import { ContactListScreen } from "./ContactListScreen";
import { DirectMessagesScreen } from "./DirectMessagesScreen";

export function ContactListsScreen({ accountId }: { accountId: AccountId }) {
  const { t } = useLingui();
  const theme = useTheme();
  const refreshECPQueries = useRefreshEcpQueries();
  const [toolbarState, setToolbarState] = useState<
    { type: "default" } | { type: "search"; text: string }
  >({ type: "default" });

  const lists = useEcpQuery(getContactLists, { accountId });
  const filteredLists = useMemo(() => {
    if (toolbarState.type === "default" || !toolbarState.text.trim()) {
      return lists;
    }
    const needle = toolbarState.text.trim().toLowerCase();
    return lists.filter((item) => item.name.toLowerCase().includes(needle));
  }, [lists, toolbarState]);

  return (
    <Fragment>
      {(() => {
        switch (toolbarState.type) {
          case "default":
            return (
              <View style={{ flexDirection: "row" }}>
                <ScreenLink
                  to={<DirectMessagesScreen accountId={accountId} />}
                  icon="arrow-left"
                  hideLabel
                  label={t`All messages`}
                />
                <ScreenLink
                  to={async () => {
                    setToolbarState({ type: "search", text: "" });
                  }}
                  icon="search"
                  hideLabel
                  label={t`Search contact lists`}
                />
                <View style={{ flexGrow: 1 }} />
                <ScreenLink
                  to={<ContactListScreen accountId={accountId} />}
                  icon="plus"
                  label={t`Create contact list`}
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
      <FlatList
        data={filteredLists}
        keyExtractor={(item) => String(item.createdAt)}
        renderItem={({ item }) => (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <ScreenLink
              to={
                <DirectMessagesScreen
                  accountId={accountId}
                  contactListCreatedAt={item.createdAt}
                />
              }
              styleOverride={{
                flexDirection: "row",
                paddingHorizontal: 16,
                marginVertical: 4,
                gap: 8,
                flexGrow: 1,
                minHeight: 44,
                alignItems: "center",
              }}
            >
              <Text style={[theme.linkTextStyle, { flexGrow: 1 }]}>
                {item.name}
              </Text>
            </ScreenLink>
          </View>
        )}
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        ListEmptyComponent={() =>
          toolbarState.type === "search" ? (
            <Text
              style={[
                theme.secondaryTextStyle,
                { textAlign: "center", paddingVertical: 16 },
              ]}
            >
              {t`No results found`}
            </Text>
          ) : (
            <Text
              style={[
                theme.secondaryTextStyle,
                { textAlign: "center", paddingVertical: 16 },
              ]}
            >
              {t`No contact lists`}
            </Text>
          )
        }
        refreshing={false}
        onRefresh={refreshECPQueries}
      />
    </Fragment>
  );
}
