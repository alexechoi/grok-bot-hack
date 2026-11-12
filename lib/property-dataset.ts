import type { PropertyRoomId } from "./property-source";

export const DATASET_ID = "farnsworth-habs-il1105";
export type DatasetPhoto = {
  id: string;
  roomId: PropertyRoomId;
  title: string;
  description: string;
  sourceUrl: string;
  rightsSourceUrl: string;
  imageUrl: string;
  localUrl: string;
  rights: string;
  rightsUrl: string;
  license: string;
  photographer: string;
  capturedAt: string;
  credit: string;
  sourceWidth: number;
  sourceHeight: number;
  sourceSha256: string;
  sha256: string;
  changes: string;
};

/** Same physical residence; source images are archival references, never synthetic-defect evidence. */
export const propertyDataset = {
  id: "farnsworth-habs-il1105",
  name: "Edith Farnsworth House",
  location: "Plano, Illinois, United States",
  sourceUrl: "https://www.loc.gov/item/il0323/",
  rightsVerified: true,
  provenance:
    "Measured HABS floor plan and five archived interior photographs depict the same Edith Farnsworth House. The original residence is now a house museum. Photos are archival, with their recorded dates retained; these are not current inspection photographs. No maintenance defect is asserted from these reference images. The 3D interpretation is derived from the measured plan, with approximate zone coordinates and illustrative furniture, not a Gaussian scan.",
  credit:
    "Historic American Buildings Survey / National Park Service; Carol M. Highsmith Archive; Library of Congress, Prints and Photographs Division.",
  floorplan: {
    id: "HABS-IL-1105-sheet-3",
    title: "Measured floor plan \u00b7 sheet 3 of 8",
    sourceUrl: "https://www.loc.gov/pictures/item/il0323.sheet.00003a/",
    rightsSourceUrl:
      "https://commons.wikimedia.org/wiki/File:Plan_-_Edith_Farnsworth_House,_14520_River_Road,_Plano,_Kendall_County,_IL_HABS_ILL,47-PLAN.V,1-_(sheet_3_of_8).tif",
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/ff/Plan_-_Edith_Farnsworth_House%2C_14520_River_Road%2C_Plano%2C_Kendall_County%2C_IL_HABS_ILL%2C47-PLAN.V%2C1-_%28sheet_3_of_8%29.tif/lossy-page1-3840px-Plan_-_Edith_Farnsworth_House%2C_14520_River_Road%2C_Plano%2C_Kendall_County%2C_IL_HABS_ILL%2C47-PLAN.V%2C1-_%28sheet_3_of_8%29.tif.jpg",
    localUrl: "/properties/farnsworth/floorplan.jpg",
    rights:
      "Public domain in the United States: original National Park Service employee drawing, PD-US-NPS; not a copied third-party listing plan.",
    rightsUrl: "https://www.loc.gov/rr/print/res/114_habs.html",
    license: "PD-US-NPS",
    creator: "Elizabeth Milnarik; Brad Roeder",
    capturedAt: "2009",
    credit:
      "Historic American Buildings Survey, National Park Service, Library of Congress",
    sourceSha256:
      "7a2b6e81a0ed35fd0cf71a398d5b911e1449a7bacfde8db21b51af5c12262d0c",
    sha256: "7a2b6e81a0ed35fd0cf71a398d5b911e1449a7bacfde8db21b51af5c12262d0c",
    changes: "Wikimedia-generated JPEG derivative; no further changes.",
  },
  photos: [
    {
      id: "LOC-2010630502",
      roomId: "living",
      title: "Living area and fireplace",
      description:
        "Colour interior looking along the glazed living area toward the fireplace and seating.",
      sourceUrl: "https://www.loc.gov/item/2010630502/",
      rightsSourceUrl:
        "https://commons.wikimedia.org/wiki/File:Interior_view,_living_room,_the_Farnsworth_House,_Plano,_Illinois_LCCN2010630502.tif",
      imageUrl:
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e9/Interior_view%2C_living_room%2C_the_Farnsworth_House%2C_Plano%2C_Illinois_LCCN2010630502.tif/lossy-page1-3840px-Interior_view%2C_living_room%2C_the_Farnsworth_House%2C_Plano%2C_Illinois_LCCN2010630502.tif.jpg",
      localUrl: "/properties/farnsworth/2010630502.jpg",
      rights:
        "Public domain; photographer Carol M. Highsmith stipulated public-domain release. Library of Congress/Commons PD-Highsmith record.",
      rightsUrl: "https://www.loc.gov/rr/print/res/482_high.html",
      license: "PD-Highsmith",
      photographer: "Carol M. Highsmith",
      capturedAt: "2009-07-23",
      credit:
        "Carol M. Highsmith Archive, Library of Congress, Prints and Photographs Division",
      sourceWidth: 3840,
      sourceHeight: 2560,
      sourceSha256:
        "fec805ff6042f7996a626fb876dabef0659a70fbdd8d8eabc54f8a9c23272549",
      sha256:
        "56d3ae22811fd60929132125af6e24ab40dbd931833eec0114a2ffc281ca4275",
      changes:
        "Resized proportionally to 1600px wide and JPEG recompressed; no cropping or content alteration.",
    },
    {
      id: "LOC-2011633512",
      roomId: "bedroom",
      title: "Sleeping area",
      description:
        "Colour view of the sleeping area beside the glazed exterior and wood wardrobe.",
      sourceUrl: "https://www.loc.gov/item/2011633512/",
      rightsSourceUrl:
        "https://commons.wikimedia.org/wiki/File:Bedroom_of_architect_Mies_van_der_Rohe%27s_classic_modernist_Farnsworth_House,_now_a_property_of_the_National_Trust_for_Historic_Preservation_in_Plano,_Illinois_LCCN2011633512.tif",
      imageUrl:
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/82/Bedroom_of_architect_Mies_van_der_Rohe%27s_classic_modernist_Farnsworth_House%2C_now_a_property_of_the_National_Trust_for_Historic_Preservation_in_Plano%2C_Illinois_LCCN2011633512.tif/lossy-page1-3840px-thumbnail.tif.jpg",
      localUrl: "/properties/farnsworth/2011633512.jpg",
      rights:
        "Public domain; photographer Carol M. Highsmith stipulated public-domain release. Library of Congress/Commons PD-Highsmith record.",
      rightsUrl: "https://www.loc.gov/rr/print/res/482_high.html",
      license: "PD-Highsmith",
      photographer: "Carol M. Highsmith",
      capturedAt: "1980\u20132006 (catalogued date range)",
      credit:
        "Carol M. Highsmith Archive, Library of Congress, Prints and Photographs Division",
      sourceWidth: 3840,
      sourceHeight: 2941,
      sourceSha256:
        "38a0aebf3bca3232f374331afe0a1b858ad700f0ac7f2b2a991e5c361e3008c3",
      sha256:
        "f0221f20de6fb4542d46e264196cc1f9f9cd40f881d76bc8945e46c156a1c7c3",
      changes:
        "Resized proportionally to 1600px wide and JPEG recompressed; no cropping or content alteration.",
    },
    {
      id: "LOC-2011633479",
      roomId: "living",
      title: "Dining area",
      description:
        "Colour view of the dining table and cantilever chairs in the open-plan dining area.",
      sourceUrl: "https://www.loc.gov/item/2011633479/",
      rightsSourceUrl:
        "https://commons.wikimedia.org/wiki/File:Interior_views_of_the_1951_Farnsworth,_a_modernist_classic_%22glass_house%22_designed_by_architect_Mies_van_der_Rohe,_Plano,_Illinois_LCCN2011633479.tif",
      imageUrl:
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2c/Interior_views_of_the_1951_Farnsworth%2C_a_modernist_classic_%22glass_house%22_designed_by_architect_Mies_van_der_Rohe%2C_Plano%2C_Illinois_LCCN2011633479.tif/lossy-page1-3840px-Interior_views_of_the_1951_Farnsworth%2C_a_modernist_classic_%22glass_house%22_designed_by_architect_Mies_van_der_Rohe%2C_Plano%2C_Illinois_LCCN2011633479.tif.jpg",
      localUrl: "/properties/farnsworth/2011633479.jpg",
      rights:
        "Public domain; photographer Carol M. Highsmith stipulated public-domain release. Library of Congress/Commons PD-Highsmith record.",
      rightsUrl: "https://www.loc.gov/rr/print/res/482_high.html",
      license: "PD-Highsmith",
      photographer: "Carol M. Highsmith",
      capturedAt: "1980\u20132006 (catalogued date range)",
      credit:
        "Carol M. Highsmith Archive, Library of Congress, Prints and Photographs Division",
      sourceWidth: 3840,
      sourceHeight: 2986,
      sourceSha256:
        "1ae70c6608d7354220ae6c1d8715d98d7cbf31eca391b5ce99fffd5c4afe5778",
      sha256:
        "92d8bc182ad0b4ae8340064c435da08deb4a7619327fa26491258cdc9e60545f",
      changes:
        "Resized proportionally to 1600px wide and JPEG recompressed; no cropping or content alteration.",
    },
    {
      id: "LOC-2011633480",
      roomId: "living",
      title: "Fireplace and seating",
      description:
        "Colour view of the wood-veneered service core, fireplace, chaise and seating.",
      sourceUrl: "https://www.loc.gov/item/2011633480/",
      rightsSourceUrl:
        "https://commons.wikimedia.org/wiki/File:Interior_views_of_the_1951_Farnsworth,_a_modernist_classic_%22glass_house%22_designed_by_architect_Mies_van_der_Rohe,_Plano,_Illinois_LCCN2011633480.tif",
      imageUrl:
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8e/Interior_views_of_the_1951_Farnsworth%2C_a_modernist_classic_%22glass_house%22_designed_by_architect_Mies_van_der_Rohe%2C_Plano%2C_Illinois_LCCN2011633480.tif/lossy-page1-3840px-Interior_views_of_the_1951_Farnsworth%2C_a_modernist_classic_%22glass_house%22_designed_by_architect_Mies_van_der_Rohe%2C_Plano%2C_Illinois_LCCN2011633480.tif.jpg",
      localUrl: "/properties/farnsworth/2011633480.jpg",
      rights:
        "Public domain; photographer Carol M. Highsmith stipulated public-domain release. Library of Congress/Commons PD-Highsmith record.",
      rightsUrl: "https://www.loc.gov/rr/print/res/482_high.html",
      license: "PD-Highsmith",
      photographer: "Carol M. Highsmith",
      capturedAt: "1980\u20132006 (catalogued date range)",
      credit:
        "Carol M. Highsmith Archive, Library of Congress, Prints and Photographs Division",
      sourceWidth: 3840,
      sourceHeight: 2980,
      sourceSha256:
        "16df8de61dadafae979f79e0844207cb1363915c0fefd9d2c74e5169a0ba4a5d",
      sha256:
        "7d12b8eeddd9641a3e63693d0625a6a8e897c2059d5cebd8745d35807f1a2a10",
      changes:
        "Resized proportionally to 1600px wide and JPEG recompressed; no cropping or content alteration.",
    },
    {
      id: "LOC-2011633481",
      roomId: "hallway",
      title: "Circulation beside wardrobe",
      description:
        "Colour view of open-plan circulation beside the freestanding wardrobe. This is not an enclosed hallway.",
      sourceUrl: "https://www.loc.gov/item/2011633481/",
      rightsSourceUrl:
        "https://commons.wikimedia.org/wiki/File:Interior_views_of_the_1951_Farnsworth,_a_modernist_classic_%22glass_house%22_designed_by_architect_Mies_van_der_Rohe,_Plano,_Illinois_LCCN2011633481.tif",
      imageUrl:
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d3/Interior_views_of_the_1951_Farnsworth%2C_a_modernist_classic_%22glass_house%22_designed_by_architect_Mies_van_der_Rohe%2C_Plano%2C_Illinois_LCCN2011633481.tif/lossy-page1-3840px-Interior_views_of_the_1951_Farnsworth%2C_a_modernist_classic_%22glass_house%22_designed_by_architect_Mies_van_der_Rohe%2C_Plano%2C_Illinois_LCCN2011633481.tif.jpg",
      localUrl: "/properties/farnsworth/2011633481.jpg",
      rights:
        "Public domain; photographer Carol M. Highsmith stipulated public-domain release. Library of Congress/Commons PD-Highsmith record.",
      rightsUrl: "https://www.loc.gov/rr/print/res/482_high.html",
      license: "PD-Highsmith",
      photographer: "Carol M. Highsmith",
      capturedAt: "1980\u20132006 (catalogued date range)",
      credit:
        "Carol M. Highsmith Archive, Library of Congress, Prints and Photographs Division",
      sourceWidth: 3840,
      sourceHeight: 3007,
      sourceSha256:
        "01f0cefe476b8ff0743ec20f5ba5add373445e72de0ec2838883ff127c974892",
      sha256:
        "49fb796c45abf4b3d0def727701a8ad60d7e01b5ab63ed1ed75128fc982959fc",
      changes:
        "Resized proportionally to 1600px wide and JPEG recompressed; no cropping or content alteration.",
    },
  ],
  dimensions: {
    units: "metres",
    upperDeckWidth: 23.57,
    upperDeckDepth: 8.74,
    enclosedWidthApprox: 16.83,
    enclosedDepth: 8.74,
    lowerTerraceWidth: 16.84,
    lowerTerraceDepth: 6.9,
    source:
      "HABS IL-1105 sheet 3, dimension labels; enclosed width approximated from image geometry against measured deck width.",
  },
  roomPhotoCoverage: {
    living: true,
    bedroom: true,
    hallway: true,
    kitchen: false,
    bathroom: false,
  },
  zoneNotes: {
    living:
      "The plan labels living, dining and office areas in one continuous open space. Dining photographs retain that distinct title.",
    bedroom:
      "The plan labels a sleeping area screened by a freestanding wardrobe.",
    hallway:
      "Internal workflow ID only: open-plan entry/circulation, not a separate enclosed hallway.",
    kitchen:
      "The measured plan shows a narrow kitchen on the north face of the central core; no kitchen photograph is included in this selected public-domain subset.",
    bathroom:
      "The plan shows separate guest and master bathrooms inside the central core; no bathroom photograph is included in this selected public-domain subset.",
  },
} satisfies { photos: DatasetPhoto[]; [key: string]: unknown };
