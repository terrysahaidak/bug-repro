import {Canvas, Group, Rect, Shadow, Skia} from '@shopify/react-native-skia';
import React, {useMemo} from 'react';
import {StyleSheet, View, useWindowDimensions} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  useWorkletCallback,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {CanvasBackground} from './CanvasBackground';

const HORIZONTAL_MARGIN = 16;
const CONTROLS_HEIGHT = 50;

function useCanvasDimensions() {
  const windowDimensions = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const canvasDimensions = useMemo(
    () => ({
      width: 512,
      height: 712,
    }),
    [],
  );

  const usableDimensions = useMemo(() => {
    const width = windowDimensions.width - insets.left - insets.right;
    const height = windowDimensions.height - insets.top - insets.bottom;

    return {
      width: width - HORIZONTAL_MARGIN * 2,
      height: height - CONTROLS_HEIGHT * 2,
    };
  }, [windowDimensions, insets]);

  const canvasNormalizedDimensions = useMemo(() => {
    const scaleFactorX = canvasDimensions.width / usableDimensions.width;
    const scaleFactorY = canvasDimensions.height / usableDimensions.height;

    const scaledWidth = canvasDimensions.width / scaleFactorY;
    const scaledHeight = canvasDimensions.height / scaleFactorX;

    if (scaledWidth > usableDimensions.width) {
      return {
        width: usableDimensions.width,
        height: scaledHeight,
      };
    }

    return {
      width: scaledWidth,
      height: usableDimensions.height,
    };
  }, [canvasDimensions, usableDimensions]);

  return {
    windowDimensions: windowDimensions,
    canvasNormalizedDimensions: canvasNormalizedDimensions,
    usableDimensions: usableDimensions,
    canvasDimensions: canvasDimensions,
  };
}

const INITIAL_SCALE = 0.5;

type SharedState = {
  x: number;
  offsetX: number;
  y: number;
  offsetY: number;
  scale: number;
  width: number;
  height: number;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
};

const DOT_SIZE = 20;
const DOT_RADIUS = DOT_SIZE / 2;

