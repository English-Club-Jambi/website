# Cloudflare R2 Research Ledger

Verified: 25 August 2026
Source rule: official Cloudflare documentation only
Decision: Cloudflare R2 Standard stores public derivatives; Convex remains the database

## Evidence table

| Question | Verified evidence | Project decision | Source |
| --- | --- | --- | --- |
| What is free? | Standard includes 10 GB-month storage, 1 million Class A operations, 10 million Class B operations each month; direct R2 egress is free | Treat this as included usage, not a spending cap | [Pricing](https://developers.cloudflare.com/r2/pricing/) |
| Which storage class? | Free tier does not apply to Infrequent Access | Use Standard only | [Pricing](https://developers.cloudflare.com/r2/pricing/) |
| Is R2 activation required? | R2 must be purchased or enabled before an R2 API token can be created | Document the activation step and do not promise a zero-billing-account setup | [Authentication](https://developers.cloudflare.com/r2/api/tokens/) |
| How is production media exposed? | Buckets are private by default; custom domains provide public access and Cloudflare Cache | Use `media.<domain>` after consent clears | [Public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/) |
| Is `r2.dev` suitable for production? | The development URL is rate-limited and lacks cache, WAF, and bot-management features | Development only; disable it in production | [Public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/) |
| How are operator uploads authenticated? | S3 tools use a scoped Access Key ID and Secret Access Key | Keep bucket-scoped S3 credentials in the Convex Cloud environment; the repository helper receives only a short-lived operation URL | [S3 setup](https://developers.cloudflare.com/r2/get-started/s3/) |
| What is the S3 endpoint? | Default endpoint is `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`; SDK region is `auto` | Keep endpoint and credentials server-only | [S3 setup](https://developers.cloudflare.com/r2/get-started/s3/) |
| When is CORS required? | Browser access to presigned URLs fails without a matching bucket CORS policy | The editor currently streams through a same-origin Next.js relay; switch to direct PUT after exact-origin CORS is installed | [CORS](https://developers.cloudflare.com/r2/buckets/cors/) |
| How do presigned URLs behave? | They grant one named S3 operation on one object for 1 second to 7 days; supported operations are GET, HEAD, PUT, DELETE; POST is unsupported; custom domains cannot sign them | The internal Convex action issues a 300-second PUT URL for one validated immutable key, then verifies the result with `HeadObject` | [Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) |

## Architecture result

```mermaid
flowchart LR
  B["Browser"] --> N["Next.js upload relay"]
  N --> C[("Convex data")]
  N --> I["next/image"]
  I --> D["R2 custom domain"]
  D --> R[("R2 Standard objects")]
  K["Typed media manifest"] --> I
  K --> O["Stable object keys"]
  O --> R
  N -->|"Validated presigned PUT"| R
  H["Operator helper"] --> A["Internal Convex action"]
  A -->|"Presigned PUT contract"| H
  H -->|"Direct PUT"| R
```

The public site reads immutable derivatives and never receives S3 credentials. Convex issues one 300-second URL for a fixed object path and signed metadata. Until the bucket has exact-origin CORS, the browser sends the raw file to a same-origin Next.js route; that route checks the URL against the configured account and bucket before streaming it to R2. Convex then checks the stored object with `HeadObject`. Direct browser PUT should replace the relay after CORS is configured because it removes the extra transfer through Next.js. The custom domain still handles public reads.

## Rejected patterns

- Convex File Storage for media: superseded by the user's R2 decision.
- Infrequent Access: excluded because this site reads images frequently and the free tier does not apply.
- `r2.dev` in production: excluded because Cloudflare labels it development-only and rate-limited.
- Public S3 credentials: excluded because the public read path does not need them.
- Wildcard upload CORS: excluded; each browser origin must be named exactly before direct PUT is enabled.
- Presigned URLs through the custom domain: unsupported by Cloudflare; signing uses the S3 API domain.
- Uploading unreviewed masters: excluded by privacy and consent gates. Reviewed public derivatives may use the browser allowlist (AVIF, JPEG, PNG, or WebP); Member portraits remain AVIF/WebP-only and every real-person asset still requires the applicable rights and consent.

## Verified implementation state

- The existing Convex Cloud development deployment is selected and the functions are pushed.
- Bucket connectivity passes from the Convex Node runtime.
- A real admin editor upload returned 204 through the relay, passed Convex HEAD verification, loaded from `r2.mukhtada.my.id`, and reappeared as a ready Media Library record.
- Six generated AVIF/WebP derivatives are present and verified by `HeadObject`.
- Existing object keys are rejected before a signed URL is issued.
- The named development deployment contains 15 explicitly fictional, seed-batch-labelled Member records and five managed divisions; this is not a production roster.

## Open production inputs

- Exact production application origin for auth and optional direct-upload CORS.
- Confirmation that the domain zone and R2 bucket share a Cloudflare account.
- Per-image public consent for documentary media.
- Production confirmation for the already verified `https://r2.mukhtada.my.id` public read domain.

These are release inputs, not missing code decisions. Setup and the verified command path remain in `R2-SETUP.md`.
