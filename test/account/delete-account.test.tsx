import { render, userEvent } from "@testing-library/react-native";
import { generateAccountSecret } from "../../components/cryptography/cryptography";
import { addAccount } from "../../components/queries/accounts";
import { createTestApp } from "../utils/createTestApp";
import { findIcon } from "../utils/findIcon";

test("user deletes an account", async () => {
  const { Main, api } = await createTestApp();

  await addAccount({ accountSecret: generateAccountSecret(), name: "Molly" })(
    api,
  );
  await addAccount({ accountSecret: generateAccountSecret(), name: "Polly" })(
    api,
  );

  const user = userEvent.setup();
  const screen = await render(<Main />);

  await user.press(await screen.findByText("Molly"));
  await user.press(await findIcon(screen, "user"));
  await user.press(await screen.findByText("Account settings"));
  await user.press(await findIcon(screen, "trash"));

  expect(
    await screen.findByText("Polly", {}, { timeout: 15000 }),
  ).toBeVisible();
  expect(screen.queryByText("Molly")).toBeNull();
});

test("user deletes the only account", async () => {
  const { Main, api } = await createTestApp();

  await addAccount({ accountSecret: generateAccountSecret(), name: "Molly" })(
    api,
  );

  const user = userEvent.setup();
  const screen = await render(<Main />);

  await user.press(await screen.findByText("Molly"));
  await user.press(await findIcon(screen, "user"));
  await user.press(await screen.findByText("Account settings"));
  await user.press(await findIcon(screen, "trash"));

  expect(
    await screen.findByText("ECP", {}, { timeout: 15000 }),
  ).toBeVisible();
  expect(screen.queryByText("Molly")).toBeNull();
});
