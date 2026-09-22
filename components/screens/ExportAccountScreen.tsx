import { useLingui } from "@lingui/react/macro";
import * as Clipboard from "expo-clipboard";
import { Fragment, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { RefreshControl } from "react-native-web-refresh-control";
import { exportAccountSecret } from "../cryptography/accountBackup";
import { AccountId } from "../cryptography/cryptography";
import { getAccountSecret } from "../queries/accounts";
import { useEcpQuery, useRefreshEcpQueries } from "../store/dataApi";
import { useTheme } from "../Theme";
import { CryptoAvatar } from "../ui/CryptoAvatar";
import { ScreenLink } from "../ui/ScreenLink";
import { AccountScreen } from "./AccountScreen";

export function ExportAccountScreen({ accountId }: { accountId: AccountId }) {
  const { t } = useLingui();
  const theme = useTheme();
  const refreshECPQueries = useRefreshEcpQueries();

  const [passwordInput, setPasswordInput] = useState("");

  const accountSecret = useEcpQuery(getAccountSecret, { accountId });

  return (
    <Fragment>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <ScreenLink
          to={<AccountScreen accountId={accountId} />}
          icon="arrow-left"
          hideLabel
          label={t`Back to account screen`}
        />
        <CryptoAvatar accountId={accountId} contactId={accountId} />
        <Text
          style={[
            theme.textStyle,
            { fontWeight: "bold", paddingTop: 2, paddingLeft: 16 },
          ]}
        >
          {t`Export account`}
        </Text>
        <View style={{ flexGrow: 1 }} />
        <ScreenLink
          to={
            accountSecret
              ? async () => {
                  const exported = await exportAccountSecret(
                    accountSecret,
                    passwordInput,
                  );
                  await Clipboard.setStringAsync(exported);
                  if (Platform.OS === "web")
                    alert(t`Exported account secret copied to clipboard`);
                  else
                    Alert.alert(t`Exported account secret copied to clipboard`);
                  return <AccountScreen accountId={accountId} />;
                }
              : undefined
          }
          icon="upload"
          label={t`Confirm export`}
        />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refreshECPQueries} />
        }
      >
        <View style={{ gap: 8, paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={theme.secondaryTextStyle}>
            {t`You can send or store this exported text to import the account on other devices`}
          </Text>
          <Text style={[theme.textStyle, { fontWeight: "bold", color: "red" }]}>
            {t`Anyone who is able to import the secret will have full access to the account forever!`}
          </Text>
        </View>
        <View style={{ gap: 2, paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={[theme.secondaryTextStyle, { fontWeight: "bold" }]}>
            {t`Password`}
          </Text>
          <TextInput
            value={passwordInput}
            onChangeText={setPasswordInput}
            style={theme.textInputStyle(passwordInput)}
            placeholderTextColor={theme.secondaryTextColor}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t`Will be needed to import later`}
          />
          <Text
            style={[theme.textStyle, { color: "orange" }]}
          >{t`NOTE: every export has it's own password!`}</Text>
        </View>
      </ScrollView>
    </Fragment>
  );
}
