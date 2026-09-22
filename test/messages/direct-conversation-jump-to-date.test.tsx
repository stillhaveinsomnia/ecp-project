import { render, userEvent } from "@testing-library/react-native";
import { FlatList } from "react-native";
import {
  AccountId,
  accountIdFromAccountSecret,
  generateAccountSecret,
} from "../../components/cryptography/cryptography";
import { addAccount } from "../../components/queries/accounts";
import { updateContact } from "../../components/queries/contacts";
import {
  getDirectMessages,
  updateDirectMessage,
} from "../../components/queries/directMessages";
import { TimestampSchema } from "../../components/queries/Timestamp";
import { FeApiContextType } from "../../components/store/feApi";
import { createTestApp } from "../utils/createTestApp";
import { findIcon } from "../utils/findIcon";

async function generateJumpToDateMessages({
  accountId,
  contactId,
  api,
  now = Date.now(),
}: {
  accountId: AccountId;
  contactId: AccountId;
  api: FeApiContextType;
  now?: number;
}): Promise<void> {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;
  const LOREM_IPSUM =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod " +
    "tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim " +
    "veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea " +
    "commodo consequat.";

  let messageCount = 0;
  async function addMessage(timestamp: number, content: string) {
    messageCount += 1;
    const senderId = messageCount % 2 === 0 ? accountId : contactId;
    const receiverId = senderId === accountId ? contactId : accountId;
    await updateDirectMessage({
      senderId,
      receiverId,
      createdAt: TimestampSchema.parse(Math.round(timestamp)),
      isDraft: false,
      content,
      attachments: [],
    })(api);
  }

  // last 4 days
  for (let dayIndex = 3; dayIndex >= 0; dayIndex--) {
    const dayStart = now - dayIndex * DAY;
    for (let i = 0; i < 4; i++) {
      const timestamp = dayStart - i * HOUR;
      await addMessage(
        timestamp,
        `Day -${dayIndex} message ${i + 1} (${new Date(timestamp).toDateString()}). ${LOREM_IPSUM}`,
      );
    }
  }

  // a week further back than the 4-day cluster
  const weekAnchor = now - 3 * DAY - WEEK;
  for (let i = 0; i < 4; i++) {
    const timestamp = weekAnchor - i * HOUR;
    await addMessage(
      timestamp,
      `Week-back message ${i + 1} (${new Date(timestamp).toDateString()}). ${LOREM_IPSUM}`,
    );
  }

  // a full month, 4 messages every day, further back than the week cluster
  const fullMonthAnchor = new Date(weekAnchor - WEEK);
  const daysInFullMonth = new Date(
    fullMonthAnchor.getFullYear(),
    fullMonthAnchor.getMonth() + 1,
    0,
  ).getDate();
  for (let dayOfMonth = 1; dayOfMonth <= daysInFullMonth; dayOfMonth++) {
    const date = new Date(
      fullMonthAnchor.getFullYear(),
      fullMonthAnchor.getMonth(),
      dayOfMonth,
      fullMonthAnchor.getHours(),
    );
    for (let i = 0; i < 4; i++) {
      const timestamp = date.getTime() - i * HOUR;
      await addMessage(
        timestamp,
        `Full month day ${dayOfMonth} message ${i + 1} (${new Date(timestamp).toDateString()}). ${LOREM_IPSUM}`,
      );
    }
  }

  // a day with 4 messages for each of the 12 months before the full-month cluster
  const monthsAnchor = fullMonthAnchor.getTime() - WEEK;
  for (let monthIndex = 1; monthIndex <= 12; monthIndex++) {
    const date = new Date(monthsAnchor);
    date.setMonth(date.getMonth() - monthIndex);
    for (let i = 0; i < 4; i++) {
      const timestamp = date.getTime() - i * HOUR;
      await addMessage(
        timestamp,
        `Month -${monthIndex} message ${i + 1} (${new Date(timestamp).toDateString()}). ${LOREM_IPSUM}`,
      );
    }
  }

  // a day with 4 messages for each of the 4 years before the monthly cluster
  const yearsAnchor = new Date(monthsAnchor);
  yearsAnchor.setMonth(yearsAnchor.getMonth() - 12);
  for (let yearIndex = 1; yearIndex <= 4; yearIndex++) {
    const date = new Date(yearsAnchor);
    date.setFullYear(date.getFullYear() - yearIndex);
    for (let i = 0; i < 4; i++) {
      const timestamp = date.getTime() - i * HOUR;
      await addMessage(
        timestamp,
        `Year -${yearIndex} message ${i + 1} (${new Date(timestamp).toDateString()}). ${LOREM_IPSUM}`,
      );
    }
  }
}

test("user jumps to a date via the floating calendar button", async () => {
  const { Main, api } = await createTestApp();

  const accountSecret = generateAccountSecret();
  const accountId = accountIdFromAccountSecret(accountSecret);
  await addAccount({ accountSecret, name: "Molly" })(api);

  const contactSecret = generateAccountSecret();
  const contactId = accountIdFromAccountSecret(contactSecret);
  await updateContact({ accountId, contactId, name: "Polly", deleted: false })(
    api,
  );

  const now = new Date(2024, 5, 15, 10, 0, 0);
  await generateJumpToDateMessages({
    accountId,
    contactId,
    api,
    now: now.getTime(),
  });

  const conversation = await getDirectMessages({ accountId, contactId })(api);
  function findExpectedIndex(target: Date): number {
    const index = conversation.findIndex(
      (item) => item.createdAt >= target.getTime(),
    );
    expect(index).toBeGreaterThanOrEqual(0);
    return index;
  }

  const earliestYear = new Date(conversation[0]!.createdAt).getFullYear();
  const march = new Date(now.getFullYear(), 2, 1);
  const juneFifth = new Date(now.getFullYear(), now.getMonth(), 5);
  const sevenAm = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7);

  const scrollToIndexSpy = jest.spyOn(FlatList.prototype, "scrollToIndex");

  const user = userEvent.setup();
  const screen = await render(<Main />);

  await user.press(await screen.findByText("Molly"));
  await user.press(await screen.findByText("Polly"));

  const flatList = screen.getByTestId("direct-conversation-message-list");
  await user.scrollTo(flatList, { y: 50 });

  async function closeJumpToDateModal() {
    const title = await screen.findByText("Jump to date");
    await user.press(title.parent!.parent!);
  }

  async function pickAndVerify(tab: string, rowLabel: string, target: Date) {
    scrollToIndexSpy.mockClear();
    await user.press(await findIcon(screen, "calendar"));
    await user.press(screen.getByTestId(`jump-to-date-tab-${tab}`));
    await user.press(await screen.findByText(rowLabel));
    await closeJumpToDateModal();
    expect(scrollToIndexSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ index: findExpectedIndex(target) }),
    );
  }

  await pickAndVerify(
    "year",
    String(earliestYear),
    new Date(earliestYear, 0, 1),
  );
  await pickAndVerify(
    "month",
    march.toLocaleDateString(undefined, { month: "long" }),
    march,
  );
  await pickAndVerify(
    "day",
    juneFifth.toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
    }),
    juneFifth,
  );
  await pickAndVerify(
    "hour",
    sevenAm.toLocaleTimeString(undefined, { hour: "numeric" }),
    sevenAm,
  );
});
