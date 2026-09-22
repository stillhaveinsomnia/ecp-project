import { render } from "@testing-library/react-native";
import { DeviceSettingsIcon } from "../../components/ui/Icon";
import { findIcon } from "./findIcon";

test("it finds lucide icon", async () => {
  const screen = await render(<DeviceSettingsIcon size={16} />);
  expect(await findIcon(screen, DeviceSettingsIcon)).toBeVisible();
});
