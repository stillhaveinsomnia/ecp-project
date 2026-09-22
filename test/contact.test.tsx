import { render, userEvent } from "@testing-library/react-native";
import {
  accountIdFromAccountSecret,
  generateAccountSecret,
} from "../components/cryptography/cryptography";
import { addAccount } from "../components/queries/accounts";
import { getContact, updateContact } from "../components/queries/contacts";
import { createTestApp } from "./utils/createTestApp";
import { findIcon } from "./utils/findIcon";

test("user sees contact list", async () => {
  const { Main, api } = await createTestApp();

  const accountSecret = generateAccountSecret();
  const accountId = accountIdFromAccountSecret(accountSecret);
  await addAccount({ accountSecret, name: "Alice" })(api);

  const bobSecret = generateAccountSecret();
  const bobAccountId = accountIdFromAccountSecret(bobSecret);
  await updateContact({
    accountId,
    contactId: bobAccountId,
    name: "Bob",
    deleted: false,
  })(api);

  const carolSecret = generateAccountSecret();
  const carolAccountId = accountIdFromAccountSecret(carolSecret);
  await updateContact({
    accountId,
    contactId: carolAccountId,
    name: "Carol",
    deleted: false,
  })(api);

  const user = userEvent.setup();
  const screen = await render(<Main />);

  await user.press(await screen.findByText("Alice"));

  expect(await screen.findByText("Bob")).toBeVisible();
  expect(await screen.findByText("Carol")).toBeVisible();
});

test("user adds a contact", async () => {
  const { Main, api } = await createTestApp();

  const accountSecret = generateAccountSecret();
  const accountId = accountIdFromAccountSecret(accountSecret);
  await addAccount({ accountSecret, name: "Alice" })(api);

  const contactSecret = generateAccountSecret();
  const contactAccountId = accountIdFromAccountSecret(contactSecret);

  const user = userEvent.setup();
  const screen = await render(<Main />);

  // navigate into Alice's direct messages
  await user.press(await screen.findByText("Alice"));

  // open new contact form
  await user.press(await findIcon(screen, "user-plus"));

  // fill in contact account id and name
  await user.type(
    await screen.findByPlaceholderText(
      "Paste the account id your contact shared with you",
    ),
    contactAccountId,
  );
  await user.type(
    screen.getByPlaceholderText("This name is only visible to you"),
    "Bob",
  );

  // save — should navigate to contact's profile
  await user.press(await findIcon(screen, "save"));

  expect(await screen.findByText("Bob")).toBeVisible();

  expect(
    await getContact({ accountId: accountId, contactId: contactAccountId })(
      api,
    ),
  ).toEqual({ name: "Bob" });
});

test("user updates a contact name", async () => {
  const { Main, api } = await createTestApp();

  const accountSecret = generateAccountSecret();
  const accountId = accountIdFromAccountSecret(accountSecret);
  await addAccount({ accountSecret, name: "Alice" })(api);

  const contactSecret = generateAccountSecret();
  const contactAccountId = accountIdFromAccountSecret(contactSecret);
  await updateContact({
    accountId,
    contactId: contactAccountId,
    name: "Bob",
    deleted: false,
  })(api);

  const user = userEvent.setup();
  const screen = await render(<Main />);

  // navigate into Alice's direct messages
  await user.press(await screen.findByText("Alice"));

  // press on Bob to go to the conversation
  await user.press(await screen.findByText("Bob"));

  // press on Bob's name in the conversation header to go to profile
  await user.press(await screen.findByText("Bob"));

  // press Edit contact
  await user.press(await screen.findByText("Edit contact"));

  // clear the name and type the new one
  const nameInput = await screen.findByPlaceholderText(
    "This name is only visible to you",
  );
  await user.clear(nameInput);
  await user.type(nameInput, "Robert");

  // save
  await user.press(await findIcon(screen, "save"));

  expect(
    await screen.findByPlaceholderText("This name is only visible to you"),
  ).toHaveProp("value", "Robert");

  expect(
    await getContact({ accountId, contactId: contactAccountId })(api),
  ).toEqual({ name: "Robert" });
});

test("user deletes a contact", async () => {
  const { Main, api } = await createTestApp();

  const accountSecret = generateAccountSecret();
  const accountId = accountIdFromAccountSecret(accountSecret);
  await addAccount({ accountSecret, name: "Alice" })(api);

  const contactSecret = generateAccountSecret();
  const contactAccountId = accountIdFromAccountSecret(contactSecret);
  await updateContact({
    accountId,
    contactId: contactAccountId,
    name: "Bob",
    deleted: false,
  })(api);

  const user = userEvent.setup();
  const screen = await render(<Main />);

  // navigate into Alice's direct messages
  await user.press(await screen.findByText("Alice"));

  // press on Bob to go to the conversation
  await user.press(await screen.findByText("Bob"));

  // press on Bob's name in the conversation header to go to profile
  await user.press(await screen.findByText("Bob"));

  // press Edit contact
  await user.press(await screen.findByText("Edit contact"));

  // press the trash icon to delete
  await user.press(await findIcon(screen, "trash"));

  // should navigate back to direct messages, Bob no longer listed
  expect(await screen.findByText("Create new contact")).toBeVisible();
  expect(screen.queryByText("Bob")).toBeNull();

  expect(
    await getContact({ accountId, contactId: contactAccountId })(api),
  ).toBeUndefined();
});
