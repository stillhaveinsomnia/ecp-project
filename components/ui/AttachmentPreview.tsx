import { FontAwesome } from "@expo/vector-icons";
import { useLingui } from "@lingui/react/macro";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import filetypeinfo from "magic-bytes.js";
import { ReactNode, use, useEffect } from "react";
import {
  Platform,
  Pressable,
  StyleProp,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useRouterContext } from "../Routing";
import {
  ContentAddress,
  getFileUri,
  loadFileMagicBytes,
  loadWebxdcApp,
} from "../store/fileStore";
import { useTheme } from "../Theme";
import { ScreenLink } from "./ScreenLink";

// TODO show file size and type

const PREVIEWABLE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/apng",
  "image/webp",
  "image/bmp",
  "image/heif",
  "image/avif",
]);

type AttachmentKind = "image" | "video" | "audio" | "webxdc" | "other";

function getAttachmentKind(
  fileType: string | undefined,
  fileName: string,
): AttachmentKind {
  if (fileName.toLowerCase().endsWith(".xdc")) return "webxdc";
  if (fileType && PREVIEWABLE_IMAGE_TYPES.has(fileType)) return "image";
  if (fileType?.startsWith("video/")) return "video";
  if (fileType?.startsWith("audio/")) return "audio";
  return "other";
}

