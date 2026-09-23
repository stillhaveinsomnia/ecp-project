import { useLingui } from "@lingui/react/macro";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { ReactNode, useEffect, useRef, useState } from "react";
import { Platform, ScrollView, TextInput, View } from "react-native";
import { ContentAddress, storeFile } from "../store/fileStore";
import { useTheme } from "../Theme";
import { AttachmentPreview } from "./AttachmentPreview";
import { ScreenLink } from "./ScreenLink";

// TODO improve code quality

type MessageShape = {
  isDraft: boolean;
  content: string;
  attachments: Array<{ name: string; hash: ContentAddress }>;
};

export function MessageCompose({
  onUpdate,
  toModify,
  onCancel,
  isEditFullScreen,
  setIsEditFullScreen,
  attachmentPreviewBack,
}: {
  toModify: MessageShape | undefined;
  onUpdate(params: MessageShape): Promise<void>;
  onCancel(): void;
  isEditFullScreen: boolean;
  setIsEditFullScreen(value: boolean): void;
  attachmentPreviewBack: ReactNode;
}) {
  const theme = useTheme();
  const { t } = useLingui();

  const [text, setText] = useState("");
  useEffect(() => {
    // TODO fix, it resets textarea content when navigatin away and then back in
    // maybe fix skippable when implementing properunsaved work managment
    setText(toModify?.content ?? "");
    if (toModify?.content !== undefined) {
      textInputRef.current?.focus();
    }
  }, [toModify?.content]);

  const [files, setFiles] = useState<
    Array<{ name: string; hash: ContentAddress }>
  >([]);

  const [selectedFileIndex, setSelectedFileIndex] = useState<number>();

  const textInputRef = useRef<TextInput>(null);
  const selectionRef = useRef<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });
  const [selectionOverride, setSelectionOverride] = useState<
    { start: number; end: number } | undefined
  >(undefined);

  const isMultiline = text.includes("\n") || files.length > 0;
  const showExpandButton = isMultiline || isEditFullScreen;

  const attachmentList = (
    <ScrollView horizontal style={{ flexGrow: 0 }}>
      {files.map((file, index) => {
        const isSelected = index === selectedFileIndex;
        return (
          <View key={index} style={{ position: "relative" }}>
            <AttachmentPreview
              file={file}
              back={attachmentPreviewBack}
              onLongPress={() => {
                setSelectedFileIndex(index);
              }}
              style={{
                borderBottomWidth: 1,
                borderRightWidth: 1,
                borderColor: theme.separatorColor,
              }}
            />
            {isSelected && (
              <View style={{ position: "absolute", top: 0, right: 0 }}>
                <ScreenLink
                  to={async () => {
                    setFiles(files.filter((_, i) => i !== index));
                    setSelectedFileIndex(undefined);
                  }}
                  icon="trash"
                  hideLabel
                  label={t`Remove`}
                />
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );

  const attachButton = (
    <ScreenLink
      to={async () => {
        // TODO try also with @react-native-documents/picker might work better on android devices
        const result = await DocumentPicker.getDocumentAsync({
          multiple: true,
          base64: false,
        });
        if (!result.canceled) {
          const newFiles = await Promise.all(
            result.assets.map(async (asset) => {
              if (Platform.OS === "web") {
                const response = await fetch(asset.uri);
                const blob = await response.blob();
                const arrayBuffer = await blob.arrayBuffer();
                const hash = await storeFile(new Uint8Array(arrayBuffer));
                return { name: asset.name, hash };
              } else {
                const file = new FileSystem.File(asset.uri);
                const hash = await storeFile(await file.bytes());
                return { name: asset.name, hash };
              }
            }),
          );
          setFiles((prev) => [...prev, ...newFiles]);
        }
      }}
      icon="paperclip"
      hideLabel
      label={t`Attach file`}
    />
  );

  const textArea = (
    <TextInput
      ref={textInputRef}
      value={text}
      onChangeText={setText}
      selection={selectionOverride}
      onSelectionChange={(event) => {
        selectionRef.current = event.nativeEvent.selection;
        if (selectionOverride) {
          setSelectionOverride(undefined);
        }
      }}
      placeholder={t`Write a message`}
      placeholderTextColor={theme.secondaryTextColor}
      multiline
      numberOfLines={Platform.OS === "web" ? 1 : undefined}
      style={[
        theme.textInputStyle(text),
        isEditFullScreen
          ? { flex: 1, padding: 8, textAlignVertical: "top" }
          : { flex: 1, paddingVertical: 8, maxHeight: 400 },
      ]}
    />
  );

  const expandButton = showExpandButton ? (
    <ScreenLink
      to={async () => {
        const savedSelection = selectionRef.current;
        setIsEditFullScreen(!isEditFullScreen);
        setTimeout(() => {
          textInputRef.current?.focus();
          setSelectionOverride(savedSelection);
        }, 200);
      }}
      icon={isEditFullScreen ? "compress" : "expand"}
      hideLabel
      label={isEditFullScreen ? t`Collapse editor` : t`Expand editor`}
    />
  ) : null;

  const discardChangesButton = toModify ? (
    <ScreenLink
      to={async () => {
        setText(toModify.content);
        onCancel();
      }}
      icon="times"
      hideLabel
      label={t`Discard changes`}
    />
  ) : null;

  const mainActionButton = (() => {
    if (!toModify) {
      // create draft
      return (
        <ScreenLink
          to={
            text !== "" || files.length > 0
              ? async () => {
                  await onUpdate({
                    content: text,
                    attachments: files,
                    isDraft: true,
                  });
                }
              : undefined
          }
          icon="sticky-note"
          hideLabel
          label={t`New draft`}
          closeMobileKeyboard={false}
        />
      );
    } else if (toModify.isDraft && text !== toModify.content) {
      // update draft
      return (
        <ScreenLink
          to={async () => {
            const savedSelection = selectionRef.current;
            await onUpdate({
              content: text,
              attachments: files,
              isDraft: true,
            });
            setTimeout(() => {
              textInputRef.current?.focus();
              setSelectionOverride(savedSelection);
            }, 200);
          }}
          icon="save"
          hideLabel
          label={t`Save draft`}
        />
      );
    } else if (toModify.isDraft && text === toModify.content) {
      // publish draft
      return (
        <ScreenLink
          to={async () => {
            await onUpdate({
              content: text,
              attachments: files,
              isDraft: false,
            });
            setText("");
            setFiles([]);
            if (isEditFullScreen) {
              setIsEditFullScreen(false);
            }
          }}
          icon="send"
          hideLabel
          label={t`Send message`}
          closeMobileKeyboard={false}
        />
      );
    } else if (!toModify.isDraft) {
      // update message
      return (
        <ScreenLink
          to={
            text !== toModify.content
              ? async () => {
                  await onUpdate({
                    content: text,
                    attachments: files,
                    isDraft: false,
                  });
                }
              : undefined
          }
          icon="save"
          hideLabel
          label={t`Modify message`}
        />
      );
    } else if (text === "") {
      // delete it
      return (
        <ScreenLink
          to={async () => {
            await onUpdate({
              content: "",
              attachments: [],
              isDraft: toModify.isDraft,
            });
          }}
          icon="trash"
          hideLabel
          label={t`Delete`}
        />
      );
    } else {
      throw new Error("Invalid state");
    }
  })();

  return isEditFullScreen ? (
    <View style={{ flex: isEditFullScreen ? 1 : undefined }}>
      <View style={{ flex: 1 }}>{textArea}</View>
      {attachmentList}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {attachButton}
        {expandButton}
        {discardChangesButton}
        {mainActionButton}
      </View>
    </View>
  ) : (
    <View>
      {attachmentList}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          borderTopWidth: 1,
          borderColor: theme.separatorColor,
        }}
      >
        {attachButton}
        {textArea}
        <View
          style={
            showExpandButton
              ? { justifyContent: "space-between", alignSelf: "stretch" }
              : undefined
          }
        >
          {expandButton}
          {discardChangesButton}
          {mainActionButton}
        </View>
      </View>
    </View>
  );
}

if (Platform.OS === "web") {
  const style = document.createElement("style");
  style.textContent = "textarea { field-sizing: content; }";
  document.head.appendChild(style);
}
