import { useLingui } from "@lingui/react/macro";
import * as Clipboard from "expo-clipboard";
import { Fragment, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { RefreshControl } from "react-native-web-refresh-control";
import {
  AccountId,
  accountIdFromAccountSecret,
  generateAccountSecret,
} from "../cryptography/cryptography";
import { addAccount, getDeviceId, removeAccount } from "../queries/accounts";
import { getContact, updateContact } from "../queries/contacts";
import {
  useEcpMutation,
  useEcpQuery,
  useRefreshEcpQueries,
} from "../store/dataApi";
import { useTheme } from "../Theme";
import { CryptoAvatar } from "../ui/CryptoAvatar";
import { ScreenLink } from "../ui/ScreenLink";
import { ExportAccountScreen } from "./ExportAccountScreen";
import { ProfileScreen } from "./ProfileScreen";
import { SelectAccountScreen } from "./SelectAccountScreen";

export function AccountScreen({ accountId }: { accountId?: AccountId }) {
  const { t } = useLingui();
  const theme = useTheme();
  const refreshECPQueries = useRefreshEcpQueries();

  const latest = useEcpQuery(getContact, {
    accountId: accountId,
    contactId: accountId,
  }) ?? { name: "" };

  const add = useEcpMutation(addAccount);

  const update = useEcpMutation(updateContact);

  const remove = useEcpMutation(removeAccount);

  const nameOriginal = latest.name;
  const [nameInput, setNameInput] = useState("");
  useEffect(() => {
    setNameInput(nameOriginal);
  }, [nameOriginal]);

  const canSave = nameInput !== nameOriginal;

  const deviceId = useEcpQuery(getDeviceId, { accountId });

  const [newAccountSecret, setNewAccountSecret] = useState(
    generateAccountSecret,
  );
  const newAccountId = accountIdFromAccountSecret(newAccountSecret);

  return (
    <Fragment>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <ScreenLink
          to={!canSave ? <SelectAccountScreen /> : undefined}
          label={t`Use another account`}
        />
        <View style={{ flexDirection: "row" }}>
          <ScreenLink
            to={
              canSave
                ? async () => {
                    setNameInput(nameOriginal);
                  }
                : undefined
            }
            icon="undo"
            hideLabel
            label={t`Discard changes`}
          />
          <ScreenLink
            to={
              canSave
                ? async () => {
                    if (accountId) {
                      await update({
                        accountId,
                        contactId: accountId,
                        name: nameInput,
                        deleted: false,
                      });
                    } else {
                      await add({
                        accountSecret: newAccountSecret,
                        name: nameInput,
                      });
                      return (
                        <ProfileScreen
                          accountId={newAccountId}
                          contactId={newAccountId}
                        />
                      );
                    }
                  }
                : undefined
            }
            icon="save"
            hideLabel
            label={accountId ? t`Save changes` : t`Create account`}
          />
        </View>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refreshECPQueries} />
        }
      >
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 16,
            paddingVertical: 8,
            gap: 8,
          }}
        >
          <Pressable
            onPress={() => {
              setNewAccountSecret(generateAccountSecret());
            }}
          >
            <CryptoAvatar
              accountId={accountId ?? newAccountId}
              contactId={accountId ?? newAccountId}
            />
          </Pressable>
          {!accountId && (
            <View style={{ flex: 1 }}>
              <Text
                style={[theme.textStyle, { flex: 1 }]}
              >{t`This will your avatar forever, choose wisely`}</Text>
              <Text style={theme.secondaryTextStyle}>{t`Tap to change`}</Text>
            </View>
          )}
        </View>
        <View style={{ gap: 2, paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text
            style={[theme.secondaryTextStyle, { fontWeight: "bold" }]}
          >{t`Account name`}</Text>
          <TextInput
            value={nameInput}
            onChangeText={setNameInput}
            style={theme.textInputStyle(nameInput)}
            placeholderTextColor={theme.secondaryTextColor}
            aria-label={t`Account name`}
          />
          {nameInput !== nameOriginal ? (
            <Text
              style={[
                theme.secondaryTextStyle,
                { textDecorationLine: "line-through" },
              ]}
            >
              {nameOriginal || " "}
            </Text>
          ) : null}
          {!accountId && (
            <Text style={theme.secondaryTextStyle}>
              {t`This name is only visible to you on this device`}
            </Text>
          )}
        </View>
        {accountId && (
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <View
              style={{
                gap: 2,
                paddingHorizontal: 16,
                paddingVertical: 8,
                flex: 1,
              }}
            >
              <Text
                style={[theme.secondaryTextStyle, { fontWeight: "bold" }]}
              >{t`Account ID`}</Text>
              <Text style={theme.textStyle}>{accountId}</Text>
            </View>
            <ScreenLink
              to={
                accountId
                  ? async () => {
                      await Clipboard.setStringAsync(accountId);
                    }
                  : undefined
              }
              icon="copy"
              hideLabel
              label={t`Copy account id to clipboard`}
            />
          </View>
        )}
        {accountId && (
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <View
              style={{
                gap: 2,
                paddingHorizontal: 16,
                paddingVertical: 8,
                flex: 1,
              }}
            >
              <Text
                style={[theme.secondaryTextStyle, { fontWeight: "bold" }]}
              >{t`Device ID`}</Text>
              <Text style={theme.textStyle}>{deviceId}</Text>
            </View>
            <ScreenLink
              to={
                deviceId
                  ? async () => {
                      await Clipboard.setStringAsync(deviceId);
                    }
                  : undefined
              }
              icon="copy"
              hideLabel
              label={t`Copy device id to clipboard`}
            />
          </View>
        )}
        {accountId && (
          <ScreenLink
            to={
              !canSave ? (
                <ExportAccountScreen accountId={accountId} />
              ) : undefined
            }
            icon="upload"
            label={t`Export account`}
          />
        )}
        {accountId && (
          // TODO open modal explaining what is gonna happen
          // TODO make it hard to delete account accidnetally
          <ScreenLink
            to={
              !canSave && deviceId !== undefined
                ? async () => {
                    await remove({ accountId });
                    return <SelectAccountScreen />;
                  }
                : undefined
            }
            icon="trash"
            label={t`Remove account from this device`}
          />
        )}
      </ScrollView>
      <ScreenLink
        to={
          !canSave && accountId ? (
            <ProfileScreen accountId={accountId} contactId={accountId} />
          ) : undefined
        }
        label={t`Profile`}
      />
    </Fragment>
  );
}
