import { useLingui } from "@lingui/react/macro";
import { Fragment, useEffect, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { RefreshControl } from "react-native-web-refresh-control";
import { AccountId } from "../cryptography/cryptography";
import { getGroup, updateGroup } from "../queries/groups";
import {
  useEcpMutation,
  useEcpQuery,
  useRefreshEcpQueries,
} from "../store/dataApi";
import { useTheme } from "../Theme";
import { ScreenLink } from "../ui/ScreenLink";
import { GroupConversationScreen } from "./GroupConversationScreen";
import { GroupMessagesScreen } from "./GroupMessagesScreen";

export function GroupScreen({
  accountId,
  groupId,
}: {
  accountId: AccountId;
  groupId?: string; // TODO use branded type
}) {
  const { t } = useLingui();
  const theme = useTheme();
  const refreshECPQueries = useRefreshEcpQueries();

  const latest = useEcpQuery(getGroup, {
    accountId,
    groupId: groupId || "",
  }) ?? { name: "" };

  const update = useEcpMutation(updateGroup);

  const [groupIdInput, setContactIdInput] = useState("");
  const isGroupIdValid = !groupId ? groupIdInput.length > 5 : true; // TODO

  const [nameInput, setNameInput] = useState("");
  const nameOriginal = latest.name;
  useEffect(() => {
    setNameInput(nameOriginal);
  }, [nameOriginal]);

  const canSave = isGroupIdValid && nameInput !== nameOriginal;

  return (
    <Fragment>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <ScreenLink
          to={
            !canSave && groupId ? (
              <GroupConversationScreen
                accountId={accountId}
                groupId={groupId}
              />
            ) : undefined
          }
          icon="arrow-left"
          hideLabel
          label={t`Go to conversation`}
        />
        <View style={{ flexDirection: "row" }}>
          <ScreenLink
            to={
              !canSave && groupId !== undefined
                ? async () => {
                    await update({
                      accountId,
                      groupId,
                      name: nameOriginal,
                      deleted: true,
                    });
                    return <GroupMessagesScreen accountId={accountId} />;
                  }
                : undefined
            }
            icon="trash"
            hideLabel
            label={t`Delete contact`}
          />
          <ScreenLink
            to={
              canSave && groupId !== undefined
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
                    if (groupId) {
                      await update({
                        accountId,
                        groupId,
                        name: nameInput,
                        deleted: false,
                      });
                    } else {
                      await update({
                        accountId,
                        groupId: groupIdInput,
                        name: nameInput,
                        deleted: false,
                      });
                      return (
                        <GroupScreen
                          accountId={accountId}
                          groupId={groupIdInput}
                        />
                      );
                    }
                  }
                : undefined
            }
            icon="save"
            hideLabel
            label={groupId ? t`Save changes` : t`Create contact`}
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
        <View style={{ gap: 2, paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={theme.secondaryTextStyle}>{t`Group id`}</Text>
          {groupId ? (
            <Text style={theme.textStyle}>{groupId}</Text>
          ) : (
            <Fragment>
              <TextInput
                value={groupIdInput}
                onChangeText={setContactIdInput}
                style={theme.textInputStyle(groupIdInput)}
                placeholderTextColor={theme.secondaryTextColor}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {!isGroupIdValid ? (
                <Text style={theme.validationErrorTextStyle}>
                  {t`Not a valid group id`}
                </Text>
              ) : null}
            </Fragment>
          )}
        </View>
        <View style={{ gap: 2, paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={theme.secondaryTextStyle}>{t`Group name`}</Text>
          <TextInput
            value={nameInput}
            onChangeText={setNameInput}
            style={theme.textInputStyle(nameInput)}
            placeholderTextColor={theme.secondaryTextColor}
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
        </View>
      </ScrollView>
    </Fragment>
  );
}
