type RequiredUploadHeaders = {
  contentType: string;
  cacheControl: string;
};

type RelayAdminMediaUploadArgs = {
  uploadUrl: string;
  file: File;
  requiredHeaders: RequiredUploadHeaders;
};

const relayPath = "/api/admin/media-upload";

function responseErrorMessage(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string" &&
    value.error.length <= 240
  ) {
    return value.error;
  }
  return "The media upload could not be completed. Try again.";
}

export async function relayAdminMediaUpload({
  uploadUrl,
  file,
  requiredHeaders,
}: RelayAdminMediaUploadArgs) {
  let response: Response;
  try {
    response = await fetch(relayPath, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        "Content-Type": requiredHeaders.contentType,
        "Cache-Control": requiredHeaders.cacheControl,
        "X-English-Club-R2-Upload": uploadUrl,
      },
      body: file,
    });
  } catch {
    throw new Error(
      "The upload service could not be reached. Check your connection and try again.",
    );
  }

  if (response.ok) {
    return;
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // The relay deliberately keeps untrusted upstream error bodies private.
  }
  throw new Error(responseErrorMessage(body));
}
