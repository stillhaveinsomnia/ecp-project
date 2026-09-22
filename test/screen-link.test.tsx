import { render, userEvent } from "@testing-library/react-native";
import { createTestApp } from "./utils/createTestApp";
import { findIcon } from "./utils/findIcon";

test("pressing a disabled screen link has no effect", async () => {
  const { Main } = await createTestApp();

  const user = userEvent.setup();
  const screen = await render(<Main />);

  await user.press(await screen.findByText("Create new account"));
  expect(await screen.findByText("Account name")).toBeVisible();

  // "Create account" is disabled until a name is typed, so pressing it now
  // should do nothing - still on the same (empty) account creation screen
  await user.press(await findIcon(screen, "save"));

  expect(screen.getByText("Account name")).toBeVisible();
  expect(screen.queryByText("Account settings")).toBeNull();
});
