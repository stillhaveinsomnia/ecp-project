import { useLingui } from "@lingui/react/macro";
import { Fragment } from "react";
import { ScrollView, Text, View } from "react-native";
import { AccountId } from "../cryptography/cryptography";
import {
  getDirectMessageHistory,
  getDirectMessages,
} from "../queries/directMessages";
import { Timestamp } from "../queries/Timestamp";
import { useEcpQuery } from "../store/dataApi";
import { useTheme } from "../Theme";
import { ScreenLink } from "../ui/ScreenLink";
import { DirectConversationScreen } from "./DirectConversationScreen";

// TODO show also other history items like: did read toggles, delivery times to devices
// TODO show text diff view

export function DirectMessageDetailsScreen({
  accountId,
  contactId,
  createdAt,
}: {
  accountId: AccountId;
  contactId: AccountId;
  createdAt: Timestamp;
}) {
  const { t } = useLingui();
  const theme = useTheme();

  const message = useEcpQuery(getDirectMessages, {
    accountId,
    contactId,
  }).find((item) => item.createdAt === createdAt);

  const history = useEcpQuery(
    getDirectMessageHistory,
    message
      ? {
          senderId: message.senderId,
          receiverId: message.receiverId,
          createdAt: message.createdAt,
        }
      : { senderId: accountId, receiverId: accountId, createdAt },
  );

  return (
    <Fragment>
      <View style={{ flexDirection: "row" }}>
        <ScreenLink
          to={
            <DirectConversationScreen
              accountId={accountId}
              contactId={contactId}
            />
          }
          icon="arrow-left"
          hideLabel
          label={t`Back to conversation`}
        />
        <Text
          style={[
            theme.textStyle,
            { fontWeight: "bold", flexGrow: 1, paddingTop: 10, marginLeft: 8 },
          ]}
        >
          {t`Message detail`}
        </Text>
      </View>

      <ScrollView>
        {history.map((item, index) => (
          <View
            key={index}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              gap: 4,
              borderTopWidth: 1,
              borderColor: theme.separatorColor,
            }}
          >
            <Text style={theme.secondaryTextStyle}>
              {new Date(item.timestamp).toLocaleString()}
            </Text>
            <Text style={theme.textStyle}>{item.content}</Text>
          </View>
        ))}
      </ScrollView>
    </Fragment>
  );
}
