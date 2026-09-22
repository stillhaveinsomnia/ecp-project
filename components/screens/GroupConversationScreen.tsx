import { useLingui } from "@lingui/react/macro";
import { Fragment, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { AccountId } from "../cryptography/cryptography";
import { getGroupMessages, updateGroupMessage } from "../queries/groupMessages";
import { getGroup } from "../queries/groups";
import { nowTimestamp, Timestamp } from "../queries/Timestamp";
import {
  useEcpMutation,
  useEcpQuery,
  useRefreshEcpQueries,
} from "../store/dataApi";
import { useTheme } from "../Theme";
import { MessageCompose } from "../ui/MessageCompose";
import { ScreenLink } from "../ui/ScreenLink";
import { GroupMessagesScreen } from "./GroupMessagesScreen";
import { GroupScreen } from "./GroupScreen";

export function GroupConversationScreen({
  accountId,
  groupId,
}: {
  accountId: AccountId;
  groupId: string;
}) {
  const { t } = useLingui();
  const theme = useTheme();
  const refreshECPQueries = useRefreshEcpQueries();

  const group = useEcpQuery(getGroup, { accountId, groupId });
  const conversation = useEcpQuery(getGroupMessages, { accountId, groupId });

  const send = useEcpMutation(updateGroupMessage);

  const [toModifyMessage, setToModifyMessage] = useState<
    undefined | { createdAt: Timestamp; content: string }
  >();

  const [isEditFullScreen, setIsEditFullScreen] = useState(false);

  return (
    <Fragment>
      {!isEditFullScreen && (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <ScreenLink
            to={<GroupMessagesScreen accountId={accountId} />}
            icon="arrow-left"
            hideLabel
            label={t`Go to messages`}
          />
          <ScreenLink
            to={<GroupScreen accountId={accountId} groupId={groupId} />}
            icon="user"
            label={group?.name ?? ""}
            styleOverride={{ flexGrow: 1 }}
          />
        </View>
      )}
      {!isEditFullScreen && (
        <FlatList
          data={conversation}
          renderItem={({ item }) => (
            <Pressable
              onLongPress={() => {
                setToModifyMessage(
                  item.createdAt === toModifyMessage?.createdAt &&
                    item.senderId === accountId
                    ? undefined
                    : { createdAt: item.createdAt, content: item.content },
                );
              }}
              style={{
                backgroundColor:
                  item.createdAt === toModifyMessage?.createdAt
                    ? theme.selectedItemBackgroundColor
                    : undefined,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  paddingHorizontal: 16,
                  justifyContent: "space-between",
                }}
              >
                <Text style={[theme.textStyle, { fontWeight: "bold" }]}>
                  {item.senderName}
                </Text>
                <Text style={theme.secondaryTextStyle}>
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              </View>
              <Text style={[theme.textStyle, { paddingHorizontal: 16 }]}>
                {item.content}
              </Text>
            </Pressable>
          )}
          style={{ flex: 1, marginVertical: 8 }}
          contentContainerStyle={{ flexGrow: 1 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={() => (
            <Text style={[theme.secondaryTextStyle, { textAlign: "center" }]}>
              {t`No messages`}
            </Text>
          )}
          refreshing={false}
          onRefresh={refreshECPQueries}
        />
      )}
      <MessageCompose
        toModify={undefined}
        isEditFullScreen={isEditFullScreen}
        setIsEditFullScreen={setIsEditFullScreen}
        attachmentPreviewBack={
          <GroupConversationScreen accountId={accountId} groupId={groupId} />
        }
        onUpdate={async ({ content }) => {
          await send({
            createdAt: toModifyMessage?.createdAt ?? nowTimestamp(),
            senderId: accountId,
            groupId: groupId,
            content: content,
          });
          if (toModifyMessage) {
            setToModifyMessage(undefined);
          }
        }}
        onCancel={() => {
          setToModifyMessage(undefined);
        }}
      />
    </Fragment>
  );
}
