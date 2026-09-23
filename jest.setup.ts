import { notifyManager } from "@tanstack/react-query";
import { setUpTests } from "react-native-reanimated";

notifyManager.setScheduler((callback) => callback());

jest.mock("react-native-worklets", () =>
  require("react-native-worklets/lib/module/mock"),
);

jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);

jest.mock("expo-video", () => ({
  useVideoPlayer: () => ({ play: jest.fn(), pause: jest.fn() }),
  VideoView: () => null,
}));

jest.mock("expo-audio", () => ({
  useAudioPlayer: () => ({ play: jest.fn(), pause: jest.fn() }),
  useAudioPlayerStatus: () => ({ playing: false, currentTime: 0, duration: 0 }),
}));

jest.mock("react-native-webview", () => ({ WebView: () => null }));

setUpTests();
