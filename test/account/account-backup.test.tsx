import { render, userEvent, waitFor } from "@testing-library/react-native";
import * as Clipboard from "expo-clipboard";
import { Alert } from "react-native";
import { createTestApp } from "../utils/createTestApp";
import { findIcon } from "../utils/findIcon";

test("user can export and import account", async () => {
  let clipboardContent = "";
  const clipboardSpy = jest
    .spyOn(Clipboard, "setStringAsync")
    .mockImplementation(async (value) => {
      clipboardContent = value;
      return true;
    });
  const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

  const exportPassword = "backup-pass-123";

  try {
    const { Main: ExportMain } = await createTestApp();
    const exportUser = userEvent.setup();
    const exportScreen = await render(<ExportMain />);

    await exportUser.press(await exportScreen.findByText("Create new account"));
    await exportUser.type(exportScreen.getByLabelText("Account name"), "Alice");
    await exportUser.press(await findIcon(exportScreen, "save"));
    await exportUser.press(await exportScreen.findByText("Account settings"));
    await exportUser.press(await exportScreen.findByText("Export account"));

    await exportUser.type(
      exportScreen.getByPlaceholderText("Will be needed to import later"),
      exportPassword,
    );
    await exportUser.press(await exportScreen.findByText("Confirm export"));

    await waitFor(() => {
      expect(clipboardSpy).toHaveBeenCalled();
    });
    expect(alertSpy).toHaveBeenCalledWith(
      "Exported account secret copied to clipboard",
    );
    const exportedPayload = clipboardContent;
    expect(exportedPayload.length).toBeGreaterThan(0);

    const { Main: ImportMain } = await createTestApp();
    const importUser = userEvent.setup();
    const importScreen = await render(<ImportMain />);

    await importUser.press(await importScreen.findByText("Import account"));
    await importUser.type(
      await importScreen.findByPlaceholderText(
        "This name is only visible to you on this device",
      ),
      "Alice Imported",
    );
    await importUser.type(
      importScreen.getByPlaceholderText("The one you typed in during export"),
      exportPassword,
    );
    await importUser.type(
      importScreen.getByPlaceholderText("Paste here exported account secret"),
      exportedPayload,
    );
    await importUser.press(await importScreen.findByText("Confirm import"));

    expect(await importScreen.findByText("Alice Imported")).toBeVisible();
    expect(await importScreen.findByText("Account settings")).toBeVisible();
  } finally {
    clipboardSpy.mockRestore();
    alertSpy.mockRestore();
  }
}, 30000);

test("user sees error when importing with wrong password", async () => {
  let clipboardContent = "";
  const clipboardSpy = jest
    .spyOn(Clipboard, "setStringAsync")
    .mockImplementation(async (value) => {
      clipboardContent = value;
      return true;
    });
  const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

  try {
    const { Main: ExportMain } = await createTestApp();
    const exportUser = userEvent.setup();
    const exportScreen = await render(<ExportMain />);

    await exportUser.press(await exportScreen.findByText("Create new account"));
    await exportUser.type(exportScreen.getByLabelText("Account name"), "Alice");
    await exportUser.press(await findIcon(exportScreen, "save"));
    await exportUser.press(await exportScreen.findByText("Account settings"));
    await exportUser.press(await exportScreen.findByText("Export account"));
    await exportUser.type(
      exportScreen.getByPlaceholderText("Will be needed to import later"),
      "correct-password",
    );
    await exportUser.press(await exportScreen.findByText("Confirm export"));

    await waitFor(() => {
      expect(clipboardSpy).toHaveBeenCalled();
    });
    const exportedPayload = clipboardContent;

    const { Main: ImportMain } = await createTestApp();
    const importUser = userEvent.setup();
    const importScreen = await render(<ImportMain />);

    await importUser.press(await importScreen.findByText("Import account"));
    await importUser.type(
      await importScreen.findByPlaceholderText(
        "This name is only visible to you on this device",
      ),
      "Alice Imported",
    );
    await importUser.type(
      importScreen.getByPlaceholderText("The one you typed in during export"),
      "wrong-password",
    );
    await importUser.type(
      importScreen.getByPlaceholderText("Paste here exported account secret"),
      exportedPayload,
    );
    await importUser.press(await importScreen.findByText("Confirm import"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Invalid account secret or password",
      );
    });
    expect(importScreen.queryByText("Account settings")).toBeNull();
  } finally {
    clipboardSpy.mockRestore();
    alertSpy.mockRestore();
  }
}, 30000);
