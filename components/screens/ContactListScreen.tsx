import { useLingui } from "@lingui/react/macro";
import { Fragment, useEffect, useMemo, useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";
import { AccountId } from "../cryptography/cryptography";
import {
  getContactList,
  getContactListMembers,
  updateContactList,
  updateContactListMembership,
} from "../queries/contactList";
import { getContacts } from "../queries/contacts";
import { nowTimestamp, Timestamp } from "../queries/Timestamp";
import {
  useEcpMutation,
  useEcpQuery,
  useRefreshEcpQueries,
} from "../store/dataApi";
import { useTheme } from "../Theme";
import { CryptoAvatar } from "../ui/CryptoAvatar";
import { ScreenLink } from "../ui/ScreenLink";
import { DirectMessagesScreen } from "./DirectMessagesScreen";

export function ContactListScreen({
  accountId,
  createdAt,
}: {
  accountId: AccountId;
  createdAt?: Timestamp;
}) {
  const { t } = useLingui();
  const theme = useTheme();
  const refreshECPQueries = useRefreshEcpQueries();

  const latest = useEcpQuery(getContactList, { accountId, createdAt });

  const update = useEcpMutation(updateContactList);

  const [nameInput, setNameInput] = useState("");
  const nameOriginal = latest?.name ?? "";
  useEffect(() => {
    setNameInput(nameOriginal);
  }, [nameOriginal]);

  const canSave = nameInput !== nameOriginal && nameInput.trim() !== "";

  const contacts = useEcpQuery(getContacts, { accountId });
  const members = useEcpQuery(getContactListMembers, {
    accountId,
    createdAt,
  });
  const updateMembership = useEcpMutation(updateContactListMembership);

  const [searchText, setSearchText] = useState("");
  const normalizedSearchText = searchText.trim().toLowerCase();
  const memberContacts = useMemo(
    () => contacts.filter((contact) => members.includes(contact.contactId)),
    [contacts, members],
  );
  const nonMemberContacts = useMemo(
    () => contacts.filter((contact) => !members.includes(contact.contactId)),
    [contacts, members],
  );
  const visibleContacts = useMemo(() => {
    if (normalizedSearchText) {
      return contacts.filter((contact) =>
        contact.name.toLowerCase().includes(normalizedSearchText),
      );
    }
    return [...memberContacts, ...nonMemberContacts];
  }, [contacts, memberContacts, nonMemberContacts, normalizedSearchText]);

  return (
    <Fragment>
      <View style={{ flexDirection: "row" }}>
        <ScreenLink
          to={
            <DirectMessagesScreen
              accountId={accountId}
              contactListCreatedAt={createdAt}
            />
          }
          icon="arrow-left"
          hideLabel
          label={t`Back to contact lists`}
        />
        <View style={{ flex: 1 }} />
        {createdAt && (
          <ScreenLink
            to={
              !canSave
                ? async () => {
                    await update({
                      accountId,
                      createdAt,
                      name: nameOriginal,
                      deleted: true,
                    });
                    return <DirectMessagesScreen accountId={accountId} />;
                  }
                : undefined
            }
            icon="trash"
            hideLabel
            label={t`Delete contact list`}
          />
        )}
        {createdAt && (
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
            canSave
              ? createdAt
                ? async () => {
                    await update({
                      accountId,
                      createdAt,
                      name: nameInput,
                      deleted: false,
                    });
                  }
                : async () => {
                    const newCreatedAt = nowTimestamp();
                    await update({
                      accountId,
                      createdAt: newCreatedAt,
                      name: nameInput,
                      deleted: false,
                    });
                    return (
                      <ContactListScreen
                        accountId={accountId}
                        createdAt={newCreatedAt}
                      />
                    );
                  }
              : undefined
          }
          icon="save"
          hideLabel
          label={createdAt ? t`Save changes` : t`Create contact list`}
        />
      </View>
      <View style={{ gap: 2, paddingHorizontal: 16, paddingVertical: 8 }}>
        <Text style={theme.secondaryTextStyle}>{t`Contact list name`}</Text>
        <TextInput
          value={nameInput}
          onChangeText={setNameInput}
          style={theme.textInputStyle(nameInput)}
          placeholderTextColor={theme.secondaryTextColor}
          placeholder={t`Enter a name for this contact list`}
        />
        {nameInput !== nameOriginal && nameOriginal ? (
          <Text
            style={[
              theme.secondaryTextStyle,
              { textDecorationLine: "line-through" },
            ]}
          >
            {nameOriginal}
          </Text>
        ) : null}
      </View>
      {createdAt && (
        <Fragment>
          <View
            style={{
              flexDirection: "row",
              gap: 24,
              paddingHorizontal: 16,
              alignItems: "center",
              marginTop: 16,
            }}
          >
            <View style={{ paddingBottom: 8, gap: 2, flexGrow: 1 }}>
              <Text style={theme.secondaryTextStyle}>{t`Members`}</Text>
              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                style={theme.textInputStyle(searchText)}
                placeholderTextColor={theme.secondaryTextColor}
                placeholder={t`Search contacts`}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <Text style={theme.textStyle}>{memberContacts.length}</Text>
          </View>
          <FlatList
            data={visibleContacts}
            keyExtractor={(item) => item.contactId}
            renderItem={({ item }) => {
              const isMember = members.includes(item.contactId);
              return (
                <View
                  style={{
                    paddingVertical: 8,
                    paddingLeft: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <CryptoAvatar
                    accountId={accountId}
                    contactId={item.contactId}
                  />
                  <Text style={[theme.textStyle, { flex: 1 }]}>
                    {item.name}
                  </Text>
                  <ScreenLink
                    to={async () => {
                      await updateMembership({
                        accountId,
                        createdAt,
                        contactId: item.contactId,
                        isMember: !isMember,
                      });
                    }}
                    icon={isMember ? "check-square-o" : "square-o"}
                    hideLabel
                    label={
                      isMember
                        ? t`Remove contact from list`
                        : t`Add contact to list`
                    }
                  />
                </View>
              );
            }}
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            ListEmptyComponent={
              <Text
                style={[
                  theme.secondaryTextStyle,
                  { textAlign: "center", paddingVertical: 16 },
                ]}
              >
                {normalizedSearchText ? t`No results found` : t`No contacts`}
              </Text>
            }
            refreshing={false}
            onRefresh={refreshECPQueries}
          />
        </Fragment>
      )}
    </Fragment>
  );
}