export function ResizingCanvas() {
  const {canvasNormalizedDimensions, windowDimensions} = useCanvasDimensions();

  const initialWidth = canvasNormalizedDimensions.width * INITIAL_SCALE;
  const initialHeight = canvasNormalizedDimensions.height * INITIAL_SCALE;
  const initialX = (windowDimensions.width - initialWidth) / 2;
  const initialY = (windowDimensions.height - initialHeight) / 2;

  const sharedState = useSharedValue<SharedState>({
    x: initialX,
    y: initialY,
    scale: INITIAL_SCALE,
    width: initialWidth,
    height: initialHeight,
    x1: initialX,
    x2: initialX + initialWidth,
    y1: initialY,
    y2: initialY + initialHeight,
    offsetX: 0,
    offsetY: 0,
  });

  const getNextValues = useWorkletCallback((nextScale: number) => {
    const {x1, x2, y1, y2, x, y, width, height, offsetX, offsetY} =
      sharedState.value;

    const nextWidth = canvasNormalizedDimensions.width * nextScale;
    const nextHeight = canvasNormalizedDimensions.height * nextScale;
    const nextX = (windowDimensions.width - nextWidth) / 2;
    const nextY = (windowDimensions.height - nextHeight) / 2;

    return {
      x: nextX,
      y: nextY,
      scale: nextScale,
      width: nextWidth,
      height: nextHeight,

      x1: x1 + nextX - x,
      x2: x2 + nextX - x + nextWidth - width,
      y1: y1 + nextY - y,
      y2: y2 + nextY - y + nextHeight - height,

      //   offsetX: offsetX * (nextX1 / x1),
      //   offsetY: nextOffsetY,
    };
  });

  const updateSharedState = useWorkletCallback(
    (values: Partial<SharedState>) => {
      sharedState.value = {...sharedState.value, ...values};
    },
  );

  const scaleGesture = Gesture.Pinch()
    .onChange(evt => {
      const values = getNextValues(evt.scaleChange * sharedState.value.scale);

      console.log(values);

      updateSharedState(values);
    })
    .onEnd(() => {
      //   const endWidth = width.value + resizerWidth.value
      //   const endHeight = height.value + resizerHeight.value
      //   const scaledResizeWidth = endWidth * scale.value
      //   const scaledResizeHeight = endHeight * scale.value
      //   if (scaledResizeWidth > width.value) scale.value = width.value / endWidth
      //   else if (scaledResizeHeight > height.value) scale.value = height.value / endHeight
    });

  const x = useDerivedValue(
    () => sharedState.value.x + sharedState.value.offsetX,
  );
  const y = useDerivedValue(
    () => sharedState.value.y + sharedState.value.offsetY,
  );
  const width = useDerivedValue(() => sharedState.value.width);
  const height = useDerivedValue(() => sharedState.value.height);

  const clip = useDerivedValue(() => {
    const {x1, x2, y1, y2} = sharedState.value;

    return Skia.XYWHRect(x1, y1, x2 - x1, y2 - y1);
  });

  return (
    <GestureDetector gesture={scaleGesture}>
      <View style={styles.container}>
        <GestureDetector gesture={scaleGesture}>
          <Canvas style={{flex: 1}}>
            <CanvasBackground />
            <Rect height={height} width={width} x={x} y={y} color="white">
              <Shadow dx={0} dy={0} blur={4} color="rgba(0, 0, 0, 0.25)" />
            </Rect>

            <Group invertClip clip={clip}>
              <Rect
                y={0}
                x={0}
                width={windowDimensions.width}
                height={windowDimensions.height}
                color="rgba(0, 0, 0, 0.25)"
              />
            </Group>
          </Canvas>
        </GestureDetector>

        <Animated.View style={styles.resizeContainer}>
          <SelectionResizeHandle
            position="top-left"
            sharedState={sharedState}
          />
          <SelectionResizeHandle
            position="bottom-left"
            sharedState={sharedState}
          />
          <SelectionResizeHandle
            position="top-right"
            sharedState={sharedState}
          />
          <SelectionResizeHandle
            position="bottom-right"
            sharedState={sharedState}
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

type SelectionResizeHandleProps = {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  sharedState: SharedValue<SharedState>;
};

const SelectionResizeHandle = ({
  position,
  sharedState,
}: SelectionResizeHandleProps): React.ReactElement => {
  const size = 20;

  const updateSharedState = useWorkletCallback(
    (values: Partial<SharedState>) => {
      sharedState.value = {...sharedState.value, ...values};
    },
  );

  const panGesture = Gesture.Pan()
    .hitSlop({
      left: 20,
      right: 20,
      top: 20,
      bottom: 20,
    })
    .onChange(evt => {
      const {offsetX, offsetY, x1, x2, y1, y2} = sharedState.value;

      updateSharedState({
        offsetX: offsetX - evt.changeX,
        offsetY: offsetY - evt.changeY,
      });

      switch (position) {
        case 'top-left':
          updateSharedState({
            x1: x1 + evt.changeX,
            x2: x2 - evt.changeX,

            y1: y1 + evt.changeY,
            y2: y2 - evt.changeY,
          });
          break;

        case 'top-right':
          updateSharedState({
            x1: x1 - evt.changeX,
            x2: x2 + evt.changeX,

            y1: y1 + evt.changeY,
            y2: y2 - evt.changeY,
          });
          break;

        case 'bottom-right':
          updateSharedState({
            x1: x1 - evt.changeX,
            x2: x2 + evt.changeX,

            y1: y1 - evt.changeY,
            y2: y2 + evt.changeY,
          });
          break;

        case 'bottom-left':
          updateSharedState({
            x1: x1 + evt.changeX,
            x2: x2 - evt.changeX,

            y1: y1 - evt.changeY,
            y2: y2 + evt.changeY,
          });
          break;
        default:
          return 0;
      }
    })
    .onEnd(() => {});

  const x1 = useDerivedValue(() => {
    const {x1, x2} = sharedState.value;

    switch (position) {
      case 'top-left':
      case 'bottom-left':
        return x1 - DOT_RADIUS;
      case 'top-right':
      case 'bottom-right':
        return x2 - DOT_RADIUS;
      default:
        return 0;
    }
  });
  const y1 = useDerivedValue(() => {
    const {y1, y2} = sharedState.value;

    switch (position) {
      case 'top-right':
      case 'top-left':
        return y1 - DOT_RADIUS;
      case 'bottom-right':
      case 'bottom-left':
        return y2 - DOT_RADIUS;

      default:
        return 0;
    }
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{translateX: x1.value}, {translateY: y1.value}],
    };
  });

  const sizeStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  return (
    <Animated.View style={[animatedStyle, styles.handleContainer, sizeStyle]}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={sizeStyle} />
      </GestureDetector>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    ...StyleSheet.absoluteFillObject,
  },
  resizeContainer: {
    flex: 1,
    ...StyleSheet.absoluteFillObject,
  },
  handleContainer: {
    position: 'absolute',
    width: 20,
    height: 20,
    backgroundColor: 'red',
  },
});
