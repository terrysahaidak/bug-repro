import React, {useMemo} from 'react';
import {useWindowDimensions} from 'react-native';
import {Skia, Path} from '@shopify/react-native-skia';

type CanvasBackgroundProps = {};

const PADDING = 14;

export function CanvasBackground({}: CanvasBackgroundProps): React.ReactElement {
  const windowDimensions = useWindowDimensions();

  const xCount = Math.floor(windowDimensions.width / PADDING);
  const yCount = Math.floor(windowDimensions.height / PADDING);

  const rectangles = useMemo(() => {
    const path = Skia.Path.Make();

    for (let i = 0; i <= xCount; i++) {
      for (let j = 0; j <= yCount; j++) {
        path.addRect({
          height: 1,
          width: 1,
          x: i * PADDING,
          y: j * PADDING,
        });
      }
    }

    return path;
  }, [xCount, yCount]);

  return (
    <Path
      transform={[
        {
          translateX:
            windowDimensions.width % PADDING === 0
              ? PADDING / 2
              : (windowDimensions.width - xCount * PADDING) / 2,
        },
        {
          translateY:
            windowDimensions.height % PADDING === 0
              ? PADDING / 2
              : (windowDimensions.height - yCount * PADDING) / 2,
        },
      ]}
      path={rectangles}
    />
  );
}
