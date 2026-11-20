'use client';

import Image from 'next/image';
import type { ImageVariants } from '@portfolio/schemas';

type Variant = 'thumb' | 'medium' | 'large';

/**
 * Imagen de obra: usa una variante redimensionada (nunca el original) y, como cortesía (RNF-13),
 * desactiva el menú contextual y el arrastre para dificultar la descarga directa.
 */
export function ProtectedImage({
  image, alt, variant = 'medium', sizes, priority, className, fill, style,
}: {
  image: ImageVariants;
  alt: string;
  variant?: Variant;
  sizes?: string;
  priority?: boolean;
  className?: string;
  fill?: boolean;
  style?: React.CSSProperties;
}) {
  const common = {
    src: image[variant],
    alt,
    sizes,
    priority,
    draggable: false,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    className: `protected-img${className ? ` ${className}` : ''}`,
    style: { backgroundColor: image.color, objectFit: 'cover' as const, ...style },
  };
  if (fill) return <Image {...common} alt={alt} fill />;
  return <Image {...common} alt={alt} width={image.width} height={image.height} />;
}
