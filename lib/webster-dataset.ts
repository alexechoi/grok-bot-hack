import type { DatasetPhoto } from "./property-dataset";

export const WEBSTER_ID = "openhouse-webster";

/** User-authorised hackathon reference images; original image rights are retained. */
export const websterDataset = {
  id: "openhouse-webster",
  name: "Webster House",
  location: "1836 Webster Street, Palo Alto, California",
  sourceUrl:
    "https://github.com/yunfanye/openhouse-3d/blob/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/houses/webster",
  sourceCommit: "b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907",
  rightsVerified: false,
  referenceUseAuthorized: true,
  provenance:
    "Original listing photographs and a matching floor plan of the same Webster House, sourced from the pinned Openhouse-3D example. Image rights remain with their original owners; use here is a user-authorised hackathon reference demo. Photographs are not current inspection records and do not establish the synthetic incidents. Procedural geometry follows the source plan with inferred hidden dimensions and illustrative furnishings; this is not a Gaussian reconstruction.",
  credit:
    "Openhouse-3D by Yunfan Ye and contributors; original listing photographs retain their own rights. Floor-plan credit: Bluesky Media / bsm.photos.",
  floorplan: {
    id: "WEBSTER-PLAN-31",
    title: "Webster House floor plan",
    sourceUrl:
      "https://github.com/yunfanye/openhouse-3d/blob/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/houses/webster/photos/31.jpg",
    originalSourceUrl:
      "https://ssl.cdn-redfin.com/photo/8/bigphoto/646/ML82053646_31_1.jpg",
    rightsSourceUrl:
      "https://github.com/yunfanye/openhouse-3d/blob/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/ASSET_LICENSES.md",
    imageUrl:
      "https://raw.githubusercontent.com/yunfanye/openhouse-3d/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/houses/webster/photos/31.jpg",
    localUrl:
      "https://raw.githubusercontent.com/yunfanye/openhouse-3d/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/houses/webster/photos/31.jpg",
    rights:
      "Reference listing image; original rights retained. The Openhouse-3D MIT code license does not relicense photographs or floor plans. User-authorised hackathon reference demo.",
    rightsUrl:
      "https://github.com/yunfanye/openhouse-3d/blob/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/ASSET_LICENSES.md",
    license: "Original rights retained",
    creator: "Bluesky Media / bsm.photos (printed floor-plan credit)",
    capturedAt: undefined,
    credit:
      "Bluesky Media / bsm.photos; source floor plan retained by Openhouse-3D.",
    sourceWidth: 835,
    sourceHeight: 1080,
    sourceSha256:
      "7e77826b9d085bd12e9987fd424202103700af5ae534157c1787e2c245f91157",
    sha256: "7e77826b9d085bd12e9987fd424202103700af5ae534157c1787e2c245f91157",
    changes:
      "Unmodified source JPEG; referenced remotely from the pinned source commit.",
  },
  photos: [
    {
      id: "WEBSTER-PHOTO-01",
      roomId: "living",
      title: "Living room and fireplace",
      description:
        "Unfurnished living room with a fireplace, carpet, side windows and recessed blackboard alcove.",
      sourceUrl:
        "https://github.com/yunfanye/openhouse-3d/blob/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/houses/webster/photos/01.jpg",
      originalSourceUrl:
        "https://ssl.cdn-redfin.com/photo/8/bigphoto/646/ML82053646_1_1.jpg",
      rightsSourceUrl:
        "https://github.com/yunfanye/openhouse-3d/blob/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/ASSET_LICENSES.md",
      imageUrl:
        "https://raw.githubusercontent.com/yunfanye/openhouse-3d/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/houses/webster/photos/01.jpg",
      localUrl:
        "https://raw.githubusercontent.com/yunfanye/openhouse-3d/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/houses/webster/photos/01.jpg",
      rights:
        "Reference listing image; original rights retained. The Openhouse-3D MIT code license does not relicense photographs or floor plans. User-authorised hackathon reference demo.",
      rightsUrl:
        "https://github.com/yunfanye/openhouse-3d/blob/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/ASSET_LICENSES.md",
      license: "Original rights retained",
      photographer: "Not identified in source manifest",
      capturedAt: undefined,
      credit:
        "Webster House listing reference photograph; Openhouse-3D source archive, original image rights retained.",
      sourceWidth: 1280,
      sourceHeight: 853,
      sourceSha256:
        "e2f9394fbc484533015586c12ec092d089be821e0b58044000b19d7a761945cc",
      sha256:
        "e2f9394fbc484533015586c12ec092d089be821e0b58044000b19d7a761945cc",
      changes:
        "Unmodified source JPEG; referenced remotely from the pinned source commit.",
    },
    {
      id: "WEBSTER-PHOTO-05",
      roomId: "kitchen",
      title: "Kitchen",
      description:
        "Kitchen with green tiled worktops, white cabinetry, sink, dishwasher and a long window above the counter.",
      sourceUrl:
        "https://github.com/yunfanye/openhouse-3d/blob/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/houses/webster/photos/05.jpg",
      originalSourceUrl:
        "https://ssl.cdn-redfin.com/photo/8/bigphoto/646/ML82053646_5_1.jpg",
      rightsSourceUrl:
        "https://github.com/yunfanye/openhouse-3d/blob/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/ASSET_LICENSES.md",
      imageUrl:
        "https://raw.githubusercontent.com/yunfanye/openhouse-3d/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/houses/webster/photos/05.jpg",
      localUrl:
        "https://raw.githubusercontent.com/yunfanye/openhouse-3d/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/houses/webster/photos/05.jpg",
      rights:
        "Reference listing image; original rights retained. The Openhouse-3D MIT code license does not relicense photographs or floor plans. User-authorised hackathon reference demo.",
      rightsUrl:
        "https://github.com/yunfanye/openhouse-3d/blob/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/ASSET_LICENSES.md",
      license: "Original rights retained",
      photographer: "Not identified in source manifest",
      capturedAt: undefined,
      credit:
        "Webster House listing reference photograph; Openhouse-3D source archive, original image rights retained.",
      sourceWidth: 1280,
      sourceHeight: 853,
      sourceSha256:
        "019fa6d482e91e30c730069fb187a560dc86727256b1fa51353edc10242eb65f",
      sha256:
        "019fa6d482e91e30c730069fb187a560dc86727256b1fa51353edc10242eb65f",
      changes:
        "Unmodified source JPEG; referenced remotely from the pinned source commit.",
    },
    {
      id: "WEBSTER-PHOTO-10",
      roomId: "bedroom",
      title: "Main-floor bedroom",
      description:
        "Unfurnished main-floor bedroom with wood flooring, fitted closet doors and windows.",
      sourceUrl:
        "https://github.com/yunfanye/openhouse-3d/blob/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/houses/webster/photos/10.jpg",
      originalSourceUrl:
        "https://ssl.cdn-redfin.com/photo/8/bigphoto/646/ML82053646_10_1.jpg",
      rightsSourceUrl:
        "https://github.com/yunfanye/openhouse-3d/blob/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/ASSET_LICENSES.md",
      imageUrl:
        "https://raw.githubusercontent.com/yunfanye/openhouse-3d/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/houses/webster/photos/10.jpg",
      localUrl:
        "https://raw.githubusercontent.com/yunfanye/openhouse-3d/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/houses/webster/photos/10.jpg",
      rights:
        "Reference listing image; original rights retained. The Openhouse-3D MIT code license does not relicense photographs or floor plans. User-authorised hackathon reference demo.",
      rightsUrl:
        "https://github.com/yunfanye/openhouse-3d/blob/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/ASSET_LICENSES.md",
      license: "Original rights retained",
      photographer: "Not identified in source manifest",
      capturedAt: undefined,
      credit:
        "Webster House listing reference photograph; Openhouse-3D source archive, original image rights retained.",
      sourceWidth: 1280,
      sourceHeight: 853,
      sourceSha256:
        "4a398dcf4acb887c9e3f48dd1a8eeabb32fae446c496231e718c0e60b6035eb5",
      sha256:
        "4a398dcf4acb887c9e3f48dd1a8eeabb32fae446c496231e718c0e60b6035eb5",
      changes:
        "Unmodified source JPEG; referenced remotely from the pinned source commit.",
    },
    {
      id: "WEBSTER-PHOTO-13",
      roomId: "bathroom",
      title: "Main bathroom",
      description:
        "Bathroom showing a separate bathtub and glass shower, brass fittings and peach-and-blue tile.",
      sourceUrl:
        "https://github.com/yunfanye/openhouse-3d/blob/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/houses/webster/photos/13.jpg",
      originalSourceUrl:
        "https://ssl.cdn-redfin.com/photo/8/bigphoto/646/ML82053646_13_1.jpg",
      rightsSourceUrl:
        "https://github.com/yunfanye/openhouse-3d/blob/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/ASSET_LICENSES.md",
      imageUrl:
        "https://raw.githubusercontent.com/yunfanye/openhouse-3d/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/houses/webster/photos/13.jpg",
      localUrl:
        "https://raw.githubusercontent.com/yunfanye/openhouse-3d/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/houses/webster/photos/13.jpg",
      rights:
        "Reference listing image; original rights retained. The Openhouse-3D MIT code license does not relicense photographs or floor plans. User-authorised hackathon reference demo.",
      rightsUrl:
        "https://github.com/yunfanye/openhouse-3d/blob/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/ASSET_LICENSES.md",
      license: "Original rights retained",
      photographer: "Not identified in source manifest",
      capturedAt: undefined,
      credit:
        "Webster House listing reference photograph; Openhouse-3D source archive, original image rights retained.",
      sourceWidth: 1280,
      sourceHeight: 853,
      sourceSha256:
        "b25659b96033909ec7d8c7f0f2658b6e6f902cf04151e34e385cb1f26d9a1a7f",
      sha256:
        "b25659b96033909ec7d8c7f0f2658b6e6f902cf04151e34e385cb1f26d9a1a7f",
      changes:
        "Unmodified source JPEG; referenced remotely from the pinned source commit.",
    },
    {
      id: "WEBSTER-PHOTO-15",
      roomId: "hallway",
      title: "Entry and staircase",
      description:
        "Entry corridor facing a carpeted staircase and white metal railing.",
      sourceUrl:
        "https://github.com/yunfanye/openhouse-3d/blob/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/houses/webster/photos/15.jpg",
      originalSourceUrl:
        "https://ssl.cdn-redfin.com/photo/8/bigphoto/646/ML82053646_15_1.jpg",
      rightsSourceUrl:
        "https://github.com/yunfanye/openhouse-3d/blob/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/ASSET_LICENSES.md",
      imageUrl:
        "https://raw.githubusercontent.com/yunfanye/openhouse-3d/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/houses/webster/photos/15.jpg",
      localUrl:
        "https://raw.githubusercontent.com/yunfanye/openhouse-3d/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/houses/webster/photos/15.jpg",
      rights:
        "Reference listing image; original rights retained. The Openhouse-3D MIT code license does not relicense photographs or floor plans. User-authorised hackathon reference demo.",
      rightsUrl:
        "https://github.com/yunfanye/openhouse-3d/blob/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/ASSET_LICENSES.md",
      license: "Original rights retained",
      photographer: "Not identified in source manifest",
      capturedAt: undefined,
      credit:
        "Webster House listing reference photograph; Openhouse-3D source archive, original image rights retained.",
      sourceWidth: 1280,
      sourceHeight: 853,
      sourceSha256:
        "c6d9faf7bf2c1616f5c11b8f8396586af102d7106861b66b9749b21d70b2a228",
      sha256:
        "c6d9faf7bf2c1616f5c11b8f8396586af102d7106861b66b9749b21d70b2a228",
      changes:
        "Unmodified source JPEG; referenced remotely from the pinned source commit.",
    },
  ],
  dimensions: {
    units: "metres",
    mainFloorWidthApprox: 11.5,
    mainFloorDepthApprox: 18.2,
    mainFloorCeilingApprox: 2.75,
    upperFloorHeightApprox: 3.05,
    source:
      "https://github.com/yunfanye/openhouse-3d/blob/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/houses/webster/plan.py",
    note: "Reconstruction coordinates from source plan.py; concealed geometry and unmeasured dimensions are inferred.",
  },
  roomPhotoCoverage: {
    living: true,
    kitchen: true,
    bedroom: true,
    bathroom: true,
    hallway: true,
  },
  zoneNotes: {
    living: "Photo 01 maps to source living room.",
    kitchen: "Photo 05 maps to source kitchen.",
    bedroom: "Photo 10 maps to main-floor bedroom bed_a.",
    bathroom: "Photo 13 maps to main-floor bathroom bath_a.",
    hallway: "Photo 15 maps to entry and staircase.",
  },
} satisfies { photos: (DatasetPhoto & { originalSourceUrl: string })[]; [key: string]: unknown };
