import React, { useEffect, useState, useRef } from "react";
import { AppState, AppStateStatus, StyleSheet, View, Text, TextInput, Button } from "react-native";
import { useFeApi } from "./feApi";
import { verifyAppLockPin } from "./appLock";

export const AppLockProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { appStorage } = useFeApi();
  const [isLocked, setIsLocked] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const appState = useRef(AppState.currentState);

  // Check initial state on mount
  useEffect(() => {
    let isMounted = true;
    appStorage.read().then((data) => {
      if (isMounted) {
        if (data.deviceSettings.appLockEnabled) {
          setIsLocked(true);
        }
        setIsChecking(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [appStorage]);

  // Listen to background/foreground transitions
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        // If app goes to background or inactive, check if we need to lock it
        if (
          appState.current.match(/active/) &&
          nextAppState.match(/inactive|background/)
        ) {
          appStorage.read().then((data) => {
            if (data.deviceSettings.appLockEnabled) {
              setIsLocked(true);
            }
          });
        }
        appState.current = nextAppState;
      },
    );

    return () => {
      subscription.remove();
    };
  }, [appStorage]);

  if (isChecking) {
    return null; // Or a splash screen
  }

  if (isLocked) {
    return <AppLockScreenPlaceholder onUnlock={() => setIsLocked(false)} />;
  }

  return <>{children}</>;
};

// -----------------------------------------------------------------------------
// ИЛЮША (фронтенд разработчик):
// Это временная заглушка экрана ввода PIN-кода.
// Тебе нужно нарисовать красивый экран (AppLockScreen), где будет:
// 1. Поле ввода или Numpad (как на iOS/Android lock screen).
// 2. Вызов функции verifyAppLockPin(appStorage, pin).
// 3. Если true -> вызываешь onUnlock().
// 4. Если false -> показываешь ошибку "Неверный PIN".
// -----------------------------------------------------------------------------
const AppLockScreenPlaceholder: React.FC<{ onUnlock: () => void }> = ({
  onUnlock,
}) => {
  const { appStorage } = useFeApi();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handleUnlock = async () => {
    const isValid = await verifyAppLockPin(appStorage, pin);
    if (isValid) {
      setError("");
      setPin("");
      onUnlock();
    } else {
      setError("Неверный PIN-код");
      setPin("");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Приложение заблокировано</Text>
      <Text style={styles.subtitle}>Введите PIN-код для доступа (Илюша, нарисуй тут красоту)</Text>
      
      <TextInput
        style={styles.input}
        secureTextEntry
        keyboardType="numeric"
        value={pin}
        onChangeText={(text) => {
          setPin(text);
          setError("");
        }}
        placeholder="PIN"
        autoFocus
        onSubmitEditing={handleUnlock}
      />
      
      {error ? <Text style={styles.error}>{error}</Text> : null}
      
      <Button title="Разблокировать" onPress={handleUnlock} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff", // Илюша, поставь нормальный фон из темы
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 30,
    textAlign: "center",
  },
  input: {
    width: "100%",
    maxWidth: 300,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 15,
    borderRadius: 8,
    fontSize: 20,
    textAlign: "center",
    marginBottom: 20,
  },
  error: {
    color: "red",
    marginBottom: 20,
  },
});
