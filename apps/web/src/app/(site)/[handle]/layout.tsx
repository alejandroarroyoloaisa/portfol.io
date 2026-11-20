/** El hueco @modal muestra la ficha de una obra sobre el portfolio al navegar desde la rejilla. */
export default function HandleLayout({ children, modal }: LayoutProps<'/[handle]'>) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
