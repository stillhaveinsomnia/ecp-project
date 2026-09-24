import { createApp } from "../components/Main";
import { createEncryptedAsyncLocalStorage } from "../components/storage/EncryptedAsyncLocalStorage";

const { Main } = createApp({ storage: createEncryptedAsyncLocalStorage() });

export default Main;
