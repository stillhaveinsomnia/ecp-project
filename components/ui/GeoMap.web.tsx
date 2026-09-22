import { FontAwesome } from "@expo/vector-icons";
import { Map, Marker } from "@vis.gl/react-maplibre";
import * as ExpoLocation from "expo-location";
import { isEqual } from "lodash";
// @ts-ignore
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useTheme } from "../Theme";

export function GeoMap({
  currentLocation,
  onSetLocation,
  pins,
  onPinPress,
}: {
  currentLocation?: { latitude: number; longitude: number };
  onSetLocation?(
    position: { latitude: number; longitude: number } | undefined,
  ): void;
  pins?: Array<{ id: string; latitude: number; longitude: number }>;
  onPinPress?(id: string): void;
}) {
  const theme = useTheme();

  useEffect(() => {
    void ExpoLocation.requestForegroundPermissionsAsync();
  }, []);

  const [userLocation, setUserLocation] =
    useState<ExpoLocation.LocationObject | null>(null);
  const [shouldFollow, setShouldFollow] = useState(true);

  useEffect(() => {
    let subscription: ExpoLocation.LocationSubscription | null = null;
    void ExpoLocation.watchPositionAsync({}, (location) => {
      setUserLocation(location);
    }).then((locationSubscription) => {
      subscription = locationSubscription;
    });
    return () => {
      subscription?.remove();
    };
  }, []);

  const [viewState, setViewState] = useState({
    longitude: 0,
    latitude: 0,
    zoom: 0,
  });

  return (
    <View style={{ flexGrow: 1, position: "relative" }}>
      <Map
        style={{ width: "100%", height: "100%", position: "absolute" }}
        mapStyle={"https://tiles.openfreemap.org/styles/liberty"}
        attributionControl={false}
        {...viewState}
        onMove={({ viewState }) => {
          setViewState(viewState);
          setShouldFollow(false);
        }}
      >
        {userLocation && (
          <Marker
            key="currentLocation"
            longitude={userLocation.coords.longitude}
            latitude={userLocation.coords.latitude}
            anchor="center"
          >
            <FontAwesome name="dot-circle-o" size={40} color={"blue"} />
          </Marker>
        )}
        {currentLocation && (
          <Marker
            key="currentLocation"
            longitude={currentLocation.longitude}
            latitude={currentLocation.latitude}
            anchor="bottom"
          >
            <FontAwesome name="map-marker" size={40} color={"red"} />
          </Marker>
        )}
        {pins?.map((pin) => (
          <Marker
            key={pin.id}
            longitude={pin.longitude}
            latitude={pin.latitude}
            anchor="bottom"
            onClick={() => {
              onPinPress?.(pin.id);
            }}
          >
            <FontAwesome name="map-marker" size={40} color={"red"} />
          </Marker>
        ))}
      </Map>
      <Pressable
        onPress={() => {
          if (shouldFollow) {
            setShouldFollow(false);
          } else {
            setShouldFollow(true);
            if (userLocation) {
              setViewState((viewState) => ({
                ...viewState,
                longitude: userLocation.coords.longitude,
                latitude: userLocation.coords.latitude,
              }));
            }
          }
        }}
        style={{
          position: "absolute",
          bottom: 8,
          right: 8,
          width: 32,
          height: 32,
          backgroundColor: theme.backgroundColor,
          borderRadius: "100%",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <FontAwesome
          name="crosshairs"
          size={32}
          color={shouldFollow ? theme.linkTextColor : theme.secondaryTextColor}
        />
      </Pressable>
      {onSetLocation && (
        <View style={{ position: "absolute", top: "50%", left: "50%" }}>
          <View style={{ position: "relative" }}>
            <FontAwesome
              name="map-marker"
              color={"blue"}
              size={40}
              style={{ position: "absolute", top: -40, left: -11 }}
              onPress={() => {
                onSetLocation(
                  currentLocation &&
                    isEqual(
                      [viewState.longitude, viewState.latitude],
                      [currentLocation.longitude, currentLocation.latitude],
                    )
                    ? undefined
                    : {
                        longitude: viewState.longitude,
                        latitude: viewState.latitude,
                      },
                );
              }}
            />
          </View>
        </View>
      )}
    </View>
  );
}
