import { render, userEvent } from "@testing-library/react-native";
import {
  accountIdFromAccountSecret,
  generateAccountSecret,
} from "../../components/cryptography/cryptography";
import { addAccount } from "../../components/queries/accounts";
import { updateContact } from "../../components/queries/contacts";
import { createTestApp } from "../utils/createTestApp";
import { findIcon } from "../utils/findIcon";

test("user types a message and sends it, the message appears in the conversation", async () => {
  const { Main, api } = await createTestApp();

  const aliceSecret = generateAccountSecret();
  const aliceId = accountIdFromAccountSecret(aliceSecret);
  await addAccount({ accountSecret: aliceSecret, name: "Alice" })(api);

  const bobSecret = generateAccountSecret();
  const bobId = accountIdFromAccountSecret(bobSecret);
  await updateContact({
    accountId: aliceId,
    contactId: bobId,
    name: "Bob",
    deleted: false,
  })(api);

  const user = userEvent.setup();
  const screen = await render(<Main />);

  // navigate to Alice's direct messages
  await user.press(await screen.findByText("Alice"));

  // open conversation with Bob
  await user.press(await screen.findByText("Bob"));

  // type a message
  await user.type(
    await screen.findByPlaceholderText("Write a message"),
    "Hello Bob!",
  );

  // press sticky-note to create draft
  await user.press(await findIcon(screen, "sticky-note"));

  // press send to publish the draft
  await user.press(await findIcon(screen, "send"));

  expect(await screen.findByText("Hello Bob!")).toBeVisible();
});
