import { useLingui } from "@lingui/react/macro";
import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../Theme";

export function Select<T = string>({
  options,
  value,
  onChange,
  renderValue = (value) => String(value),
  renderOption = renderValue,
  styleOverrides: { flexGrow1 = false } = {},
  valueSearchableText,
}: {
  options: Array<T>;
  value: T;
  onChange(value: T): void;
  renderValue?(value: T): React.ReactNode;
  renderOption?(option: T): React.ReactNode;
  styleOverrides?: { flexGrow1?: boolean };
  valueSearchableText?(value: T): string;
}) {
  const theme = useTheme();
  const { t } = useLingui();
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const visibleOptions = (() => {
    if (!valueSearchableText || !searchText) return options;
    const getSearchableText = valueSearchableText;
    return options
      .map((option, index) => ({
        option,
        index,
        score: fuzzyScore(getSearchableText(option), searchText),
      }))
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .map(({ option }) => option);
  })();

  function renderStringNode(node: React.ReactNode, style: object) {
    return typeof node === "string" ? (
      <Text style={[theme.textStyle, style]}>{node}</Text>
    ) : (
      node
    );
  }

  return (
    <View
      style={[
        {
          position: "relative",
          flexGrow: flexGrow1 ? 1 : undefined,
          borderWidth: 1,
          borderColor: theme.separatorColor,
          borderRadius: 4,
        },
      ]}
    >
      <Pressable
        onPress={() => {
          setSearchText("");
          setIsOpen((open) => !open);
        }}
      >
        {renderStringNode(renderValue(value), {
          paddingHorizontal: 8,
          paddingBottom: 4,
          paddingTop: 6,
        })}
      </Pressable>
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsOpen(false);
        }}
      >
        <Pressable
          style={[
            {
              justifyContent: "center",
              alignItems: "center",
              height:
                Dimensions.get("window").height -
                keyboardHeight -
                (keyboardHeight ? insets.top : 0),
              backgroundColor: theme.overlayBackgroundColor,
              position: "relative",
            },
          ]}
          onPress={() => setIsOpen(false)}
        >
          <View
            style={[
              {
                position: "absolute",
                top: insets.top + 8,
                backgroundColor: theme.backgroundColor,
                borderRadius: 8,
                minWidth: 200,
                maxHeight:
                  Dimensions.get("window").height -
                  keyboardHeight -
                  insets.top -
                  insets.bottom -
                  40,
              },
            ]}
          >
            {valueSearchableText && (
              <TextInput
                value={searchText}
                onChangeText={(text) => {
                  setSearchText(text);
                  scrollViewRef.current?.scrollTo({ y: 0, animated: false });
                }}
                placeholder={t`Search`}
                placeholderTextColor={theme.secondaryTextColor}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                style={[
                  theme.textInputStyle(searchText),
                  { paddingHorizontal: 16, paddingBottom: 8, marginTop: 8 },
                ]}
              />
            )}
            <ScrollView
              ref={scrollViewRef}
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ paddingVertical: 8 }}
            >
              {visibleOptions.map((option, index) => {
                return (
                  <Pressable
                    key={index}
                    onPress={() => {
                      onChange(option);
                      setIsOpen(false);
                    }}
                  >
                    {renderStringNode(renderOption(option), {
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                    })}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function fuzzyScore(text: string, query: string): number {
  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  if (normalizedText === normalizedQuery) return 4;
  if (normalizedText.startsWith(normalizedQuery)) return 3;
  if (normalizedText.includes(normalizedQuery)) return 2;
  let textIndex = 0;
  for (const char of normalizedQuery) {
    textIndex = normalizedText.indexOf(char, textIndex);
    if (textIndex === -1) return 0;
    textIndex += 1;
  }
  return 1;
}
