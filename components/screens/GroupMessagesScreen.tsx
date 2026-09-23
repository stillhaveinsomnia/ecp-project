import { useLingui } from "@lingui/react/macro";
import { Fragment } from "react";
import { FlatList, Text, View } from "react-native";
import { AccountId } from "../cryptography/cryptography";
import { getGroupMessagesSummary } from "../queries/groupMessages";
import { useEcpQuery, useRefreshEcpQueries } from "../store/dataApi";
import { useTheme } from "../Theme";
import { BottomTabNavigation } from "../ui/BottomTabNavigation";
import { ScreenLink } from "../ui/ScreenLink";
import { GroupConversationScreen } from "./GroupConversationScreen";
import { GroupScreen } from "./GroupScreen";

export function GroupMessagesScreen({ accountId }: { accountId: AccountId }) {
  const { t } = useLingui();
  const theme = useTheme();
  const refreshECPQueries = useRefreshEcpQueries();

  const conversations = useEcpQuery(getGroupMessagesSummary, { accountId });

  return (
    <Fragment>
      <View style={{ flexDirection: "row" }}>
        <View style={{ flexGrow: 1 }} />
        <ScreenLink
          to={<GroupScreen accountId={accountId} />}
          icon="plus"
          label={t`Create new group`}
        />
      </View>
      <FlatList
        data={conversations}
        renderItem={({ item }) => (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <ScreenLink
              to={
                <GroupConversationScreen
                  accountId={accountId}
                  groupId={item.groupId}
                />
              }
              label={item.groupName}
              icon="circle"
              styleOverride={{ flexGrow: 1 }}
            />
            {item.lastMessageCreatedAt ? (
              <Text style={[theme.textStyle, { paddingRight: 16 }]}>
                {new Date(item.lastMessageCreatedAt).toLocaleString()}
              </Text>
            ) : null}
          </View>
        )}
        style={{ flex: 1, marginVertical: 8 }}
        contentContainerStyle={{ flexGrow: 1 }}
        ListEmptyComponent={() => (
          <Text style={[theme.secondaryTextStyle, { textAlign: "center" }]}>
            {t`No messages`}
          </Text>
        )}
        refreshing={false}
        onRefresh={refreshECPQueries}
      />
      <BottomTabNavigation accountId={accountId} enabled={true} />
    </Fragment>
  );
}
