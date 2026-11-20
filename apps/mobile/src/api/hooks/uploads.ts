import type { UploadResult } from '@portfolio/schemas';
import { useMutation } from '@tanstack/react-query';
import { compressImage, toFormData, type LocalFile } from '../../utils/media';
import { api } from '../client';

export type UploadKind = 'obra' | 'avatar' | 'documento';

/** Sube un fichero ya preparado. Devuelve la clave que luego se asocia a la obra, al avatar o a la solicitud. */
export async function uploadFile(file: LocalFile, kind: UploadKind): Promise<UploadResult> {
  const form = await toFormData(file);
  return api.uploads.upload(form, kind);
}

/** Comprime en el cliente (RNF-02) y sube una imagen. */
export async function uploadImage(asset: { uri: string; width?: number; height?: number; fileName?: string | null }, kind: 'obra' | 'avatar') {
  const file = await compressImage(asset, kind === 'avatar' ? 800 : undefined);
  return uploadFile(file, kind);
}

export function useUpload(kind: UploadKind) {
  return useMutation({ mutationFn: (f: LocalFile) => uploadFile(f, kind) });
}
