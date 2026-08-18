export interface CategoryPhotoSet {
  hero: string;
  gallery: string[];
}

export const CATEGORY_PHOTOS: Record<string, CategoryPhotoSet> = {
  't1-standard': {
    hero: '/images/IMG_5001.jpg',
    gallery: [
      '/images/IMG_5001.jpg',
      '/images/IMG_5003.jpg',
      '/images/IMG_5011.jpg',
      '/images/IMG_5017.jpg',
      '/images/IMG_5024.jpg',
      '/images/IMG_5025.jpg',
    ],
  },
  't1-superieure': {
    hero: '/images/IMG_5033.jpg',
    gallery: [
      '/images/IMG_5033.jpg',
      '/images/IMG_5037.jpg',
      '/images/IMG_5053.jpg',
      '/images/IMG_5065.jpg',
      '/images/IMG_5066.jpg',
      '/images/IMG_5070.jpg',
    ],
  },
  't1-privilege': {
    hero: '/images/IMG_5075.jpg',
    gallery: [
      '/images/IMG_5075.jpg',
      '/images/IMG_5076.jpg',
      '/images/IMG_5079.jpg',
      '/images/IMG_5084.jpg',
      '/images/IMG_5086.jpg',
      '/images/IMG_5095.jpg',
    ],
  },
  't2-standard': {
    hero: '/images/IMG_5111.jpg',
    gallery: [
      '/images/IMG_5111.jpg',
      '/images/IMG_5118.jpg',
      '/images/IMG_5119.jpg',
      '/images/IMG_5121.jpg',
      '/images/IMG_5125.jpg',
      '/images/IMG_5130.jpg',
    ],
  },
  't2-superieure': {
    hero: '/images/IMG_5141.jpg',
    gallery: [
      '/images/IMG_5141.jpg',
      '/images/IMG_5143.jpg',
      '/images/IMG_5145.jpg',
      '/images/IMG_5152.jpg',
      '/images/IMG_5153.jpg',
      '/images/IMG_5160.jpg',
    ],
  },
  't2-privilege': {
    hero: '/images/IMG_5177.jpg',
    gallery: [
      '/images/IMG_5177.jpg',
      '/images/IMG_5178.jpg',
      '/images/IMG_5180.jpg',
      '/images/IMG_5181.jpg',
      '/images/IMG_5182.jpg',
      '/images/IMG_5189.jpg',
    ],
  },
  't3-standard': {
    hero: '/images/IMG_5230.jpg',
    gallery: [
      '/images/IMG_5230.jpg',
      '/images/IMG_5231.jpg',
      '/images/IMG_5234.jpg',
      '/images/IMG_5236.jpg',
      '/images/IMG_5238.jpg',
      '/images/IMG_5248.jpg',
    ],
  },
  't3-superieure': {
    hero: '/images/IMG_5264.jpg',
    gallery: [
      '/images/IMG_5264.jpg',
      '/images/IMG_5265.jpg',
      '/images/IMG_5266.jpg',
      '/images/IMG_5267.jpg',
      '/images/IMG_5270.jpg',
      '/images/IMG_5275.jpg',
    ],
  },
  't4-suite': {
    hero: '/images/IMG_5300.jpg',
    gallery: [
      '/images/IMG_5300.jpg',
      '/images/IMG_5302.jpg',
      '/images/IMG_5304.jpg',
      '/images/IMG_5305.jpg',
      '/images/IMG_5308.jpg',
      '/images/IMG_5315.jpg',
    ],
  },
};

export const TERRASSE_PHOTOS: CategoryPhotoSet = {
  hero: '/images/IMG_5480.jpg',
  gallery: [
    '/images/IMG_5480.jpg',
    '/images/IMG_5481.jpg',
    '/images/IMG_5482.jpg',
    '/images/IMG_5483.jpg',
    '/images/IMG_5484.jpg',
    '/images/IMG_5485.jpg',
    '/images/IMG_5486.jpg',
    '/images/IMG_5487.jpg',
    '/images/IMG_5488.jpg',
    '/images/IMG_5489.jpg',
    '/images/IMG_5490.jpg',
    '/images/IMG_5491.jpg',
  ],
};

export function getCategoryPhotos(
  slug: string,
  category?: { images?: Array<{ filePath: string; isCover?: boolean; sortOrder?: number }>; coverImage?: string | null } | null
): CategoryPhotoSet {
  if (category?.images && category.images.length > 0) {
    const sorted = [...category.images].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const cover = sorted.find((i) => i.isCover)?.filePath || category.coverImage || sorted[0].filePath;
    const gallery = sorted.map((i) => i.filePath);
    return {
      hero: cover,
      gallery: gallery.length > 0 ? gallery : [cover],
    };
  }

  return CATEGORY_PHOTOS[slug] || {
    hero: '/images/IMG_5101.jpg',
    gallery: ['/images/IMG_5101.jpg', '/images/IMG_5001.jpg', '/images/IMG_5033.jpg'],
  };
}
