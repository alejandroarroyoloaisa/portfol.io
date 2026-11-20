/** Datos estructurados schema.org. Se escapa «<» para evitar inyecciones (guía JSON-LD de Next). */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
