declare module "react-native-web-refresh-control" {
  export function patchFlatListProps(): void;
  export const RefreshControl: typeof import("react-native").RefreshControl;
}
