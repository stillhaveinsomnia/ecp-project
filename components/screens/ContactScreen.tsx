import { useLingui } from "@lingui/react/macro";
import { Fragment, useEffect, useMemo, useState } from "react";
import { FlatList, ScrollView, Text, TextInput, View } from "react-native";
import { RefreshControl } from "react-native-web-refresh-control";
import { AccountId, accountIdFromString } from "../cryptography/cryptography";
import {
  getContactListsForContact,
  updateContactListMembership,
} from "../queries/contactList";
import {
  getContact,
  getContactConnectedDevices,
  updateContact,
} from "../queries/contacts";
import {
  useEcpMutation,
  useEcpQuery,
  useRefreshEcpQueries,
} from "../store/dataApi";
import { useTheme } from "../Theme";
import { CryptoAvatar } from "../ui/CryptoAvatar";
import { ScreenLink } from "../ui/ScreenLink";
import { ContactChangesHistoryScreen } from "./ContactChangesHistoryScreen";
import { DirectConversationScreen } from "./DirectConversationScreen";
import { DirectMessagesScreen } from "./DirectMessagesScreen";
import { ProfileScreen } from "./ProfileScreen";

export function ContactScreen({
  accountId,
  contactId,
  openedFromDeepLinkWithContactId,
}: {
  accountId: AccountId;
  contactId?: AccountId;
  openedFromDeepLinkWithContactId?: AccountId;
}) {
  const { t } = useLingui();
  const theme = useTheme();
  const refreshECPQueries = useRefreshEcpQueries();

  const latest = useEcpQuery(getContact, { accountId, contactId }) ?? {
    name: "",
  };

  const update = useEcpMutation(updateContact);

  const [contactIdInput, setContactIdInput] = useState(
    openedFromDeepLinkWithContactId ?? "",
  );
  // TODO fix to accept deeplink
  const validContactIdInput = useMemo(
    () =>
      openedFromDeepLinkWithContactId ?? accountIdFromString(contactIdInput),
    [contactIdInput, openedFromDeepLinkWithContactId],
  );
  const [nameInput, setNameInput] = useState("");
  const nameOriginal = latest.name;
  useEffect(() => {
    setNameInput(nameOriginal);
  }, [nameOriginal]);

  const canSave =
    (contactId ? true : validContactIdInput) && nameInput !== nameOriginal;

  const connectedDevices = useEcpQuery(
    getContactConnectedDevices,
    { contactId: contactId },
    { refetchInterval: 1000 },
  );
  const contactLists = useEcpQuery(getContactListsForContact, {
    accountId,
    contactId,
  });
  const updateContactListMember = useEcpMutation(
    updateContactListMembership,
  );
  const [contactListSearchText, setContactListSearchText] = useState("");
  const normalizedContactListSearchText = contactListSearchText
    .trim()
    .toLowerCase();
  const visibleContactLists = useMemo(() => {
    if (normalizedContactListSearchText) {
      return contactLists.filter((item) =>
        item.name.toLowerCase().includes(normalizedContactListSearchText),
      );
    }
    const memberLists = contactLists.filter((item) => item.isMember);
    const nonMemberLists = contactLists.filter((item) => !item.isMember);
    return [...memberLists, ...nonMemberLists];
  }, [contactLists, normalizedContactListSearchText]);
  const memberContactListsCount = useMemo(
    () => contactLists.filter((item) => item.isMember).length,
    [contactLists],
  );

  return (
    <Fragment>
      <View style={{ flexDirection: "row" }}>
        {contactId === undefined && (
          <ScreenLink
            to={<DirectMessagesScreen accountId={accountId} />}
            icon="arrow-left"
            hideLabel
            label={t`Back to direct messages`}
          />
        )}
        <View style={{ flex: 1 }} />
        {contactId && (
          <ScreenLink
            to={
              <ContactChangesHistoryScreen
                accountId={accountId}
                contactId={contactId}
              />
            }
            icon="history"
            hideLabel
            label={t`Changes history`}
          />
        )}
        {contactId && (
          <ScreenLink
            to={
              !canSave
                ? async () => {
                    await update({
                      accountId,
                      contactId,
                      name: nameOriginal,
                      deleted: true,
                    });
                    return <DirectMessagesScreen accountId={accountId} />;
                  }
                : undefined
            }
            icon="trash"
            hideLabel
            label={t`Delete contact`}
          />
        )}
        {contactId && (
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
        )}
        <ScreenLink
          to={
            contactId
              ? canSave
                ? async () => {
                    await update({
                      accountId,
                      contactId,
                      name: nameInput,
                      deleted: false,
                    });
                  }
                : undefined
              : canSave && validContactIdInput
                ? async () => {
                    await update({
                      accountId,
                      contactId: validContactIdInput,
                      name: nameInput,
                      deleted: false,
                    });
                    return (
                      <ProfileScreen
                        accountId={accountId}
                        contactId={validContactIdInput}
                      />
                    );
                  }
                : undefined
          }
          icon="save"
          hideLabel
          label={contactId ? t`Save changes` : t`Create contact`}
        />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refreshECPQueries} />
        }
      >
        <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          <CryptoAvatar
            accountId={accountId}
            contactId={
              contactId ?? validContactIdInput ?? (contactIdInput as AccountId)
            }
          />
        </View>
        <View style={{ gap: 2, paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={theme.secondaryTextStyle}>{t`Contact account id`}</Text>
          {contactId ? (
            <Text style={theme.textStyle}>{contactId}</Text>
          ) : (
            <Fragment>
              <TextInput
                value={contactIdInput}
                onChangeText={setContactIdInput}
                style={theme.textInputStyle(contactIdInput)}
                placeholderTextColor={theme.secondaryTextColor}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={t`Paste the account id your contact shared with you`}
                multiline
              />
              {!validContactIdInput ? (
                <Text style={theme.validationErrorTextStyle}>
                  {t`Not a valid account id`}
                </Text>
              ) : null}
            </Fragment>
          )}
        </View>
        <View style={{ gap: 2, paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={theme.secondaryTextStyle}>{t`Contact name`}</Text>
          <TextInput
            value={nameInput}
            onChangeText={setNameInput}
            style={theme.textInputStyle(nameInput)}
            placeholderTextColor={theme.secondaryTextColor}
            placeholder={t`This name is only visible to you`}
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
        {contactId && (
          <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
            <Text style={theme.secondaryTextStyle}>{t`Connected devices`}</Text>
            {connectedDevices.map((deviceId) => (
              <Text key={deviceId} style={theme.textStyle}>
                {deviceId}
              </Text>
            ))}
            {connectedDevices.length === 0 && (
              <Text style={theme.textStyle}>{t`No connected devices`}</Text>
            )}
          </View>
        )}
        <Text
          style={[
            theme.textStyle,
            { paddingHorizontal: 16, paddingVertical: 8, color: "orange" },
          ]}
        >
          {t`It takes two. Add each other as contacts to start chatting!`}
        </Text>
        {contactId && (
          <Fragment>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 16 }}
            >
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  gap: 4,
                  flexGrow: 1,
                }}
              >
                <Text style={theme.secondaryTextStyle}>
                  {t`Member of contact lists`}
                </Text>
                <TextInput
                  value={contactListSearchText}
                  onChangeText={setContactListSearchText}
                  style={theme.textInputStyle(contactListSearchText)}
                  placeholderTextColor={theme.secondaryTextColor}
                  placeholder={t`Search contact lists`}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <Text style={[theme.textStyle, { paddingRight: 16 }]}>
                {memberContactListsCount}
              </Text>
            </View>
            <FlatList
              data={visibleContactLists}
              keyExtractor={(item) => String(item.createdAt)}
              style={{ maxHeight: 200 }}
              renderItem={({ item }) => (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 4,
                    paddingLeft: 16,
                  }}
                >
                  <Text style={[theme.textStyle, { flex: 1 }]}>
                    {item.name}
                  </Text>
                  <ScreenLink
                    to={async () => {
                      await updateContactListMember({
                        accountId,
                        createdAt: item.createdAt,
                        contactId,
                        isMember: !item.isMember,
                      });
                    }}
                    icon={item.isMember ? "check-square-o" : "square-o"}
                    hideLabel
                    label={
                      item.isMember
                        ? t`Remove from contact list`
                        : t`Add to contact list`
                    }
                  />
                </View>
              )}
              ListEmptyComponent={
                <Text
                  style={[
                    theme.secondaryTextStyle,
                    { marginHorizontal: 16, marginVertical: 8 },
                  ]}
                >
                  {normalizedContactListSearchText
                    ? t`No results found`
                    : t`No contact lists`}
                </Text>
              }
            />
          </Fragment>
        )}
      </ScrollView>
      {contactId !== undefined && (
        <ScreenLink
          to={
            !canSave ? (
              <DirectConversationScreen
                accountId={accountId}
                contactId={contactId}
              />
            ) : undefined
          }
          label={t`Direct messages`}
        />
      )}
      {contactId !== undefined && (
        <ScreenLink
          to={
            !canSave ? (
              <ProfileScreen accountId={accountId} contactId={contactId} />
            ) : undefined
          }
          label={t`Profile`}
        />
      )}
    </Fragment>
  );
}
