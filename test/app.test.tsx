import { render } from "@testing-library/react-native";
import { createTestApp } from "./utils/createTestApp";

test("app starts", async () => {
  const { Main } = await createTestApp();

  const screen = await render(<Main />);

  expect(await screen.findByText("ECP")).toBeVisible();
});
