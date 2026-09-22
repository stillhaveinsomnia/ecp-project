import { Fragment, useState } from "react";
import { Text, View } from "react-native";
import { AccountId } from "../cryptography/cryptography";
import { getBiographies } from "../queries/biography";
import { useEcpQuery } from "../store/dataApi";
import { useTheme } from "../Theme";
import { BottomTabNavigation } from "../ui/BottomTabNavigation";
import { GeoMap } from "../ui/GeoMap";

export function PlacesScreen({ accountId }: { accountId: AccountId }) {
  const theme = useTheme();

  const places = useEcpQuery(getBiographies, { accountId });

  const pins = places
    .filter((place) => place.location !== undefined)
    .map((place) => ({ id: place.contactId, ...place.location! }));

  const [currentPlaceId, setCurrentPlaceId] = useState("");

  const currentPlace = places.find(
    (place) => place.contactId === currentPlaceId,
  );

  return (
    <Fragment>
      <View style={{ flexGrow: 1 }}>
        <GeoMap pins={pins} onPinPress={setCurrentPlaceId} />
      </View>
      <View style={{ flexGrow: 1 }}>
        <Text
          style={[
            theme.textStyle,
            { fontWeight: "bold", paddingHorizontal: 16 },
          ]}
        >
          {currentPlace?.contactName}
        </Text>
        <Text style={[theme.textStyle, { paddingHorizontal: 16 }]}>
          {currentPlace?.content}
        </Text>
      </View>
      <BottomTabNavigation accountId={accountId} enabled={true} />
    </Fragment>
  );
}
