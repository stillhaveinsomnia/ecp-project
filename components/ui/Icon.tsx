import { ArrowLeft, Cog, LogIn, UserRoundPlus } from "lucide-react-native";
import { ComponentType } from "react";
import { View } from "react-native";
// import "@expo/vector-icons/"
// import { coconut } from "@lucide/lab";
/* <Icon iconNode={coconut} size={24} color="black" /> */

type IconProps = { size: number; color?: string };
export type Icon = ComponentType<IconProps>;

export function DeviceSettingsIcon(props: IconProps) {
  return (
    <View testID="DeviceSettingsIcon">
      <Cog {...props} />
    </View>
  );
}

export function BackIcon(props: IconProps) {
  return (
    <View testID="BackIcon">
      <ArrowLeft {...props} />
    </View>
  );
}

export function ImportAccountIcon(props: IconProps) {
  return (
    <View testID="ImportAccountIcon">
      <LogIn {...props} />
    </View>
  );
}

export function CreateAccountIcon(props: IconProps) {
  return (
    <View testID="CreateAccountIcon">
      <UserRoundPlus {...props} />
    </View>
  );
}
