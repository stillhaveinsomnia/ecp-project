import { act } from "@testing-library/react-native";
import { createApp } from "../../components/Main";
import { createMemoryStorage } from "../../components/storage/MemoryStorage";

const teardownRegistry: Record<string, Array<() => Promise<void>>> = {};

const getTestName = () => expect.getState().currentTestName ?? "";

export async function createTestApp() {
  const { Main, api } = createApp({ storage: createMemoryStorage() });
  teardownRegistry[getTestName()]!.push(api.store.stop);
  return { Main, api };
}

beforeEach(() => {
  teardownRegistry[getTestName()] = [];
});

afterEach(async () => {
  await act(async () => {
    await Promise.all(teardownRegistry[getTestName()]!.map((fn) => fn()));
    delete teardownRegistry[getTestName()];
  });
});
