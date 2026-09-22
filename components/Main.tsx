import "react-native-get-random-values";
// polifills first
import { setupI18n } from "@lingui/core";
import { QueryClientProvider } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { isEqual } from "lodash";
import { useEffect, useMemo, useState } from "react";
import { BackHandler, Platform } from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";
import { patchFlatListProps } from "react-native-web-refresh-control";
import {
  registerForPushNotificationsAsync,
  triggerNotification,
} from "../components/notifications";
import { RouterRoot } from "../components/Routing";
import { SelectAccountScreen } from "../components/screens/SelectAccountScreen";
import { GlobalWebScrollbarStyle } from "../components/ui/GlobalWebScrollbarStyle";
import {
  accountIdFromAccountSecret,
  accountIdFromString,
  AccountSecret,
} from "./cryptography/cryptography";
import { EcpI18n } from "./i18n/EcpI18n";
import { hyperswarmNetworkFactory } from "./network/hyperswarmNetwork";
import { networkDummy } from "./network/netoworkDummy";
import { bareNetworkFactory } from "./network/networkBare";
import { websocketNetworkFactory } from "./network/networkWebsocketClient";
import { contactList } from "./queries/contacts";
import {
  directMessagesList,
  directMessagesSummary,
} from "./queries/directMessages";
import { DataItem, DataItemSchema } from "./queries/Queries";
import { shouldSend } from "./queries/shouldSend";
import { ProfileDeepLinkScreen } from "./screens/ProfileDeepLinkScreen";
import { createAppStorage } from "./storage/AppStorage";
import { StorageInterface } from "./storage/StorageInteraface";
import { createEcpQueryClient } from "./store/dataApi";
import { FeApiContext } from "./store/feApi";
import { createStore } from "./store/store";
import { useTheme } from "./Theme";

patchFlatListProps();

export function createApp({ storage }: { storage: StorageInterface }) {
  const appStorage = createAppStorage({ storage });

  const queryClient = createEcpQueryClient();

  const networkFactory = (() => {
    if (process.env.NODE_ENV === "test") {
      return hyperswarmNetworkFactory;
    }
    if (Platform.OS === "web") {
      if (navigator.userAgent.includes("Electron")) {
        return networkDummy;
      } else {
        return websocketNetworkFactory;
      }
    }
    return bareNetworkFactory;
  })();

  const store = createStore<DataItem>({
    parse: DataItemSchema.parse,
    storage: {
      async add(item) {
        // TODO refactor somehow
        const alreadyExists = (await appStorage.read()).data.some(
          (existingItem) => isEqual(existingItem, item),
        );
        if (alreadyExists) {
          return false;
        }
        await appStorage.write((current) => {
          return { ...current, data: [...current.data, item] };
        });
        return true;
      },
      async all() {
        return (await appStorage.read()).data;
      },
    },
    networkFactory,
    async onAdd(item) {
      // TODO make these more efficient and selective and come up with a thing to express that it is a live query at callsite
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [directMessagesList.name] }),
        queryClient.invalidateQueries({
          queryKey: [directMessagesSummary.name],
        }),
      ]);
      await triggerNotification();
    },
    shouldSend,
    async getDeviceByAccounts() {
      const data = await appStorage.read();
      return new Map(
        Object.entries(data.deviceSettings.cryptoPrivateKeys).map(
          ([accountSecret, deviceSecret]) => [
            accountIdFromAccountSecret(accountSecret as AccountSecret),
            deviceSecret,
          ],
        ),
      );
    },
    async getContacts(accountId) {
      const current = await appStorage.read();
      const all = current.data;
      return (await contactList({ accountId })(all)).map(
        (contact) => contact.contactId,
      );
    },
    async getAccountSecrets() {
      const data = await appStorage.read();
      return new Map(
        Object.entries(data.deviceSettings.cryptoPrivateKeys).map(
          ([accountSecret, _deviceSecret]) => [
            accountIdFromAccountSecret(accountSecret as AccountSecret),
            accountSecret as AccountSecret,
          ],
        ),
      );
    },
  });

  const i18n = setupI18n();

  const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
    const theme = useTheme();
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundColor }}>
        <GlobalWebScrollbarStyle />
        {children}
      </SafeAreaView>
    );
  };

  const api = { appStorage, store };

  const Main = () => {
    useEffect(() => {
      void registerForPushNotificationsAsync();
    }, []);

    const { contactId } = useLocalSearchParams();
    const validContactId = useMemo(() => {
      if (typeof contactId !== "string") return;
      try {
        return accountIdFromString(contactId);
      } catch {
        return;
      }
    }, [contactId]);
    const [ignoreOverride, setIgnoreOverride] = useState(false);
    useEffect(() => {
      if (validContactId) setIgnoreOverride(false);
    }, [validContactId]);

    useDisableBack();

    return (
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <FeApiContext value={api}>
          <QueryClientProvider client={queryClient}>
            <EcpI18n i18n={i18n}>
              <LayoutWrapper>
                <RouterRoot
                  initial={<SelectAccountScreen />}
                  overrideScreen={
                    validContactId && !ignoreOverride ? (
                      <ProfileDeepLinkScreen
                        contactId={validContactId}
                        onDone={() => {
                          setIgnoreOverride(true);
                        }}
                      />
                    ) : null
                  }
                />
              </LayoutWrapper>
            </EcpI18n>
          </QueryClientProvider>
        </FeApiContext>
      </SafeAreaProvider>
    );
  };
  return { Main, api };
}

function useDisableBack() {
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    history.pushState(null, "", location.href);
    const onPopState = () => {
      history.pushState(null, "", location.href);
    };
    window.addEventListener("popstate", onPopState);
    // const onBeforeUnload = (event: BeforeUnloadEvent) => {
    //   event.preventDefault();
    //   event.returnValue = "";
    // };
    // window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("popstate", onPopState);
      // window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);
}
