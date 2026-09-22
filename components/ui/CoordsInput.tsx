import { useLingui } from "@lingui/react/macro";
import { Fragment, useState } from "react";
import { Dimensions, TextInput, View } from "react-native";
import { useTheme } from "../Theme";
import { GeoMap } from "./GeoMap";
import { ScreenLink } from "./ScreenLink";

export function CoordsInput({
  value,
  onChange,
}: {
  value: { latitude: number; longitude: number } | undefined;
  onChange(value: { latitude: number; longitude: number } | undefined): void;
}) {
  const theme = useTheme();
  const { t } = useLingui();

  const [showMap, setShowMap] = useState(false);

  return (
    <Fragment>
      <View style={{ flexDirection: "row" }}>
        <TextInput
          value={value?.latitude.toString() ?? ""}
          style={[
            theme.textInputStyle(value?.latitude.toString() ?? ""),
            { flex: 1, marginRight: 8, marginLeft: 16 },
          ]}
          readOnly
        />
        <TextInput
          value={value?.longitude.toString() ?? ""}
          style={[
            theme.textInputStyle(value?.longitude.toString() ?? ""),
            { flex: 1 },
          ]}
          readOnly
        />
        <ScreenLink
          to={async () => {
            setShowMap(!showMap);
          }}
          icon="map"
          hideLabel
          label={t`Show on map`}
        />
      </View>
      {showMap && (
        <View
          style={{
            width: Dimensions.get("window").width,
            height: Math.min(Dimensions.get("window").width, 400),
          }}
        >
          <GeoMap currentLocation={value} onSetLocation={onChange} />
        </View>
      )}
    </Fragment>
  );
}
