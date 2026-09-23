import { render, userEvent } from "@testing-library/react-native";
import {
  accountIdFromAccountSecret,
  generateAccountSecret,
} from "../../components/cryptography/cryptography";
import { addAccount } from "../../components/queries/accounts";
import { updateContact } from "../../components/queries/contacts";
import { createTestApp } from "../utils/createTestApp";
import { findIconButton } from "../utils/findIcon";

// TODO reenable when properly implemented networking
test.skip("a draft direct message is not delivered to the recipient", async () => {
  const aliceSecret = generateAccountSecret();
  const aliceId = accountIdFromAccountSecret(aliceSecret);

  const bobSecret = generateAccountSecret();
  const bobId = accountIdFromAccountSecret(bobSecret);

  const { Main: AliceApp, api: aliceApi } = await createTestApp();
  const { Main: BobApp, api: bobApi } = await createTestApp();

  await addAccount({ accountSecret: aliceSecret, name: "Alice" })(aliceApi);
  await updateContact({
    accountId: aliceId,
    contactId: bobId,
    name: "Bob",
    deleted: false,
  })(aliceApi);

  await addAccount({ accountSecret: bobSecret, name: "Bob" })(bobApi);
  await updateContact({
    accountId: bobId,
    contactId: aliceId,
    name: "Alice",
    deleted: false,
  })(bobApi);

  const aliceUser = userEvent.setup();
  const aliceScreen = await render(<AliceApp />);

  await aliceUser.press(await aliceScreen.findByText("Alice"));
  await aliceUser.press(await aliceScreen.findByText("Bob"));

  // Alice sends message "test-message-a"
  await aliceUser.type(
    await aliceScreen.findByPlaceholderText("Write a message"),
    "test-message-a",
  );
  await aliceUser.press(await findIconButton(aliceScreen, "sticky-note"));
  await aliceUser.press(await findIconButton(aliceScreen, "send"));
  expect(await aliceScreen.findByText("test-message-a")).toBeVisible();

  // Alice creates draft "test-draft-b" (does not send)
  await aliceUser.type(
    await aliceScreen.findByPlaceholderText("Write a message"),
    "test-draft-b",
  );
  await aliceUser.press(await findIconButton(aliceScreen, "sticky-note"));
  expect(await findIconButton(aliceScreen, "send")).toBeVisible();
  await aliceUser.press(await findIconButton(aliceScreen, "sticky-note"));
  expect(await aliceScreen.findByText("test-draft-b")).toBeVisible();

  // Alice sends message "test-messsage-c"
  await aliceUser.type(
    await aliceScreen.findByPlaceholderText("Write a message"),
    "test-messsage-c",
  );
  await aliceUser.press(await findIconButton(aliceScreen, "sticky-note"));
  await aliceUser.press(await findIconButton(aliceScreen, "send"));
  expect(await aliceScreen.findByText("test-messsage-c")).toBeVisible();

  // Bob's app: open conversation with Alice — messages appear, draft does not
  const bobUser = userEvent.setup();
  const bobScreen = await render(<BobApp />);

  await bobUser.press(await bobScreen.findByText("Bob"));
  await bobUser.press(await bobScreen.findByText("Alice"));

  expect(
    await bobScreen.findByText("test-message-a", {}, { timeout: 10000 }),
  ).toBeVisible();
  expect(await bobScreen.findByText("test-messsage-c")).toBeVisible();
  expect(bobScreen.queryByText("test-draft-b")).not.toBeVisible();
}, 20000);
