import { createApp } from "../components/Main";
import { createAsyncLocalStorage } from "../components/storage/AsyncLocalStorage";

const { Main } = createApp({ storage: createAsyncLocalStorage() });

export default Main;
