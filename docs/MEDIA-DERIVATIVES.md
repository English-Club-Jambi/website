# Public Media Derivative Ledger

Generated: 25 August 2026
Tool: ImageMagick 7
Status: documentary derivatives remain local; cleared generated derivatives are verified in R2

Production target: Cloudflare R2 Standard under a versioned prefix such as `english-club/v2/images/`. The documentary files remain QA evidence until consent clears; see `R2-SETUP.md`.

## Method

Each selected master was auto-oriented, stripped of metadata, resized to a maximum width of 2,000 pixels, then encoded as WebP at quality 82 and AVIF at quality 52. Masters remain under `assets/` and are not served. The files keep the original 3:2 composition; responsive crops are applied with documented object positions in the UI so no face is permanently cut from the derivative.

Metadata verification queried GPS latitude, GPS longitude, serial number, body serial number, and artist fields on every output. All returned empty. A binary text scan found no GPS, device, source filename, Canon, or Apple markers.

## Mapping

| Source | Public stem | Dimensions | AVIF / WebP size | Working use | Consent |
| --- | --- | ---: | ---: | --- | --- |
| `_MG_7706.JPG` | `club-room-group` | 2000 x 1333 | 116,678 / 216,834 B | Homepage hero and social club proof | Pending |
| `_MG_8143.JPG` | `club-room-wide` | 2000 x 1333 | 94,854 / 171,360 B | Everyday room context | Pending |
| `_MG_8198.JPG` | `speaking-session` | 2000 x 1333 | 80,650 / 136,082 B | Speaking activity | Pending |
| `IMG_1903.JPG` | `leeds-panel` | 2000 x 1333 | 58,470 / 95,576 B | Leeds story lead | Pending |
| `IMG_2017.JPG` | `leeds-auditorium` | 2000 x 1333 | 105,808 / 197,824 B | Exchange story context | Pending |
| `IMG_2028.JPG` | `leeds-group` | 2000 x 1333 | 126,763 / 233,972 B | About or exchange group | Pending |
| `_MG_7702.JPG` | `club-room-selfie` | 2000 x 1333 | 94,350 / 167,840 B | Informal participation | Pending |
| `_MG_7713.JPG` | `club-room-portrait` | 2000 x 1333 | 75,364 / 124,180 B | Small documentary portrait | Pending |
| `_MG_8145.JPG` | `shared-work` | 2000 x 1333 | 89,432 / 164,468 B | Shared work activity | Pending |
| `_MG_8170.JPG` | `table-conversation` | 2000 x 1333 | 145,775 / 283,970 B | Table conversation | Pending |

## Excluded masters

- `IMG_3165.JPG` and `MVI_3166.MOV`: held because children and audio create a higher consent requirement.
- `_MG_8144.JPG`: held because motion blur makes it unsuitable.
- `IMG_4945.JPG`: not selected because the 965 x 543 source is weaker than the higher-resolution panel photograph and contains precise GPS in the master.

## Cleared generated derivatives

These temporary identity assets contain no real member likeness. Their exact generation prompts and local evidence paths are recorded in `GENERATED-ASSET-LEDGER.md`.

| Object key | Format | R2 state |
| --- | --- | --- |
| `images/conversation-hero-placeholder.avif` | AVIF | Uploaded and verified with `HeadObject` |
| `images/conversation-hero-placeholder.webp` | WebP | Uploaded and verified with `HeadObject` |
| `images/member-relay-placeholder.avif` | AVIF | Uploaded and verified with `HeadObject` |
| `images/member-relay-placeholder.webp` | WebP | Uploaded and verified with `HeadObject` |
| `images/member-directory-portraits-v1.avif` | AVIF | Uploaded and verified with `HeadObject` |
| `images/member-directory-portraits-v1.webp` | WebP | Uploaded and verified with `HeadObject` |

## SHA-256

```text
69e4f70335cae76b2da48bea45bd51c946ab920ef8ee5fcee23e64ce75e7aeba  club-room-group.avif
7f6fbba7f7d52dc30aa4e4904281daea427a8c83f6f095aef91e38f77cdc9d3a  club-room-group.webp
271633116191cdf9692e5bfca8b73c14bc85c62b5dbbbd91745edc5c35365c1a  club-room-portrait.avif
e5705553c78d42b9bf22891a306e8f300acc9feb1a10b1317ef41e65a1f0c044  club-room-portrait.webp
c5b009b760320187e2832c4d4e7805aa2d45824622c4140d6e7603ee46e8a827  club-room-selfie.avif
d8b34212bb0cab3150fa639c69227ba4c70456be43eeeb873e35f4485044f17d  club-room-selfie.webp
1c8be70a5c889e3fbe3af13c3bac8c1ac9d065163bfa2c2c9b44cf57a9a4b1d8  club-room-wide.avif
1aa488d2e0dfd6862016d4f9129f1efb004be92a2c368798e89a2aeea7e87247  club-room-wide.webp
43a80da78768014b2278f99d0f3fd9f23a3e2acfc0c3d68db1226cf34e2e383c  leeds-auditorium.avif
0f8221d6a5024f561b3951b17d9c0039b8488d31056380bdc82419f244d015ad  leeds-auditorium.webp
8d1c699c778cacb85bc825e054af785fb9eaf29cdb3f654599409de0896f5eba  leeds-group.avif
ce7a2b9458ac7e834e194ab0fc6f327e8cb91bd2f06a3bc8fff4949e54cd26eb  leeds-group.webp
f8690066f608e524bbf340b495850652bd353a48abc5f25529c70616e599659a  leeds-panel.avif
8f943f5231b28b656e638096b6735a6277b2cb250af7abe1c0ce2c882e48cd78  leeds-panel.webp
782de8674de13148584c91322ea613b283b3bf8e107024720f7f312d45de17df  shared-work.avif
ba29bcb3e4221b7ed7bb8865e3ede1d12bfd0a2942dbcc62172eec12cafb8053  shared-work.webp
7b847f8b5049073129893fc552a4c52945018edcd852ff42e1f649dae743a89d  speaking-session.avif
840ec97318969efa8f3c1e384038d5cb7d8c4190cd6c112b5bba72ed6629a03d  speaking-session.webp
6d52cada22ccc16a123ffee9aaaaf83fd5642c54c77ea5d9011bd9cec8a45ba7  table-conversation.avif
e91798cc6262c70a199273c45f47563475c536dd961fb391b139e9f9e2a41f68  table-conversation.webp
743196303209330e0eeefdf22887b7ae93ba80abd8b1c037b11b7c101ba00406  member-directory-portraits-v1.avif
21692fef77353d11e05703454365b7e4cb79cefa0a0fb1ceb52628b0b5ddadb6  member-directory-portraits-v1.webp
```

## Remaining checks

- [x] Inspect responsive crops at phone, tablet, and wide screenshots.
- [ ] Confirm publication consent for every included participant image.
- [x] Upload and verify the six cleared generated derivatives.
- [ ] Upload documentary derivatives only after their individual consent state clears.
- [ ] Re-run metadata and hash checks after any crop or re-encode.
