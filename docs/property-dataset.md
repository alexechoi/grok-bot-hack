# Property reference dataset

Caretakr's active example is Webster House, from the [Openhouse-3D Webster example](https://github.com/yunfanye/openhouse-3d/tree/b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907/houses/webster). The user selected it for this hackathon reference demo. Five matching photographs show its living room, kitchen, main-floor bedroom, bathroom, and entry/staircase; image 31 supplies the same house's floor plan. Raw image URLs are pinned to commit `b6e5d9b40b9f1d2c12775d8fd5e6a370897cb907`; no Webster image files are bundled into this repository.

`lib/webster-dataset.ts` retains per-image source URLs, original Redfin URLs, exact-byte SHA-256 values and dimensions. All five selected photographs are 1280 × 853 pixels; the plan is 835 × 1080. Photographer and capture dates are not identified in the source manifest. The plan credits Blu Skye Media / bsm.photos. Original image rights are retained; Openhouse-3D's MIT code license does not relicense the images. The manifest records `rightsVerified: false` and `referenceUseAuthorized: true` separately.

Webster's main-floor outline, room relationships and openings are traced directly from `31.jpg`, including the compact offset stair flights, porch and exterior notches. The source image's main-floor bounds are x=95–393, y=418–938 pixels. A uniform display scale of approximately 0.0338666667 metres per pixel uses a 14-foot/126-pixel reference width. This produces an approximately 10.093 × 17.611 metre rendering footprint; these are display estimates, not surveyed dimensions. The source drawing itself describes its dimensions as approximate, and its printed room labels do not consistently match image proportions. The earlier upstream `plan.py` footprint of 11.5 × 18.2 metres is not used to claim the corrected scene's size. Vertical heights and furniture remain illustrative. Synthetic inspection incidents remain separate from actual source photographs.

| Before | After | Why |
| --- | --- | --- |
| Long straight central stair from upstream reconstruction | Compact offset flights traced from the entry junction | Matches the source floor plan's circulation |
| Simplified rectangular main-floor edges | Bathroom notch, rear-bedroom closet projection, family closet and front porch retained | Preserves the same home's recognisable silhouette |
| Main-floor-only preview | Separate traced upper level with deck, two bathrooms, bedrooms and wardrobes | Allows direct comparison with both source-plan panels |
| Upper closet divider and filled wardrobe notch | One accessible rear-bedroom closet and the source exterior notch | Removes geometry absent from the reference drawing |

Independent desktop and mobile browser checks verified both levels and top views, image-gallery access, custom-upload source isolation and the complete synthetic inspection/report flow. Upper-level inspection findings and agents are not invented; its preview remains uninspected.

## Public-domain fallback

The fallback is Edith Farnsworth House in Plano, Illinois: one physical residence with a measured floor plan and matching archival interior photographs. It is now a house museum. The images describe historic appearance; they do not establish its current condition.

The selected six files are in `public/properties/farnsworth/`. `manifest.json` and `ATTRIBUTION.md` retain original record identifiers, exact image and rights-record URLs, credits, recorded dates, transformations and checksums. `lib/property-dataset.ts` exposes the same provenance to the application. Selected drawings have an explicit PD-US-NPS statement; selected Carol M. Highsmith photographs have an explicit public-domain stipulation. Rights were checked per file rather than inferred from collection membership or metadata licensing.

## Layout and coverage

The [measured floor plan, HABS IL-1105 sheet 3](https://www.loc.gov/pictures/item/il0323.sheet.00003a/) shows an open-plan dwelling with a central service core. Dining, living, office and sleeping are zones, not separate enclosed rooms. The application's `hallway` identifier refers to circulation beside the wardrobe. The deck measures 23.57 × 8.74 metres; the lower terrace measures 16.84 × 6.90 metres. The enclosed width is an image-based approximation of 16.83 metres.

The selected photographs show living, dining, sleeping and circulation areas. No selected photograph depicts the kitchen or bathroom. Their plan geometry can be represented, but their current or photographed condition must remain unknown. HABS's later photographic index identifies privately credited photographs; no public-domain permission was established for those kitchen/bathroom images, so they were excluded.

The [elevations and sections, sheet 5](https://www.loc.gov/pictures/item/il0323.sheet.00005a/) were inspected as a modelling reference. Above the lower-terrace datum, the main floor is 2′4″ (0.7112 m), ceiling 11′9″ and cornice 13′6″. Thus the clear floor-to-ceiling height is 2.8702 m and the floor-to-cornice height 3.4036 m. Ground level varies and is not assigned a fabricated absolute height. These drawing references do not turn the procedural model into a measured survey or Gaussian reconstruction.

Synthetic incidents and meter records remain separate from these archival assets. A water leak, blocked route or energy anomaly must never be presented as an observed defect in a real reference photograph.

## Other evaluated sources

- [Rent3D](https://www.cs.toronto.edu/~fidler/projects/rent3D.html): the linked archive returned 404 during evaluation. The authors' later access form required identity/institution details and described noncommercial access; no sample or image-reuse grant was obtained. No rental-listing images were scraped or bundled.
- OpenHouse and ZInD were evaluated separately and were not used as a source of cleared, accessible sample assets.

User-uploaded plans, photos and trained splats remain a separate browser-local preview path. Uploading reference photographs does not train a Gaussian scene or supply an inspection result.
