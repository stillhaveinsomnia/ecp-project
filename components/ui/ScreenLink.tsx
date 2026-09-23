import { FontAwesome } from "@expo/vector-icons";
import { Fragment, ReactNode, useState } from "react";
import { Keyboard, Pressable, StyleProp, Text, ViewStyle } from "react-native";
import { To, useRouterContext } from "../Routing";
import { useTheme } from "../Theme";
import { Icon } from "./Icon";
import { useInfoTooltip } from "./InfoTooltip";

// TODO refactor Icons to thin wrapper
type IconName = keyof typeof FontAwesome.glyphMap;

export function ScreenLink({
  to,
  label,
  icon,
  color,
  hideLabel,
  children,
  styleOverride,
  description,
  closeMobileKeyboard = true,
}: {
  to: To;
  color?: string;
  styleOverride?: StyleProp<ViewStyle>;
  description?: ReactNode;
  closeMobileKeyboard?: boolean;
} & (
  | {
      label: string;
      icon?: IconName | Icon;
      hideLabel?: boolean;
      children?: undefined;
    }
  | {
      label?: undefined;
      icon?: undefined;
      hideLabel?: undefined;
      children: ReactNode;
    }
)) {
  const theme = useTheme();
  const { isPending, navigate } = useRouterContext();
  const [isPressing, setIsPressing] = useState(false);
  const [isPerforming, setIsPerforming] = useState(false);
  const isDisabled = isPending || !to || isPerforming;
  const textColor = isDisabled
    ? theme.secondaryTextColor
    : (color ?? theme.linkTextColor);
  const backgroundColor = isPerforming
    ? theme.activeActionBackgroundColor
    : isPressing && !isDisabled
      ? theme.pressedBackgroundColor
      : theme.backgroundColor;
  const tooltip = useInfoTooltip({
    content: description ? (
      description
    ) : (
      <Text
        style={[
          theme.secondaryTextStyle,
          { paddingHorizontal: 8, paddingVertical: 4 },
        ]}
      >
        {label}
      </Text>
    ),
  });
  const Icon = icon;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      ref={tooltip.referenceRef}
      onLongPress={
        children ? (description ? tooltip.open : undefined) : tooltip.open
      }
      onPress={() => {
        if (isDisabled) {
          return;
        }
        if (closeMobileKeyboard) {
          Keyboard.dismiss();
        }
        setIsPerforming(true);
        void navigate({
          to,
          onDone() {
            setIsPerforming(false);
          },
        });
      }}
      style={
        children
          ? [{ backgroundColor }, styleOverride]
          : [
              {
                paddingVertical: 8,
                paddingHorizontal: 16,
                // @ts-ignore
                outline: "none",
                backgroundColor,
                flexDirection: "row",
                gap: 8,
                alignItems: "center",
                minHeight: 44,
                minWidth: 44,
              },
              styleOverride,
            ]
      }
      onPressIn={() => {
        setIsPressing(true);
      }}
      onPressOut={() => {
        setIsPressing(false);
      }}
    >
      {children ? (
        children
      ) : (
        <Fragment>
          {Icon && typeof Icon === "string" ? (
            <FontAwesome
              name={Icon}
              color={textColor}
              size={16}
              aria-label={icon as string}
            />
          ) : (
            Icon && <Icon size={16} color={textColor} />
          )}
          {!hideLabel && (
            <Text
              style={[theme.linkTextStyle, { color: textColor, paddingTop: 2 }]}
            >
              {label}
            </Text>
          )}
        </Fragment>
      )}
      {tooltip.element}
    </Pressable>
  );
}
