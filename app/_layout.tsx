import { Slot } from "expo-router";
import { KeyboardAvoidingView, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Slot />
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
}
