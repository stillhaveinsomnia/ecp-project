import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: false,
  }),
});

async function setupNotificationChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}

const identifier = "ecp_has_something_for_you";

export async function triggerNotification() {
  if (Platform.OS !== "web") {
    const presented =
      (await Notifications.getPresentedNotificationsAsync()) ?? [];
    const alreadyPresent = presented.some(
      (notification) => notification.request.identifier === identifier,
    );
    if (!alreadyPresent) {
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: { title: "ECP" },
        trigger: null,
      });
    }
  }
}

export async function registerForPushNotificationsAsync() {
  await setupNotificationChannel();
  await Notifications.requestPermissionsAsync();
}
