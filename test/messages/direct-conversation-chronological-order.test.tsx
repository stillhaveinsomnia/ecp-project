import { render, userEvent } from "@testing-library/react-native";
import {
  accountIdFromAccountSecret,
  generateAccountSecret,
} from "../../components/cryptography/cryptography";
import { addAccount } from "../../components/queries/accounts";
import { updateContact } from "../../components/queries/contacts";
import { updateDirectMessage } from "../../components/queries/directMessages";
import { nowTimestamp } from "../../components/queries/Timestamp";
import { createTestApp } from "../utils/createTestApp";

test("user opens a conversation and sees previously sent and received messages in chronological order", async () => {
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

  const t1 = nowTimestamp();
  await updateDirectMessage({
    senderId: aliceId,
    receiverId: bobId,
    createdAt: t1,
    isDraft: false,
    content: "First message",
    attachments: [],
  })(api);

  const t2 = (t1 + 1) as typeof t1;
  await updateDirectMessage({
    senderId: bobId,
    receiverId: aliceId,
    createdAt: t2,
    isDraft: false,
    content: "Second message",
    attachments: [],
  })(api);

  const t3 = (t2 + 1) as typeof t2;
  await updateDirectMessage({
    senderId: aliceId,
    receiverId: bobId,
    createdAt: t3,
    isDraft: false,
    content: "Third message",
    attachments: [],
  })(api);

  const user = userEvent.setup();
  const screen = await render(<Main />);

  // select Alice's account
  await user.press(await screen.findByText("Alice"));

  // open conversation with Bob
  await user.press(await screen.findByText("Bob"));

  const first = await screen.findByText("First message");
  const second = await screen.findByText("Second message");
  const third = await screen.findByText("Third message");

  expect(first).toBeVisible();
  expect(second).toBeVisible();
  expect(third).toBeVisible();

  // chronological order: First appears before Second, Second before Third
  expect(first.props.style || first);
  const allMessages = screen.getAllByText(/message/i);
  expect(allMessages.map((el) => el.props.children)).toEqual([
    "First message",
    "Second message",
    "Third message",
  ]);
});
