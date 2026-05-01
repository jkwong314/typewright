import type { ReferenceImage } from './types'

export const REFERENCE_IMAGE_MAX = 10
export const CANVAS_MARGIN = 80

interface MinMetrics {
  ascender: number
  descender: number
}

function generateImageId(): string {
  return 'img_' + Math.random().toString(36).slice(2, 10)
}

export function newReferenceImage(
  url: string,
  advanceWidth: number,
  metrics: MinMetrics,
): ReferenceImage {
  return {
    id: generateImageId(),
    url,
    visible: true,
    opacity: 0.4,
    x: -CANVAS_MARGIN,
    y: metrics.descender - CANVAS_MARGIN,
    width: advanceWidth + CANVAS_MARGIN * 2,
    height: metrics.ascender - metrics.descender + CANVAS_MARGIN * 2,
    rotation: 0,
  }
}
