/**
 * Selección, compresión y preparación de ficheros para subirlos (RNF-02).
 * Las fotos se reducen en el propio móvil antes de enviarlas: lado mayor ≤ 2000 px, JPEG al 82 %.
 */
import * as DocumentPicker from 'expo-document-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export interface LocalFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
  width?: number;
  height?: number;
  /** En la web, el propio File/Blob. */
  file?: Blob;
}

const MAX_SIDE = 2000;

export class PermissionError extends Error {}

/** Abre la galería y devuelve las imágenes elegidas (sin comprimir todavía). */
export async function pickImages(opts: { multiple?: boolean; limit?: number; square?: boolean } = {}): Promise<ImagePicker.ImagePickerAsset[]> {
  if (Platform.OS !== 'web') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) throw new PermissionError('permission');
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: !!opts.multiple,
    selectionLimit: opts.limit ?? 0,
    allowsEditing: !!opts.square && !opts.multiple,
    aspect: opts.square ? [1, 1] : undefined,
    quality: 1,
  });
  return res.canceled ? [] : res.assets;
}

/** Reduce y recomprime una imagen en el cliente. */
export async function compressImage(asset: { uri: string; width?: number; height?: number; fileName?: string | null }, maxSide = MAX_SIDE): Promise<LocalFile> {
  const w = asset.width ?? 0;
  const h = asset.height ?? 0;
  const ctx = ImageManipulator.manipulate(asset.uri);
  if (w && h && Math.max(w, h) > maxSide) {
    ctx.resize(w >= h ? { width: maxSide } : { height: maxSide });
  } else if (!w || !h) {
    ctx.resize({ width: maxSide });
  }
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
  const base = (asset.fileName ?? 'obra').replace(/\.[^.]+$/, '');
  return { uri: out.uri, width: out.width, height: out.height, name: `${base}.jpg`, mimeType: 'image/jpeg' };
}

/** Abre el selector de documentos para un PDF. */
export async function pickPdf(): Promise<LocalFile | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  return { uri: a.uri, name: a.name, mimeType: a.mimeType ?? 'application/pdf', size: a.size, file: a.file };
}

/** Construye el FormData multiparte con el campo «file» tanto en nativo como en la web. */
export async function toFormData(f: LocalFile): Promise<FormData> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = f.file ?? (await (await fetch(f.uri)).blob());
    form.append('file', blob, f.name);
  } else {
    // React Native acepta { uri, name, type } como parte de un FormData.
    form.append('file', { uri: f.uri, name: f.name, type: f.mimeType } as unknown as Blob);
  }
  return form;
}
