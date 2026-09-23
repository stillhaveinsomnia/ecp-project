import {
  autoPlacement,
  arrow as floatingArrow,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react-native";
import { ReactNode, useEffect, useRef, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { useTheme } from "../Theme";

const ARROW_SIZE = 10;

function arrowSvgPoints(side: string): string {
  switch (side) {
    case "top":
      return "5,10 10,0 0,0"; // arrow points downward toward reference
    case "left":
      return "10,5 0,0 0,10"; // arrow points rightward toward reference
    case "right":
      return "0,5 10,0 10,10"; // arrow points leftward toward reference
    default:
      return "5,0 10,10 0,10"; // "bottom": arrow points upward toward reference
  }
}

function arrowOffset(
  side: string,
  x: number | undefined,
  y: number | undefined,
): object {
  switch (side) {
    case "top":
      return { bottom: -ARROW_SIZE, left: x ?? 0 };
    case "left":
      return { right: -ARROW_SIZE, top: y ?? 0 };
    case "right":
      return { left: -ARROW_SIZE, top: y ?? 0 };
    default:
      return { top: -ARROW_SIZE, left: x ?? 0 }; // "bottom"
  }
}

export function useInfoTooltip({ content }: { content: ReactNode }) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const arrowRef = useRef(null);

  const { refs, floatingStyles, middlewareData, placement, update } =
    useFloating({
      sameScrollView: false,
      middleware: [
        offset(ARROW_SIZE + 4),
        autoPlacement({}),
        shift({}),
        floatingArrow({ element: arrowRef, padding: 4 }),
      ],
    });

  // Recompute once after modal mount so coordinates are stable in portal tree.
  useEffect(() => {
    if (!visible) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      update();
    });
    return () => cancelAnimationFrame(frame);
  }, [visible, update]);

  const side = (placement ?? "bottom").split("-")[0]!;
  const { x: arrowX, y: arrowY } = middlewareData.arrow ?? {};

  return {
    referenceRef: refs.setReference,
    open() {
      setVisible(true);
    },
    close() {
      setVisible(false);
    },
    element: (
      <Modal
        visible={visible}
        transparent
        statusBarTranslucent
        animationType="none"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={{ flex: 1 }} onPress={() => setVisible(false)}>
          <View
            ref={refs.setFloating}
            style={[
              floatingStyles,
              {
                backgroundColor: theme.backgroundBackColor,
                borderColor: theme.borderColor,
                borderWidth: 1,
                borderRadius: 4,
                maxWidth: 240,
              },
            ]}
          >
            {content}
            <View
              ref={arrowRef}
              style={[
                { position: "absolute", width: ARROW_SIZE, height: ARROW_SIZE },
                arrowOffset(side, arrowX, arrowY),
              ]}
            >
              <SvgXml
                xml={`<svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><polygon points="${arrowSvgPoints(side)}" fill="${theme.backgroundColor}" stroke="${theme.borderColor}" stroke-width="1"/></svg>`}
                width={ARROW_SIZE}
                height={ARROW_SIZE}
              />
            </View>
          </View>
        </Pressable>
      </Modal>
    ),
  };
}

// function InfoTooltip({
//   children,
//   content,
// }: {
//   children: ReactNode;
//   content: ReactNode;
// }) {
//   const tooltip = useInfoTooltip({ content });

//   return (
//     <>
//       <Pressable ref={tooltip.referenceRef} onLongPress={tooltip.open}>
//         {children}
//       </Pressable>
//       {tooltip.element}
//     </>
//   );
// }
