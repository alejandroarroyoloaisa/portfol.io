/**
 * Control deslizante propio (React Native ya no incluye Slider). Accesible como «adjustable»:
 * con VoiceOver/TalkBack se ajusta deslizando arriba/abajo.
 */
import { useRef, useState } from 'react';
import { PanResponder, View, type LayoutChangeEvent } from 'react-native';
import { colors, stroke } from '../theme';

interface Props {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  accessibilityLabel: string;
  valueText: string;
}

const KNOB = 28;

export function Slider({ min, max, step, value, onChange, accessibilityLabel, valueText }: Props) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const startX = useRef(0);
  const live = useRef({ value, onChange });
  live.current = { value, onChange };

  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  const fromX = (x: number) => clamp(min + ((x - KNOB / 2) / Math.max(1, widthRef.current - KNOB)) * (max - min));

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        startX.current = e.nativeEvent.locationX;
        live.current.onChange(fromX(startX.current));
      },
      onPanResponderMove: (_e, g) => live.current.onChange(fromX(startX.current + g.dx)),
    }),
  ).current;

  const pct = (value - min) / (max - min);
  const left = pct * Math.max(0, width - KNOB);

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value, text: valueText }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(clamp(value + (e.nativeEvent.actionName === 'increment' ? step : -step)))}
      onLayout={(e: LayoutChangeEvent) => {
        widthRef.current = e.nativeEvent.layout.width;
        setWidth(e.nativeEvent.layout.width);
      }}
      style={{ height: 44, justifyContent: 'center' }}
      {...pan.panHandlers}
    >
      <View pointerEvents="none" style={{ height: 8, borderRadius: 4, backgroundColor: colors.arena, marginHorizontal: KNOB / 2 }}>
        <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 4, backgroundColor: colors.cobalto }} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute', left, width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: colors.mostaza,
          borderWidth: stroke, borderColor: colors.tinta,
        }}
      />
    </View>
  );
}
