import { render, userEvent } from "@testing-library/react-native";
import { generateAccountSecret } from "../components/cryptography/cryptography";
import { addAccount } from "../components/queries/accounts";
import { createTestApp } from "./utils/createTestApp";
import { findIcon } from "./utils/findIcon";

test("user opens a multimedia category that isn't built yet", async () => {
  const { Main, api } = await createTestApp();

  await addAccount({ accountSecret: generateAccountSecret(), name: "Molly" })(
    api,
  );

  const user = userEvent.setup();
  const screen = await render(<Main />);

  await user.press(await screen.findByText("Molly"));
  await user.press(await findIcon(screen, "film"));
  await user.press(await screen.findByText("Music, Podcasts"));

  expect(await screen.findByText("Coming soon")).toBeVisible();
});
