/** Iconos de trazo copiados de las maquetas «Recortes» (viewBox 24 × 24). */
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme';

export type IconName =
  | 'back' | 'forward' | 'close' | 'search' | 'bell' | 'chat' | 'home' | 'plus' | 'briefcase' | 'user'
  | 'heart' | 'heartFilled' | 'bookmark' | 'bookmarkFilled' | 'share' | 'arrowRight' | 'check' | 'filters'
  | 'settings' | 'send' | 'clock' | 'chevronRight' | 'eye' | 'eyeOff' | 'file' | 'flag' | 'trash' | 'image';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, color = colors.tinta, strokeWidth = 2.2 }: Props) {
  const stroke = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const body = (() => {
    switch (name) {
      case 'back': return <Path d="M15 18l-6-6 6-6" {...stroke} />;
      case 'forward': return <Path d="M9 6l6 6-6 6" {...stroke} />;
      case 'close': return <Path d="M6 6l12 12M18 6 6 18" {...stroke} />;
      case 'search': return <><Circle cx={11} cy={11} r={7} {...stroke} /><Path d="m20 20-3.5-3.5" {...stroke} /></>;
      case 'bell': return <><Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" {...stroke} /><Path d="M10 21h4" {...stroke} /></>;
      case 'chat': return <Path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z" {...stroke} />;
      case 'home': return <Path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" {...stroke} />;
      case 'plus': return <Path d="M12 4v16M4 12h16" {...stroke} />;
      case 'briefcase': return <><Rect x={3} y={7} width={18} height={13} rx={2} {...stroke} /><Path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" {...stroke} /></>;
      case 'user': return <><Circle cx={12} cy={8} r={4} {...stroke} /><Path d="M4 21c0-4 4-6 8-6s8 2 8 6" {...stroke} /></>;
      case 'heart': return <Path d="M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z" {...stroke} />;
      case 'heartFilled': return <Path d="M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z" fill={color} />;
      case 'bookmark': return <Path d="M6 3h12v18l-6-4-6 4z" {...stroke} />;
      case 'bookmarkFilled': return <Path d="M6 3h12v18l-6-4-6 4z" fill={color} stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />;
      case 'share': return <Path d="M4 12v8h16v-8M12 3v13M7 8l5-5 5 5" {...stroke} />;
      case 'arrowRight': return <Path d="M5 12h14M13 6l6 6-6 6" {...stroke} />;
      case 'check': return <Path d="M5 12l5 5L20 7" {...stroke} />;
      case 'filters': return <Path d="M4 6h16M7 12h10M10 18h4" {...stroke} />;
      case 'settings':
        return (
          <>
            <Circle cx={12} cy={12} r={3} {...stroke} />
            <Path
              d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
              {...stroke}
            />
          </>
        );
      case 'send': return <Path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" {...stroke} />;
      case 'clock': return <><Circle cx={12} cy={12} r={9} {...stroke} /><Path d="M12 7v5l3 3" {...stroke} /></>;
      case 'chevronRight': return <Path d="M9 6l6 6-6 6" {...stroke} />;
      case 'eye': return <><Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" {...stroke} /><Circle cx={12} cy={12} r={3} {...stroke} /></>;
      case 'eyeOff': return <><Path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" {...stroke} /></>;
      case 'file': return <><Path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" {...stroke} /><Path d="M14 3v5h5" {...stroke} /></>;
      case 'flag': return <Path d="M5 21V4h11l-1.5 4L16 12H5" {...stroke} />;
      case 'trash': return <Path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" {...stroke} />;
      case 'image': return <><Rect x={3} y={4} width={18} height={16} rx={2} {...stroke} /><Circle cx={9} cy={10} r={2} {...stroke} /><Path d="m21 16-5-5-9 9" {...stroke} /></>;
    }
  })();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false} importantForAccessibility="no-hide-descendants">
      {body}
    </Svg>
  );
}
