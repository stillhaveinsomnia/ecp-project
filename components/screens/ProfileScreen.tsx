import { useLingui } from "@lingui/react/macro";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { Fragment, useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { RefreshControl } from "react-native-web-refresh-control";
import QRCode from "react-qr-code";
import { AccountId } from "../cryptography/cryptography";
import { getBiography, updateBiography } from "../queries/biography";
import { getContact } from "../queries/contacts";
import {
  useEcpMutation,
  useEcpQuery,
  useRefreshEcpQueries,
} from "../store/dataApi";
import { useTheme } from "../Theme";
import { BottomTabNavigation } from "../ui/BottomTabNavigation";
import { CoordsInput } from "../ui/CoordsInput";
import { CryptoAvatar } from "../ui/CryptoAvatar";
import { ScreenLink } from "../ui/ScreenLink";
import { AccountScreen } from "./AccountScreen";
import { ContactScreen } from "./ContactScreen";
import { DirectConversationScreen } from "./DirectConversationScreen";

function createDeepLink(accountId: AccountId) {
  return `ecp://profile/${accountId}`;
}

export function ProfileScreen({
  accountId,
  contactId,
}: {
  accountId: AccountId;
  contactId: AccountId;
}) {
  const theme = useTheme();
  const { t } = useLingui();
  const refreshECPQueries = useRefreshEcpQueries();

  const contact = useEcpQuery(getContact, { accountId, contactId }) ?? {
    name: "",
  };

  const biography = useEcpQuery(getBiography, { accountId: contactId }) ?? {
    content: "",
    location: undefined,
  };

  const update = useEcpMutation(updateBiography);

  const bioOriginal = biography.content;
  const [bioInput, setBioInput] = useState(bioOriginal);
  useEffect(() => {
    setBioInput(bioOriginal);
  }, [bioOriginal]);

  const locationOriginal = biography.location;
  const [locationInput, setLocationInput] = useState(locationOriginal);
  useEffect(() => {
    setLocationInput(locationOriginal);
  }, [locationOriginal]);

  const canSave =
    bioInput !== bioOriginal || locationInput !== locationOriginal;

  const [qrVisible, setQrVisible] = useState(false);

  return (
    <Fragment>
      <View
        style={{ flexDirection: "row", alignItems: "center", paddingLeft: 16 }}
      >
        <CryptoAvatar accountId={accountId} contactId={contactId} />
        <Text
          style={[
            theme.textStyle,
            { fontWeight: "bold", flexGrow: 1, paddingLeft: 8, paddingTop: 6 },
          ]}
        >
          {contact.name}
        </Text>
        <ScreenLink
          to={async () => {
            setQrVisible(true);
          }}
          icon="qrcode"
          hideLabel
          label={t`Show QR code`}
        />
        <Modal visible={qrVisible} transparent animationType="fade">
          <Pressable
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#000000cc",
            }}
            onPress={() => setQrVisible(false)}
          >
            <View
              style={{
                backgroundColor: "#ffffff",
                padding: 16,
                borderRadius: 8,
              }}
            >
              <View style={{ position: "relative" }}>
                <QRCode
                  value={createDeepLink(contactId)}
                  size={240}
                  level="H"
                />
                <View
                  style={{
                    position: "absolute",
                    top: (240 - 72) / 2,
                    left: (240 - 72) / 2,
                    width: 72,
                    height: 72,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Image
                    source={require("../../assets/images/icon.png")}
                    style={{ width: 64, height: 64 }}
                  />
                </View>
              </View>
            </View>
          </Pressable>
        </Modal>
        <ScreenLink
          to={async () => {
            if (Platform.OS === "web") {
              await Clipboard.setStringAsync(createDeepLink(contactId));
              alert(t`Profile ID copied to clipboard`);
            } else {
              await Share.share({ message: createDeepLink(contactId) });
            }
          }}
          icon="share-alt"
          hideLabel
          label={t`Share profile`}
        />
        {contactId === accountId && (
          <Fragment>
            <ScreenLink
              to={
                canSave
                  ? async () => {
                      setBioInput(bioOriginal);
                      setLocationInput(locationOriginal);
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
                      await update({
                        accountId,
                        location: locationInput,
                        content: bioInput,
                      });
                    }
                  : undefined
              }
              icon="save"
              hideLabel
              label={contactId ? t`Save changes` : t`Create contact`}
            />
          </Fragment>
        )}
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refreshECPQueries} />
        }
      >
        <View style={{ gap: 2, paddingVertical: 8 }}>
          <Text style={[theme.secondaryTextStyle, { paddingHorizontal: 16 }]}>
            {t`Location`}
          </Text>
          <CoordsInput value={locationInput} onChange={setLocationInput} />
        </View>
        <View style={{ gap: 2, paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={theme.secondaryTextStyle}>{t`Biography`}</Text>
          {contactId === accountId ? (
            <TextInput
              value={bioInput}
              onChangeText={setBioInput}
              style={[theme.textInputStyle(bioInput), { maxHeight: "100%" }]}
              placeholderTextColor={theme.secondaryTextColor}
              multiline
            />
          ) : (
            <Text style={[theme.textStyle, { paddingHorizontal: 16 }]}>
              {biography.content}
            </Text>
          )}
        </View>
      </ScrollView>
      <ScreenLink
        to={
          canSave ? undefined : (
            <DirectConversationScreen
              accountId={accountId}
              contactId={contactId}
            />
          )
        }
        label={t`Direct messages`}
      />

      <ScreenLink
        to={
          canSave ? undefined : (
            <ContactScreen accountId={accountId} contactId={contactId} />
          )
        }
        label={t`Edit contact`}
      />
      {accountId === contactId && (
        <ScreenLink
          to={canSave ? undefined : <AccountScreen accountId={accountId} />}
          label={t`Account settings`}
        />
      )}
      {contactId === accountId ? (
        <BottomTabNavigation accountId={accountId} enabled={!canSave} />
      ) : null}
    </Fragment>
  );
}
