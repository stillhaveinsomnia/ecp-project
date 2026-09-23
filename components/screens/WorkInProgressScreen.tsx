import { useLingui } from "@lingui/react/macro";
import { Fragment } from "react";
import { Text, View } from "react-native";
import { AccountId } from "../cryptography/cryptography";
import { useTheme } from "../Theme";
import { BottomTabNavigation } from "../ui/BottomTabNavigation";

export function WorkInProgressScreen({
  accountId,
  title,
}: {
  accountId: AccountId;
  title: string;
}) {
  const { t } = useLingui();
  const theme = useTheme();

  return (
    <Fragment>
      <View
        style={{
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: 16,
        }}
      >
        <Text
          style={[theme.textStyle, { fontWeight: "bold", textAlign: "center" }]}
        >
          {title}
        </Text>
        <Text style={theme.secondaryTextStyle}>{t`Coming soon`}</Text>
      </View>
      <BottomTabNavigation accountId={accountId} enabled={true} />
    </Fragment>
  );
}
