import { useLingui } from "@lingui/react/macro";
import { Fragment } from "react";
import { FlatList, Text, View } from "react-native";
import { AccountId } from "../cryptography/cryptography";
import { getAccounts } from "../queries/accounts";
import { useEcpQuery, useRefreshEcpQueries } from "../store/dataApi";
import { useTheme } from "../Theme";
import { CryptoAvatar } from "../ui/CryptoAvatar";
import { ScreenLink } from "../ui/ScreenLink";
import { ContactScreen } from "./ContactScreen";
import { SelectAccountScreen } from "./SelectAccountScreen";

export function ProfileDeepLinkScreen({
  contactId,
  onDone,
}: {
  contactId: AccountId;
  onDone(): void;
}) {
  const theme = useTheme();
  const { t } = useLingui();
  const refreshECPQueries = useRefreshEcpQueries();

  const accounts = useEcpQuery(getAccounts, undefined);

  return (
    <Fragment>
      <View style={{ flexDirection: "row", alignItems: "baseline" }}>
        <ScreenLink
          to={async () => {
            onDone();
            return <SelectAccountScreen />;
          }}
          icon="arrow-left"
          hideLabel
          label={t`Back`}
        />
        <Text style={[theme.textStyle, { fontWeight: "bold", paddingTop: 2 }]}>
          {t`Open profile`}
        </Text>
      </View>
      <View style={{ gap: 2, paddingHorizontal: 16, paddingVertical: 8 }}>
        <CryptoAvatar accountId={contactId} contactId={contactId} />
      </View>
      <View style={{ gap: 2, paddingHorizontal: 16, paddingVertical: 8 }}>
        <Text style={theme.secondaryTextStyle}>{t`Contact account id`}</Text>
        <Text style={theme.textStyle}>{contactId}</Text>
      </View>
      <Text
        style={[
          theme.textStyle,
          { paddingHorizontal: 16, paddingVertical: 8, fontWeight: "bold" },
        ]}
      >
        {t`Open with account`}
      </Text>
      <FlatList
        data={accounts}
        keyExtractor={(item) => item.accountId}
        renderItem={({ item }) => (
          <ScreenLink
            to={async () => {
              onDone();
              return (
                <ContactScreen
                  accountId={item.accountId}
                  openedFromDeepLinkWithContactId={contactId}
                />
              );
            }}
            styleOverride={{
              flexDirection: "row",
              paddingHorizontal: 8,
              gap: 8,
              marginVertical: 4,
            }}
          >
            <CryptoAvatar
              accountId={item.accountId}
              contactId={item.accountId}
            />
            <Text
              style={[
                theme.textStyle,
                {
                  color: theme.linkTextColor,
                  fontWeight: "bold",
                  paddingTop: 10,
                },
              ]}
            >
              {item.name}
            </Text>
          </ScreenLink>
        )}
        ListEmptyComponent={
          <Text
            style={[
              theme.secondaryTextStyle,
              { padding: 16, textAlign: "center" },
            ]}
          >
            {t`No accounts on this device`}
          </Text>
        }
        style={{ flex: 1 }}
        refreshing={false}
        onRefresh={refreshECPQueries}
      />
    </Fragment>
  );
}
