import { useLingui } from "@lingui/react/macro";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, StyleSheet, TextInput, View } from "react-native";
import { useTheme } from "../Theme";
import { ScreenLink } from "./ScreenLink";

export function DateTimeInput({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange(value: number | undefined): void;
}) {
  const theme = useTheme();
  const { t } = useLingui();

  const [show, setShow] = useState<"date" | "time" | false>(false);

  const showPicker = (mode: "date" | "time") => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        mode,
        value: value ? new Date(value) : new Date(),
        onChange(event, date) {
          if (event.type === "set") {
            onChange(date?.getTime());
          }
        },
      });
    } else {
      setShow(mode);
    }
  };

  if (Platform.OS === "web") {
    return (
      <input
        type="datetime-local"
        style={{
          ...StyleSheet.flatten(
            theme.textInputStyle(
              value ? new Date(value).toISOString().slice(0, 16) : "",
            ) as any,
          ),
          flexGrow: 1,
          marginRight: 16,
          marginLeft: 16,
        }}
        value={value ? new Date(value).toISOString().slice(0, 16) : ""}
        onChange={(event) => {
          onChange(
            event.currentTarget.value
              ? new Date(event.currentTarget.value).getTime()
              : undefined,
          );
        }}
      />
    );
  }

  return (
    <View style={{ flexDirection: "row" }}>
      <TextInput
        style={[
          theme.textInputStyle(value ? new Date(value).toLocaleString() : ""),
          { flexGrow: 1, marginHorizontal: 16 },
        ]}
        value={value ? new Date(value).toLocaleString() : ""}
        readOnly
      />
      <ScreenLink
        to={async () => {
          showPicker("date");
        }}
        icon="calendar"
        hideLabel
        label={t`Edit date`}
      />
      <ScreenLink
        to={async () => {
          showPicker("time");
        }}
        icon="clock-o"
        hideLabel
        label={t`Edit time`}
      />
      <ScreenLink
        to={async () => {
          onChange(undefined);
        }}
        icon="close"
        hideLabel
        label={t`Clear date`}
      />
      {show && (
        <DateTimePicker
          mode="datetime"
          value={value ? new Date(value) : new Date()}
          onChange={(_, date) => {
            onChange(date?.getTime());
            setShow(false);
          }}
        />
      )}
    </View>
  );
}
