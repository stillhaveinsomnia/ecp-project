import { FontAwesome } from "@expo/vector-icons";
import { useLingui } from "@lingui/react/macro";
import { Fragment } from "react";
import { FlatList, Platform, Text, View } from "react-native";
import { AccountId, deviceIdToString } from "../cryptography/cryptography";
import { getContactChangesHistory } from "../queries/contacts";
import { useEcpQuery, useRefreshEcpQueries } from "../store/dataApi";
import { useTheme } from "../Theme";
import { CryptoAvatar } from "../ui/CryptoAvatar";
import { ScreenLink } from "../ui/ScreenLink";
import { ContactScreen } from "./ContactScreen";

export function ContactChangesHistoryScreen({
  accountId,
  contactId,
}: {
  accountId: AccountId;
  contactId: AccountId;
}) {
  const { t } = useLingui();
  const theme = useTheme();
  const refreshECPQueries = useRefreshEcpQueries();

  const history = useEcpQuery(getContactChangesHistory, {
    accountId,
    contactId,
  });

  return (
    <Fragment>
      <View style={{ flexDirection: "row" }}>
        <ScreenLink
          to={<ContactScreen accountId={accountId} contactId={contactId} />}
          icon="arrow-left"
          hideLabel
          label={t`Back to contact`}
        />
        <CryptoAvatar accountId={accountId} contactId={contactId} />
        <Text
          style={[
            theme.textStyle,
            { fontWeight: "bold", flexGrow: 1, paddingTop: 10, marginLeft: 8 },
          ]}
        >
          {t`Changes history`}
        </Text>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item, index) => `${item.timestamp}-${index}`}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "baseline" }}>
              <FontAwesome
                name={item.deleted ? "trash" : "pencil"}
                size={theme.fontSize}
                color={item.deleted ? "red" : "green"}
              />
              <View style={{ flexGrow: 1 }} />
              <Text style={theme.secondaryTextStyle}>
                {new Date(item.timestamp).toLocaleString()}
              </Text>
            </View>
            <View style={{ gap: 2 }}>
              <Text style={[theme.secondaryTextStyle, { fontWeight: "bold" }]}>
                {t`Contact name`}
              </Text>
              <Text style={theme.textStyle}>{item.name}</Text>
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <FontAwesome
                name="mobile"
                size={theme.fontSize * 2}
                color={theme.secondaryTextColor}
              />
              <Text
                style={[
                  theme.secondaryTextStyle,
                  {
                    flexShrink: 1,
                    width: Platform.OS === "web" ? "90%" : undefined,
                  },
                ]}
              >
                {deviceIdToString(item.deviceId)}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <Text
            style={[
              theme.secondaryTextStyle,
              { textAlign: "center", paddingTop: 24, paddingHorizontal: 16 },
            ]}
          >
            {t`No changes yet`}
          </Text>
        )}
        refreshing={false}
        onRefresh={refreshECPQueries}
      />
    </Fragment>
  );
}
