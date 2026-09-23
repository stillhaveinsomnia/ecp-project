import { createContext } from "react";
import { DataItem } from "../queries/Queries";
import { AppStoredData } from "../storage/AppStorage";
import { QueuedStorageInterface } from "../storage/StorageInteraface";
import { StoreOutInterface } from "./store";

export type EcpQuery<Params, Return> = (
  p: Params,
) => (apiContext: FeApiContextType) => Promise<Return>;

export type EcpMutation<Params> = (
  p: Params,
) => (apiContext: FeApiContextType) => Promise<void>;

export type FeApiContextType = {
  appStorage: QueuedStorageInterface<AppStoredData>;
  store: StoreOutInterface<DataItem>;
};

export const FeApiContext = createContext<FeApiContextType>(null as any);
