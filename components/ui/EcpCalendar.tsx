import { ReactNode, useState } from "react";
import { Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
} from "react-native-reanimated";
import { useTheme } from "../Theme";

type EventPayload = {
  id: string;
  start: number;
  duration: number;
  content: ReactNode;
};

export function EcpCalendar({ events }: { events: Array<EventPayload> }) {
  const theme = useTheme();

  const [baseY] = useState(() => Date.now());

  const offsetY = useSharedValue(0);
  const startY = useSharedValue(0);

  const offsetX = useSharedValue(0);
  const startX = useSharedValue(0);

  const initialScaleY = 100 / dayDuration;
  const scaleY = useSharedValue(initialScaleY);
  const startScaleY = useSharedValue(initialScaleY);

  const pan = Gesture.Pan()
    .onBegin(() => {
      startY.value = offsetY.value;
      startX.value = offsetX.value;
    })
    .onUpdate((e) => {
      offsetY.value = startY.value + e.translationY;
      offsetX.value = Math.min(200, Math.max(0, startX.value + e.translationX));
    })
    .onEnd((e) => {
      offsetY.value = withDecay({ velocity: e.velocityY });
      offsetX.value = Math.min(200, Math.max(0, offsetX.value));
    });

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      startScaleY.value = scaleY.value;
      startY.value = offsetY.value;
    })
    .onUpdate((e) => {
      const newScale = startScaleY.value * e.scale;
      scaleY.value = newScale;
      offsetY.value =
        startY.value - e.focalY * (newScale / startScaleY.value - 1);
    });

  const composed = Gesture.Simultaneous(pan, pinch);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: offsetY.value }, { translateX: offsetX.value }],
    };
  });

  return (
    <GestureDetector gesture={composed}>
      <View style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <Animated.View style={[animatedStyle]}>
          {Array.from({ length: 31 }).map((_, i) => {
            const dayStart = startOfDay(baseY + i * dayDuration);
            return (
              <LegendItem
                key={i}
                timestamp={dayStart}
                baseY={baseY}
                scaleY={scaleY}
              >
                <Text
                  style={[theme.secondaryTextStyle, { textAlign: "right" }]}
                >
                  {new Date(dayStart).toLocaleString("default", {
                    day: "2-digit",
                    weekday: "long",
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
              </LegendItem>
            );
          })}
          {events.map((event) => {
            return (
              <EventItem
                key={event.id}
                event={event}
                baseY={baseY}
                scaleY={scaleY}
              />
            );
          })}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

function EventItem({
  event,
  baseY,
  scaleY,
}: {
  event: EventPayload;
  baseY: number;
  scaleY: SharedValue<number>;
}) {
  const theme = useTheme();

  const eventStyle = useAnimatedStyle(() => {
    const top = (event.start - baseY) * scaleY.value;
    const height = Math.max(event.duration, monthDuration) * scaleY.value;
    return { position: "absolute", top, height };
  });

  return (
    <Animated.View
      key={event.id}
      style={[
        {
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: theme.separatorColor,
          marginHorizontal: 16,
          backgroundColor: theme.backgroundColor,
        },
        eventStyle,
      ]}
    >
      <Text>
        {new Date(event.start).toLocaleString()} -{" "}
        {new Date(event.start + event.duration).toLocaleString()}
      </Text>
      {event.content}
    </Animated.View>
  );
}

function LegendItem({
  timestamp,
  baseY,
  scaleY,
  children,
}: {
  timestamp: number;
  baseY: number;
  scaleY: SharedValue<number>;
  children: ReactNode;
}) {
  const theme = useTheme();

  const eventStyle = useAnimatedStyle(() => {
    const top = (timestamp - baseY) * scaleY.value;
    return { position: "absolute", top };
  });

  return (
    <Animated.View
      style={[
        {
          borderTopWidth: 1,
          borderColor: theme.separatorColor,
          width: 200,
          right: "100%",
        },
        eventStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
}

const secondDuration = 1000;
const minuteDuration = 60 * secondDuration;
const hourDuration = 60 * minuteDuration;
const dayDuration = 24 * hourDuration;
// const weekDuration = 7 * dayDuration;
const monthDuration = 31 * dayDuration;
// const yearDuration = 365 * dayDuration;

// function startOfHour(timestamp: number) {
//   const date = new Date(timestamp);
//   date.setMinutes(0, 0, 0);
//   return date.getTime();
// }

function startOfDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

// function startOfWeek(timestamp: number) {
//   const date = new Date(timestamp);
//   const day = date.getDay();
//   date.setDate(date.getDate() - day);
//   date.setHours(0, 0, 0, 0);
//   return date.getTime();
// }

// function startOfMonth(timestamp: number) {
//   const date = new Date(timestamp);
//   date.setDate(1);
//   date.setHours(0, 0, 0, 0);
//   return date.getTime();
// }

// function startOfYear(timestamp: number) {
//   const date = new Date(timestamp);
//   date.setMonth(0, 1);
//   date.setHours(0, 0, 0, 0);
//   return date.getTime();
// }
