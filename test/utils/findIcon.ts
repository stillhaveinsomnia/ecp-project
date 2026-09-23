import { FontAwesome } from "@expo/vector-icons";
import { render, waitFor } from "@testing-library/react-native";
import { Icon } from "../../components/ui/Icon";

type IconName = keyof typeof FontAwesome.glyphMap;

function iconGlyph(name: IconName) {
  const glyph = FontAwesome.glyphMap[name];
  return typeof glyph === "number" ? String.fromCharCode(glyph) : glyph;
}

export async function findIcon(
  screen: Awaited<ReturnType<typeof render>>,
  icon: IconName | Icon,
  optsa?: Parameters<typeof screen.findByText>[1],
  optsb?: Parameters<typeof screen.findByText>[2],
) {
  const [node] = await waitFor(() => {
    const nodes =
      typeof icon === "string"
        ? screen.queryAllByText(
            iconGlyph(icon),
            optsa as Parameters<typeof screen.queryAllByText>[1],
          )
        : screen.queryAllByTestId(
            icon.name,
            optsa as Parameters<typeof screen.queryAllByTestId>[1],
          );

    if (nodes.length !== 1) {
      throw new Error(
        `Expected exactly one icon for ${typeof icon === "string" ? icon : icon.name}, got ${nodes.length}`,
      );
    }

    return nodes;
  }, optsb);

  return node!;
}

// this must find an icon whose direct parent is a button
// <View accessibilityRole="button"><Icon /></View>
// also bear in mind that there might be same icons on the screen that are not inside buttons

export async function findIconButton(
  screen: Awaited<ReturnType<typeof render>>,
  icon: IconName | Icon,
  optsa?: Parameters<typeof screen.findByRole>[1],
  optsb?: Parameters<typeof screen.findByRole>[2],
) {
  const [button] = await waitFor(() => {
    const nodes =
      typeof icon === "string"
        ? screen.queryAllByText(
            iconGlyph(icon),
            optsa as Parameters<typeof screen.queryAllByText>[1],
          )
        : screen.queryAllByTestId(
            icon.name,
            optsa as Parameters<typeof screen.queryAllByTestId>[1],
          );

    const buttonParents = nodes
      .map((node) => node.parent)
      .filter((parent): parent is NonNullable<typeof parent> => !!parent)
      .filter((parent) => parent.props?.accessibilityRole === "button");

    if (buttonParents.length !== 1) {
      throw new Error(
        `Expected exactly one icon with direct button parent for ${
          typeof icon === "string" ? icon : icon.name
        }, got ${buttonParents.length}`,
      );
    }

    return buttonParents;
  }, optsb);

  return button!;
}
