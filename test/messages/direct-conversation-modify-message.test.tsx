import { render, userEvent } from "@testing-library/react-native";
import {
  accountIdFromAccountSecret,
  generateAccountSecret,
} from "../../components/cryptography/cryptography";
import { addAccount } from "../../components/queries/accounts";
import { updateContact } from "../../components/queries/contacts";
import { createTestApp } from "../utils/createTestApp";
import { findIcon } from "../utils/findIcon";

async function setUpConversation() {
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

  await user.press(await screen.findByText("Alice"));
  await user.press(await screen.findByText("Bob"));

  return { user, screen };
}

async function modifyMessage(
  user: ReturnType<typeof userEvent.setup>,
  screen: Awaited<ReturnType<typeof render>>,
  currentContent: string,
  newContent: string,
) {
  await user.longPress(await screen.findByText(currentContent));
  await user.press(await screen.findByRole("button", { name: "Modify" }));

  await user.clear(await screen.findByPlaceholderText("Write a message"));
  await user.type(
    await screen.findByPlaceholderText("Write a message"),
    newContent,
  );
  await user.press(
    await screen.findByRole("button", { name: "Modify message" }),
  );
}

test("user can modify a message", async () => {
  const { user, screen } = await setUpConversation();

  // user writes a meesage
  await user.type(
    await screen.findByPlaceholderText("Write a message"),
    "Hello Bob!",
  );
  await user.press(await findIcon(screen, "sticky-note"));
  await user.press(await findIcon(screen, "send"));

  // it has the typed text
  expect(await screen.findByText("Hello Bob!")).toBeVisible();
  expect(screen.queryByLabelText("pencil")).toBeNull();

  // user modifies the message
  await modifyMessage(user, screen, "Hello Bob!", "Hello Bob, edited!");

  // it has the modified text and the pencil icon
  expect(await screen.findByText("Hello Bob, edited!")).toBeVisible();
  expect(screen.queryByText("Hello Bob!")).toBeNull();
  await findIcon(screen, "pencil");
});

test("user can modify a messasge multiple times", async () => {
  const { user, screen } = await setUpConversation();

  await user.type(
    await screen.findByPlaceholderText("Write a message"),
    "version 1",
  );
  await user.press(await findIcon(screen, "sticky-note"));
  await user.press(await findIcon(screen, "send"));
  expect(await screen.findByText("version 1")).toBeVisible();

  // do it 3 times
  await modifyMessage(user, screen, "version 1", "version 2");
  expect(await screen.findByText("version 2")).toBeVisible();
  await findIcon(screen, "pencil");

  await modifyMessage(user, screen, "version 2", "version 3");
  expect(await screen.findByText("version 3")).toBeVisible();
  await findIcon(screen, "pencil");

  await modifyMessage(user, screen, "version 3", "version 4");
  expect(await screen.findByText("version 4")).toBeVisible();
  // only one pencil icon, not one per edit
  await findIcon(screen, "pencil");

  expect(screen.queryByText("version 1")).toBeNull();
  expect(screen.queryByText("version 2")).toBeNull();
  expect(screen.queryByText("version 3")).toBeNull();
});
