import { isEqual } from "lodash";
import {
  Activity,
  createContext,
  ReactNode,
  use,
  useCallback,
  useMemo,
  useState,
  useTransition,
} from "react";

const IS_TESTING = process.env.NODE_ENV === "test";

const MAX_ALIVE_SCREENS = 15;

const CURRENT = Symbol("current");

export type To = ReactNode | (() => Promise<ReactNode | void>);

type ScreenEntry = { key: string; forceSuspend: string; element: ReactNode };

type RouterContextType = {
  [CURRENT]: ScreenEntry;
  isPending: boolean;
  navigate({ to }: { to: To; onDone?(): void }): void;
};

const RouterContext = createContext<RouterContextType>(null as any);

export function RouterRoot({
  initial,
  overrideScreen,
}: {
  initial: ReactNode;
  overrideScreen: ReactNode;
}) {
  const [state, setState] = useState<{
    nextScreenKey: number;
    nextForceSuspend: number;
    screens: Array<ScreenEntry>;
  }>({
    nextScreenKey: 1,
    nextForceSuspend: 1,
    screens: [{ key: "0", forceSuspend: "0", element: initial }],
  });
  const [isPending, startTransition] = useTransition();
  const onChange = useCallback((to: ReactNode) => {
    setState((state) => {
      const existing = state.screens.find((screen) =>
        compareScreens(screen.element, to),
      );
      if (existing) {
        return {
          nextScreenKey: state.nextScreenKey,
          nextForceSuspend: state.nextForceSuspend + 1,
          screens: [
            {
              key: existing.key,
              forceSuspend: String(state.nextForceSuspend),
              element: existing.element,
            },
            ...state.screens.filter((screen) => screen.key !== existing.key),
          ],
        };
      }
      return {
        nextScreenKey: state.nextScreenKey + 1,
        nextForceSuspend: state.nextForceSuspend + 1,
        screens: [
          {
            key: String(state.nextScreenKey),
            forceSuspend: String(state.nextForceSuspend),
            element: to,
          },
          ...state.screens.slice(0, MAX_ALIVE_SCREENS),
        ],
      };
    });
  }, []);
  const navigate = useCallback(
    ({
      to,
      onDone,
    }: {
      to: ReactNode | (() => Promise<ReactNode | void>);
      onDone?(): void;
    }) => {
      if (typeof to === "function") {
        startTransition(async () => {
          const result = await to();
          if (result) onChange(result);
          onDone?.();
        });
      } else {
        startTransition(() => {
          onChange(to);
          onDone?.();
        });
      }
    },
    [onChange, startTransition],
  );
  const current = state.screens[0]!;
  const value = useMemo(
    (): RouterContextType => ({ [CURRENT]: current, isPending, navigate }),
    [current, isPending, navigate],
  );
  return (
    <RouterContext value={value}>
      {overrideScreen}
      {IS_TESTING
        ? current.element
        : state.screens.map((screen) => {
            return (
              <Activity
                key={screen.key}
                mode={
                  screen.key === current.key && !overrideScreen
                    ? "visible"
                    : "hidden"
                }
              >
                {screen.element}
              </Activity>
            );
          })}
    </RouterContext>
  );
}

export function useRouterContext() {
  return use(RouterContext);
}

export function useCurrentScreenForceSuspend() {
  return use(RouterContext)?.[CURRENT].forceSuspend;
}

function compareScreens(left: ReactNode, right: ReactNode): boolean {
  if (isFunctionComponentNode(left) && isFunctionComponentNode(right)) {
    return (
      left.type.name === right.type.name && isEqual(left.props, right.props)
    );
  }
  return false;
}

function isFunctionComponentNode(
  value: unknown,
): value is { type: (...args: Array<any>) => any; props: unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof value.type === "function"
  );
}
