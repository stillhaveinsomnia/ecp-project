import { FontAwesome } from "@expo/vector-icons";
import {
  Camera,
  CameraRef,
  Location,
  MapView,
  MapViewRef,
  PointAnnotation,
  UserLocation,
} from "@maplibre/maplibre-react-native";
import * as ExpoLocation from "expo-location";
import { isEqual } from "lodash";
import { useEffect, useRef, useState } from "react";
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

  const mapRef = useRef<MapViewRef>(null);
  const cameraRef = useRef<CameraRef>(null);
  const mapCenterRef = useRef<[number, number]>([0, 0]);

  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [shouldFollow, setShouldFollow] = useState(true);

  const [cameraCoords, setCameraCoords] = useState<[number, number]>([0, 0]);
  const [cameraZoom, setCameraZoom] = useState(0);

  return (
    <View style={{ flexGrow: 1, position: "relative" }}>
      <MapView
        ref={mapRef}
        style={{ width: "100%", height: "100%", position: "absolute" }}
        mapStyle={"https://tiles.openfreemap.org/styles/liberty"}
        attributionEnabled={false}
        compassEnabled
        localizeLabels
        pitchEnabled
        onRegionWillChange={(payload) => {
          setCameraCoords(payload.geometry.coordinates as [number, number]);
          setCameraZoom(payload.properties.zoomLevel);
        }}
        onRegionIsChanging={(payload) => {
          if (payload.properties.isUserInteraction) {
            setShouldFollow(false);
          }
          mapCenterRef.current = payload.geometry.coordinates as [
            number,
            number,
          ];
        }}
      >
        <UserLocation
          visible
          showsUserHeadingIndicator
          onUpdate={(location) => {
            setUserLocation(location);
            if (shouldFollow) {
              cameraRef.current?.setCamera({
                centerCoordinate: [
                  location.coords.longitude,
                  location.coords.latitude,
                ],
                animationDuration: 1000,
              });
            }
          }}
        />
        <Camera
          ref={cameraRef}
          zoomLevel={cameraZoom}
          centerCoordinate={cameraCoords}
        />
        {currentLocation && (
          <PointAnnotation
            id="currentLocation"
            coordinate={[currentLocation.longitude, currentLocation.latitude]}
            anchor={{ x: 0.5, y: 1.0 }}
          >
            <FontAwesome name="map-marker" size={40} color={"red"} />
          </PointAnnotation>
        )}
        {pins?.map((pin) => (
          <PointAnnotation
            key={pin.id}
            id={pin.id}
            coordinate={[pin.longitude, pin.latitude]}
            anchor={{ x: 0.5, y: 1.0 }}
            onSelected={() => {
              onPinPress?.(pin.id);
            }}
          >
            <FontAwesome name="map-marker" size={40} color={"red"} />
          </PointAnnotation>
        ))}
      </MapView>
      <Pressable
        onPress={() => {
          if (shouldFollow) {
            setShouldFollow(false);
          } else {
            setShouldFollow(true);
            if (userLocation) {
              cameraRef.current?.setCamera({
                animationDuration: 1000,
                centerCoordinate: [
                  userLocation.coords.longitude,
                  userLocation.coords.latitude,
                ],
              });
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
                    isEqual(mapCenterRef.current, [
                      currentLocation.longitude,
                      currentLocation.latitude,
                    ])
                    ? undefined
                    : {
                        longitude: mapCenterRef.current[0],
                        latitude: mapCenterRef.current[1],
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
