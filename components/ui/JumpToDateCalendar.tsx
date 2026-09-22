import { useLingui } from "@lingui/react/macro";
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { Timestamp, TimestampSchema } from "../queries/Timestamp";
import { useTheme } from "../Theme";

type Granularity = "year" | "month" | "day" | "hour";

type Bucket = {
  key: string;
  label: string;
  count: number;
  timestamp: Timestamp;
  isCurrent: boolean;
};

export function JumpToDateCalendar({
  currentTimestamp,
  onChange,
  messages,
}: {
  currentTimestamp: Timestamp;
  onChange(timestamp: Timestamp): void;
  messages: Array<{ createdAt: Timestamp }>;
}) {
  const { t } = useLingui();
  const theme = useTheme();
  const [granularity, setGranularity] = useState<Granularity>("day");

  const buckets = useMemo(
    () => computeBuckets(messages, currentTimestamp, granularity),
    [messages, currentTimestamp, granularity],
  );
  const maxCount = useMemo(
    () =>
      Math.max(
        buckets.reduce((max, bucket) => Math.max(max, bucket.count), 1),
        80,
      ),
    [buckets],
  );

  const current = new Date(currentTimestamp);
  const tabs: Array<{ value: Granularity; label: string }> = [
    {
      value: "year",
      label: current.toLocaleDateString(undefined, { year: "numeric" }),
    },
    {
      value: "month",
      label: current.toLocaleDateString(undefined, { month: "long" }),
    },
    {
      value: "day",
      label: current.toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
      }),
    },
    {
      value: "hour",
      label: current.toLocaleTimeString(undefined, { hour: "numeric" }),
    },
  ];

  return (
    <View style={{ gap: 8, width: 350, height: 400 }}>
      <View style={{ flexDirection: "row" }}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.value}
            testID={`jump-to-date-tab-${tab.value}`}
            onPress={() => setGranularity(tab.value)}
            style={{
              flex: tab.value === "year" || tab.value === "hour" ? 2 : 3,
              alignItems: "center",
              paddingVertical: 6,
              borderBottomWidth: 2,
              borderColor:
                granularity === tab.value ? theme.linkTextColor : "transparent",
            }}
          >
            <Text
              style={[
                theme.textStyle,
                {
                  color:
                    granularity === tab.value
                      ? theme.linkTextColor
                      : theme.secondaryTextColor,
                },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={buckets}
        keyExtractor={(bucket) => bucket.key}
        renderItem={({ item }) => {
          const count = item.count;
          const fraction = Math.sqrt(count) / Math.sqrt(maxCount);
          return (
            <Pressable
              onPress={() => onChange(item.timestamp)}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 8,
                paddingHorizontal: 16,
                overflow: "hidden",
                borderLeftWidth: 4,
                borderColor: item.isCurrent
                  ? theme.linkTextColor
                  : "transparent",
              }}
            >
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  right: 0,
                  width: `${fraction * 100}%`,
                  backgroundColor: withAlpha(theme.linkTextColor, 0.1),
                }}
              />
              <Text style={theme.textStyle}>{item.label}</Text>
              <Text style={theme.secondaryTextStyle}>{count}</Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={() => (
          <Text
            style={[
              theme.secondaryTextStyle,
              { textAlign: "center", paddingVertical: 16 },
            ]}
          >
            {t`No messages`}
          </Text>
        )}
      />
    </View>
  );
}

/** Appends an alpha channel to a "#rrggbb" color. */
function withAlpha(hexColor: string, alpha: number): string {
  const alphaHex = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hexColor}${alphaHex}`;
}

function computeBuckets(
  messages: Array<{ createdAt: Timestamp }>,
  currentTimestamp: Timestamp,
  granularity: Granularity,
): Array<Bucket> {
  const current = new Date(currentTimestamp);
  const groups = new Map<number, { count: number; date: Date }>();

  for (const message of messages) {
    const date = new Date(message.createdAt);
    if (
      granularity !== "year" &&
      date.getFullYear() !== current.getFullYear()
    ) {
      continue;
    }
    if (
      (granularity === "day" || granularity === "hour") &&
      date.getMonth() !== current.getMonth()
    ) {
      continue;
    }
    if (granularity === "hour" && date.getDate() !== current.getDate()) {
      continue;
    }

    const bucketStart = (() => {
      switch (granularity) {
        case "year":
          return new Date(date.getFullYear(), 0, 1);
        case "month":
          return new Date(date.getFullYear(), date.getMonth(), 1);
        case "day":
          return new Date(date.getFullYear(), date.getMonth(), date.getDate());
        case "hour":
          return new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            date.getHours(),
          );
      }
    })();
    const key = bucketStart.getTime();
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(key, { count: 1, date: bucketStart });
    }
  }

  return Array.from(groups.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(({ count, date }) => ({
      key: String(date.getTime()),
      label: formatBucketLabel(date, granularity),
      count,
      timestamp: TimestampSchema.parse(date.getTime()),
      isCurrent: isSameBucket(date, current, granularity),
    }));
}

function formatBucketLabel(date: Date, granularity: Granularity): string {
  switch (granularity) {
    case "year":
      return String(date.getFullYear());
    case "month":
      return date.toLocaleDateString(undefined, { month: "long" });
    case "day":
      return date.toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
      });
    case "hour":
      return date.toLocaleTimeString(undefined, { hour: "numeric" });
  }
}

function isSameBucket(
  date: Date,
  current: Date,
  granularity: Granularity,
): boolean {
  if (date.getFullYear() !== current.getFullYear()) return false;
  if (granularity === "year") return true;
  if (date.getMonth() !== current.getMonth()) return false;
  if (granularity === "month") return true;
  if (date.getDate() !== current.getDate()) return false;
  if (granularity === "day") return true;
  return date.getHours() === current.getHours();
}