export function AttachmentPreview({
  file,
  back,
  onLongPress,
  style,
}: {
  file: { name: string; hash: ContentAddress };
  back: ReactNode;
  onLongPress?(): void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const { navigate } = useRouterContext();
  const magicBytes = use(loadFileMagicBytes(file.hash));
  const fileType = filetypeinfo(magicBytes)[0]?.mime;
  const uri = use(getFileUri(file.hash));

  useEffect(() => {
    if (Platform.OS === "web") {
      return () => {
        URL.revokeObjectURL(uri);
      };
    }
  }, [uri]);

  const kind = getAttachmentKind(fileType, file.name);
  const isPreviewable = kind !== "other";

  return (
    <Pressable
      onPress={
        isPreviewable
          ? () =>
              navigate({
                to: <AttachmentPreviewScreen file={file} back={back} />,
              })
          : undefined
      }
      onLongPress={onLongPress}
      style={style}
    >
      {kind === "image" ? (
        <Image
          source={{ uri }}
          style={{ width: 100, height: 100 }}
          contentFit="cover"
        />
      ) : (
        <View
          style={{
            width: 100,
            height: 100,
            padding: 8,
            gap: 4,
            alignItems: "center",
          }}
        >
          <FontAwesome
            name={FILE_ICON_BY_KIND[kind]}
            size={24}
            color={theme.secondaryTextColor}
          />
          <View style={{ flexGrow: 1 }} />
          <Text
            style={[
              theme.secondaryTextStyle,
              { fontSize: 14, textAlign: "center" },
            ]}
          >
            {file.name}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const FILE_ICON_BY_KIND: Record<
  AttachmentKind,
  "file-video-o" | "file-audio-o" | "file" | "puzzle-piece"
> = {
  image: "file",
  video: "file-video-o",
  audio: "file-audio-o",
  webxdc: "puzzle-piece",
  other: "file",
};

function AttachmentPreviewScreen({
  file,
  back,
}: {
  file: { name: string; hash: ContentAddress };
  back: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { navigate } = useRouterContext();
  const magicBytes = use(loadFileMagicBytes(file.hash));
  const fileType = filetypeinfo(magicBytes)[0]?.mime;
  const uri = use(getFileUri(file.hash));
  const kind = getAttachmentKind(fileType, file.name);
  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      {kind === "webxdc" && (
        <WebxdcWindowBar file={file} back={back} paddingTop={insets.top} />
      )}
      {(() => {
        switch (kind) {
          case "image":
            return (
              <Image
                source={{ uri }}
                style={{ flex: 1 }}
                contentFit="contain"
              />
            );
          case "video":
            return <VideoAttachmentPreview uri={uri} />;
          case "audio":
            return <AudioAttachmentPreview uri={uri} name={file.name} />;
          case "webxdc":
            return <WebxdcAttachmentPreview hash={file.hash} />;
          case "other":
            return null;
        }
      })()}
      {kind !== "webxdc" && (
        <Pressable
          onPress={() => navigate({ to: back })}
          style={{
            position: "absolute",
            top: insets.top + 8,
            right: 16,
            padding: 8,
          }}
        >
          <FontAwesome name="times" size={28} color="white" />
        </Pressable>
      )}
    </View>
  );
}

function VideoAttachmentPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (player) => {
    player.play();
  });
  return (
    <VideoView
      player={player}
      style={{ flex: 1 }}
      nativeControls
      contentFit="contain"
    />
  );
}

function AudioAttachmentPreview({ uri, name }: { uri: string; name: string }) {
  const theme = useTheme();
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}
    >
      <FontAwesome name="file-audio-o" size={64} color="white" />
      <Text style={{ color: "white", fontSize: 16 }}>{name}</Text>
      <Pressable
        onPress={() => {
          if (status.playing) player.pause();
          else player.play();
        }}
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: theme.linkTextColor,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <FontAwesome
          name={status.playing ? "pause" : "play"}
          size={28}
          color="white"
        />
      </Pressable>
    </View>
  );
}

// TODO webxdc needs a compelte implementation, this is a toy for now, see spec
// TODO clicking on the app icon, show a modal with info about app (read manifest)
// TODO show and enforce storage quota
// TODO save the udpates as messages? persist and replicate
// TODO implemnt realtime channel
// TODO implement security measers from delta chat app repository
// TODO for desktop

type WebxdcUpdateEntry = { update: unknown; descr?: string; serial: number };

const webxdcUpdatesByHash = new Map<ContentAddress, Array<WebxdcUpdateEntry>>();

function buildWebxdcInjectedJs(initialUpdates: Array<WebxdcUpdateEntry>) {
  return `
(function () {
  var listener = null;
  var updates = ${JSON.stringify(initialUpdates)};
  var serial = updates.length > 0 ? updates[updates.length - 1].serial : 0;
  function replay(cb, sinceSerial) {
    updates
      .filter(function (entry) { return entry.serial > (sinceSerial || 0); })
      .forEach(function (entry) {
        cb(Object.assign({}, entry.update, {
          serial: entry.serial,
          max_serial: serial,
        }));
      });
  }
  window.webxdc = {
    selfAddr: "device0",
    selfName: "Me",
    sendUpdate: function (update, descr) {
      serial += 1;
      var entry = { update: update, descr: descr, serial: serial };
      updates.push(entry);
      var payload = Object.assign({}, update, {
        serial: serial,
        max_serial: serial,
      });
      if (listener) {
        setTimeout(function () {
          listener(payload);
        }, 0);
      }
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: "sendUpdate", entry: entry }),
        );
      }
    },
    setUpdateListener: function (cb, sinceSerial) {
      listener = cb;
      replay(cb, sinceSerial);
      return Promise.resolve();
    },
  };
})();
true;
`;
}

function WebxdcWindowBar({
  file,
  back,
  paddingTop,
}: {
  file: { name: string; hash: ContentAddress };
  back: ReactNode;
  paddingTop: number;
}) {
  const { t } = useLingui();
  const { name, iconUri } = use(loadWebxdcApp(file.hash));
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingTop,
        backgroundColor: "black",
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {iconUri ? (
          <Image
            source={{ uri: iconUri }}
            style={{ width: 44, height: 44 }}
            contentFit="cover"
          />
        ) : (
          <FontAwesome
            name={FILE_ICON_BY_KIND.webxdc}
            size={24}
            color="white"
          />
        )}
      </View>
      <Text
        style={{ flexGrow: 1, color: "white", fontSize: 16 }}
        numberOfLines={1}
      >
        {name ?? file.name}
      </Text>
      <ScreenLink
        to={back}
        icon="times"
        hideLabel
        label={t`Close`}
        color="white"
        styleOverride={{
          backgroundColor: "black",
          paddingHorizontal: 0,
          justifyContent: "center",
        }}
      />
    </View>
  );
}

function WebxdcAttachmentPreview({ hash }: { hash: ContentAddress }) {
  const { indexUri, dirUri } = use(loadWebxdcApp(hash));
  return (
    <WebView
      source={{ uri: indexUri }}
      style={{ flex: 1, backgroundColor: "white" }}
      originWhitelist={["*"]}
      injectedJavaScriptBeforeContentLoaded={buildWebxdcInjectedJs(
        webxdcUpdatesByHash.get(hash) ?? [],
      )}
      onMessage={(event) => {
        const message = JSON.parse(event.nativeEvent.data) as {
          type: "sendUpdate";
          entry: WebxdcUpdateEntry;
        };
        const updates = webxdcUpdatesByHash.get(hash) ?? [];
        updates.push(message.entry);
        webxdcUpdatesByHash.set(hash, updates);
      }}
      allowFileAccess
      allowFileAccessFromFileURLs
      allowUniversalAccessFromFileURLs
      allowingReadAccessToURL={dirUri}
      setSupportMultipleWindows={false}
      javaScriptCanOpenWindowsAutomatically={false}
      onShouldStartLoadWithRequest={(request) =>
        request.url === indexUri || request.url.startsWith(dirUri)
      }
    />
  );
}
