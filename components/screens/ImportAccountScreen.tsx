import { useLingui } from "@lingui/react/macro";
import { Fragment, useState } from "react";
import { Alert, ScrollView, Text, TextInput, View } from "react-native";
import { RefreshControl } from "react-native-web-refresh-control";
import { importAccountSecret } from "../cryptography/accountBackup";
import { accountIdFromAccountSecret } from "../cryptography/cryptography";
import { addAccount } from "../queries/accounts";
import { useEcpMutation, useRefreshEcpQueries } from "../store/dataApi";
import { useTheme } from "../Theme";
import { ScreenLink } from "../ui/ScreenLink";
import { ProfileScreen } from "./ProfileScreen";
import { SelectAccountScreen } from "./SelectAccountScreen";

export function ImportAccountScreen() {
  const { t } = useLingui();
  const theme = useTheme();
  const refreshECPQueries = useRefreshEcpQueries();

  const add = useEcpMutation(addAccount);

  const [nameInput, setNameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [encryptedInput, setEncryptedInput] = useState("");

  const canImport = nameInput.trim().length > 0;

  return (
    <Fragment>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <ScreenLink
          to={<SelectAccountScreen />}
          icon="arrow-left"
          hideLabel
          label={t`Back to account selection`}
        />
        <Text style={[theme.textStyle, { fontWeight: "bold", paddingTop: 2 }]}>
          {t`Import account`}
        </Text>
        <View style={{ flexGrow: 1 }} />
        <ScreenLink
          to={
            canImport
              ? async () => {
                  try {
                    const accountSecret = await importAccountSecret(
                      encryptedInput,
                      passwordInput,
                    );
                    const accountId = accountIdFromAccountSecret(accountSecret);
                    await add({
                      accountSecret: accountSecret,
                      name: nameInput,
                    });
                    return (
                      <ProfileScreen
                        accountId={accountId}
                        contactId={accountId}
                      />
                    );
                  } catch {
                    Alert.alert(t`Invalid account secret or password`);
                    return;
                  }
                }
              : undefined
          }
          icon="check"
          label={t`Confirm import`}
        />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refreshECPQueries} />
        }
      >
        <View style={{ gap: 2, paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={[theme.secondaryTextStyle, { fontWeight: "bold" }]}>
            {t`Account name`}
          </Text>
          <TextInput
            value={nameInput}
            onChangeText={setNameInput}
            style={theme.textInputStyle(nameInput)}
            placeholderTextColor={theme.secondaryTextColor}
            placeholder={t`This name is only visible to you on this device`}
          />
        </View>
        <View style={{ gap: 2, paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={[theme.secondaryTextStyle, { fontWeight: "bold" }]}>
            {t`Export password`}
          </Text>
          <TextInput
            value={passwordInput}
            onChangeText={setPasswordInput}
            style={theme.textInputStyle(passwordInput)}
            placeholderTextColor={theme.secondaryTextColor}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t`The one you typed in during export`}
          />
        </View>
        <View style={{ gap: 2, paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={[theme.secondaryTextStyle, { fontWeight: "bold" }]}>
            {t`Exported account secret`}
          </Text>
          <TextInput
            value={encryptedInput}
            onChangeText={setEncryptedInput}
            style={theme.textInputStyle(encryptedInput)}
            placeholderTextColor={theme.secondaryTextColor}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t`Paste here exported account secret`}
          />
        </View>
      </ScrollView>
    </Fragment>
  );
}
