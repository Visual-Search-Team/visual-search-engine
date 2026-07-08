const MOCK_IMAGES = [
  { id: 1025, width: 1200, height: 800 },
  { id: 1071, width: 1200, height: 900 },
  { id: 111, width: 1200, height: 800 },
  { id: 133, width: 1000, height: 750 },
  { id: 180, width: 1200, height: 900 },
  { id: 201, width: 1100, height: 850 },
  { id: 240, width: 1200, height: 800 },
  { id: 250, width: 1000, height: 800 },
  { id: 290, width: 1200, height: 900 },
  { id: 318, width: 1000, height: 700 },
  { id: 338, width: 1200, height: 800 },
  { id: 357, width: 1000, height: 750 },
  { id: 376, width: 1200, height: 850 },
  { id: 431, width: 1000, height: 800 },
  { id: 452, width: 1200, height: 900 },
  { id: 482, width: 1000, height: 750 },
  { id: 490, width: 1200, height: 800 },
  { id: 514, width: 1000, height: 700 },
  { id: 527, width: 1200, height: 850 },
  { id: 585, width: 1000, height: 750 },
  { id: 602, width: 1200, height: 800 },
  { id: 628, width: 1000, height: 750 },
  { id: 684, width: 1200, height: 900 },
  { id: 695, width: 1000, height: 800 },
  { id: 703, width: 1200, height: 850 },
  { id: 743, width: 1000, height: 750 },
  { id: 766, width: 1200, height: 800 },
  { id: 785, width: 1000, height: 700 },
  { id: 823, width: 1200, height: 850 },
  { id: 866, width: 1000, height: 750 },
  { id: 889, width: 1200, height: 800 },
  { id: 903, width: 1000, height: 750 },
  { id: 936, width: 1200, height: 900 },
  { id: 944, width: 1000, height: 800 },
  { id: 961, width: 1200, height: 850 },
  { id: 1011, width: 1000, height: 750 },
  { id: 1040, width: 1200, height: 800 },
  { id: 1050, width: 1000, height: 700 },
  { id: 1062, width: 1200, height: 850 },
  { id: 1084, width: 1000, height: 750 },
];

export const getMockSearchResponse = ({
  page = 0,
  size = 20,
  searchType = "SEMANTIC",
}) => {
  const startIndex = page * size;
  const pageImages = MOCK_IMAGES.slice(startIndex, startIndex + size);

  return {
    success: true,
    data: {
      searchId: 1001,
      searchType,
      processingTimeMs: 185,
      results: pageImages.map((image, index) => {
        const rankPosition = startIndex + index + 1;
        const score = Math.max(0.64, 0.96 - rankPosition * 0.009);

        return {
          imageId: image.id,
          rankPosition,
          score,
          originalFilename: `mock-result-${rankPosition}.jpg`,
          storagePath: `https://picsum.photos/id/${image.id}/1200/900`,
          thumbnailPath: `https://picsum.photos/id/${image.id}/600/750`,
          mimeType: "image/jpeg",
          width: image.width,
          height: image.height,
        };
      }),
      pageNumber: page,
      pageSize: size,
      totalElements: MOCK_IMAGES.length,
      totalPages: Math.ceil(MOCK_IMAGES.length / size),
    },
    error: null,
    timestamp: "2026-07-02T10:30:00+07:00",
  };
};
