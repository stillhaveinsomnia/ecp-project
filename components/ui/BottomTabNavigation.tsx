import { useLingui } from "@lingui/react/macro";
import { View } from "react-native";
import { AccountId } from "../cryptography/cryptography";
import { ArticlesScreen } from "../screens/ArticlesScreen";
import { DirectMessagesScreen } from "../screens/DirectMessagesScreen";
import { EventsScreen } from "../screens/EventsScreen";
import { GroupMessagesScreen } from "../screens/GroupMessagesScreen";
import { MultimediaScreen } from "../screens/MultimediaScreen";
import { PlacesScreen } from "../screens/PlacesScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { ScreenLink } from "./ScreenLink";

export function BottomTabNavigation({
  accountId,
  enabled,
}: {
  accountId: AccountId;
  enabled: boolean;
}) {
  const { t } = useLingui();
  return (
    <View
      style={{ flexDirection: "row", justifyContent: "center", paddingTop: 8 }}
    >
      <ScreenLink
        to={
          enabled ? <DirectMessagesScreen accountId={accountId} /> : undefined
        }
        icon="inbox"
        hideLabel
        label={t`Direct messages`}
      />
      <ScreenLink
        to={enabled ? <GroupMessagesScreen accountId={accountId} /> : undefined}
        icon="group"
        hideLabel
        label={t`Group messages`}
      />
      <ScreenLink
        to={enabled ? <ArticlesScreen accountId={accountId} /> : undefined}
        icon="newspaper-o"
        hideLabel
        label="newspaper"
      />
      <ScreenLink
        to={enabled ? <MultimediaScreen accountId={accountId} /> : undefined}
        icon="film"
        hideLabel
        label={t`Multimedia`}
      />
      <ScreenLink
        to={enabled ? <EventsScreen accountId={accountId} /> : undefined}
        icon="calendar"
        hideLabel
        label={t`Events`}
      />
      <ScreenLink
        to={enabled ? <PlacesScreen accountId={accountId} /> : undefined}
        icon="map-marker"
        hideLabel
        label={t`Places`}
      />
      <ScreenLink
        to={
          enabled ? (
            <ProfileScreen accountId={accountId} contactId={accountId} />
          ) : undefined
        }
        icon="user"
        hideLabel
        label={t`Profile`}
      />
    </View>
  );
}
