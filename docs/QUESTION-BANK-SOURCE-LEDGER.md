# Question Bank source ledger

Date checked: 26 August 2026

## Boundary

The seeded bank uses English Club-authored passages, prompts, distractors, transcripts, rubrics, and answer keys. Internet sources supply the public test blueprint and factual research only. The seed does not copy ETS sample questions, commercial preparation books, or third-party question banks.

Each Convex bank row carries `original-question`, `source-ets-2026-blueprint`, and, where relevant, one topic source tag. The source assessment also stores the full ledger in `provenanceJson` when a new controlled seed is created.

## Sources used

| Source ID | Source | How it is used |
| --- | --- | --- |
| `ets-2026-blueprint` | [ETS: Test Content and Structure](https://www.ets.org/toefl/test-takers/ibt/about/content.html) | Task families, public item counts, and approximate base times. No ETS item content is copied. |
| `epa-urban-tree-cooling` | [US EPA: Benefits of Trees and Vegetation](https://www.epa.gov/heatislands/benefits-trees-and-vegetation) | Facts about shade, evapotranspiration, placement, and unequal heat exposure. |
| `nih-sleep-memory` | [PubMed Central: Sleep smart](https://pmc.ncbi.nlm.nih.gov/articles/PMC4428077/) | Research background on replay and memory consolidation. |
| `noaa-reef-soundscape` | [NOAA: Soundscape](https://floridakeys.noaa.gov/science/research-highlights/soundscape.html) | Reef sound sources, hydrophones, and soundscape monitoring. |
| `smithsonian-pottery` | [Smithsonian: Archaeological ceramics record](https://www.si.edu/object/thin-section-petrography-geochemistry-and-scanning-electron-microscopy-archaeological-ceramics%3Asiris_sil_1158129) | CC0 metadata and research direction for ceramic composition and provenance. No book text is reproduced. |
| `usda-pollinator-habitat` | [USDA NRCS: Pollinator Habitat Assessment Guide](https://www.nrcs.usda.gov/sites/default/files/2024-04/19-038_02_HAG_Yard-Park-Garden.pdf) | Facts about forage, nesting, and small urban habitat sites. |
| `usfs-seed-germination` | [US Forest Service: Seed Germination and Sowing Options](https://research.fs.usda.gov/treesearch/download/46349.pdf) | Background on dormancy, cold-moist treatment, fire, and smoke cues. |
| `usgs-paleoclimate` | [USGS: Paleoclimate Reconstruction from Marine and Lake Sediments](https://www.usgs.gov/centers/spcmsc/science/paleoclimate-reconstruction-marine-and-lake-sediments) | Public-domain background on sediment cores, microfossils, and multi-proxy reconstruction. |

## Score language

ETS states that the 2026 test reports four section scores and an overall result on a 1–6 scale, with a comparable 0–120 display during the transition period. English Club does not have ETS calibration data or certified human raters. The product therefore reports exact raw performance for the questions delivered, then labels its band and 0–120 conversions as English Club estimates. It never labels them official TOEFL scores, admission evidence, or certificates.

## Seed acceptance

- Full practice: 50 Reading, 47 Listening, 12 Writing, and 11 Speaking tasks.
- Quick practice: one bounded definition per skill.
- All published bank questions have private answer keys and a reviewed source version.
- Full-practice selection is stored as an immutable per-attempt manifest.
- Source tags and the seed checksum remain visible in the admin Question Bank.
- A rerun is idempotent and does not duplicate definitions, items, media, or bank entries.
