import { render, userEvent } from "@testing-library/react-native";
import { createTestApp } from "./utils/createTestApp";

test("user sees system theme as default in device settings", async () => {
  const { Main } = await createTestApp();

  const user = userEvent.setup();
  const screen = await render(<Main />);

  await user.press(await screen.findByText("Settings"));
  expect(await screen.findByText("Theme")).toBeVisible();
  expect(
    await screen.findByText(/System default \((Dark|Light)\)/),
  ).toBeVisible();
});

test("user switches theme to dark", async () => {
  const { Main } = await createTestApp();

  const user = userEvent.setup();
  const screen = await render(<Main />);

  await user.press(await screen.findByText("Settings"));
  await user.press(await screen.findByText(/System default \((Dark|Light)\)/));
  await user.press(await screen.findByText("Dark"));

  expect(await screen.findByText("Dark")).toBeVisible();
});
