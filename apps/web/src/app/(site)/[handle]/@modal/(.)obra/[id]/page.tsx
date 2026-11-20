import { notFound } from 'next/navigation';
import { ArtworkDetail } from '@/components/ArtworkDetail';
import { Modal } from '@/components/Modal';
import { getArtwork } from '@/lib/api';

/** Ficha de obra en modal (navegación desde «El cuaderno»). */
export default async function ArtworkModal({ params }: PageProps<'/[handle]/obra/[id]'>) {
  const { handle, id } = await params;
  const artwork = await getArtwork(id);
  if (!artwork || artwork.artist.handle !== handle.toLowerCase() || artwork.draft) notFound();
  return (
    <Modal labelledBy="obra-modal-titulo">
      <ArtworkDetail artwork={artwork} headingId="obra-modal-titulo" asDialog />
    </Modal>
  );
}
