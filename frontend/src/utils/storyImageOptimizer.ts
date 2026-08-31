import type { StoryLayout, StoryPage, StoryPageBackground } from '../types/storyLayout';
import { normalizeStoryLayout } from '../types/storyLayout';

const BLOCK_IMAGE_MAX = 960;
const BACKGROUND_IMAGE_MAX = 1280;
const COVER_IMAGE_MAX = 1280;
const JPEG_QUALITY = 0.8;
/** Re-compress embedded images above ~50KB to stay under MongoDB's 16MB limit */
const MIN_COMPRESS_CHARS = 50_000;

export function isEmbeddableImage(value?: string | null): value is string {
  return Boolean(value?.startsWith('data:image/'));
}

export function compressDataUrl(
  dataUrl: string,
  maxDim: number,
  quality = JPEG_QUALITY,
): Promise<string> {
  if (!isEmbeddableImage(dataUrl)) return Promise.resolve(dataUrl);
  if (dataUrl.length < MIN_COMPRESS_CHARS) return Promise.resolve(dataUrl);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w >= h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function compressImageFile(
  file: File,
  maxDim: number,
  quality = JPEG_QUALITY,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      void compressDataUrl(reader.result as string, maxDim, quality).then(resolve);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read image'));
    reader.readAsDataURL(file);
  });
}

async function optimizeBackground(bg?: StoryPageBackground): Promise<StoryPageBackground | undefined> {
  if (!bg || bg.type !== 'image' || !isEmbeddableImage(bg.value)) return bg;
  return { ...bg, value: await compressDataUrl(bg.value, BACKGROUND_IMAGE_MAX) };
}

async function optimizeLayout(layout?: StoryLayout | null): Promise<StoryLayout> {
  const normalized = normalizeStoryLayout(layout);
  const pages: StoryPage[] = await Promise.all(
    normalized.pages.map(async (page) => ({
      ...page,
      background: await optimizeBackground(page.background),
      blocks: await Promise.all(
        page.blocks.map(async (block) => {
          if (block.type !== 'image' || !isEmbeddableImage(block.content)) return block;
          return { ...block, content: await compressDataUrl(block.content, BLOCK_IMAGE_MAX) };
        }),
      ),
    })),
  );
  return { pages };
}

export interface LevelSaveShape {
  levelNumber: number;
  storyNode: {
    title: string;
    content: string;
    vocabulary: unknown[];
    storyLayout?: StoryLayout;
  };
  mediaPrompt: string;
  quiz: unknown[];
  customImage?: string | null;
}

/** Shrink embedded photos in story layouts before save/publish (MongoDB 16MB doc limit). */
export async function optimizeLevelsForSave<T extends LevelSaveShape>(levels: T[]): Promise<T[]> {
  return Promise.all(
    levels.map(async (level) => ({
      ...level,
      storyNode: {
        ...level.storyNode,
        storyLayout: level.storyNode.storyLayout
          ? await optimizeLayout(level.storyNode.storyLayout)
          : level.storyNode.storyLayout,
      },
      customImage: level.customImage && isEmbeddableImage(level.customImage)
        ? await compressDataUrl(level.customImage, BLOCK_IMAGE_MAX)
        : level.customImage,
    })),
  );
}

export async function optimizeCoverImage(cover: string | null): Promise<string | null> {
  if (!cover || !isEmbeddableImage(cover)) return cover;
  return compressDataUrl(cover, COVER_IMAGE_MAX);
}

export function estimateCampaignBytes(levels: LevelSaveShape[], coverImage?: string | null): number {
  try {
    return new Blob([JSON.stringify({ levels, coverImage })]).size;
  } catch {
    return 0;
  }
}
