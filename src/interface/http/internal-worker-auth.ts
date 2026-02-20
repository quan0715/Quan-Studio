type HeaderCarrier = {
  headers: Headers;
};

export function isInternalWorkerRequest(request: HeaderCarrier): boolean {
  const configuredSecret = (process.env.STUDIO_SESSION_SECRET ?? "").trim();
  if (!configuredSecret) {
    return false;
  }

  const incomingSecret = (request.headers.get("x-studio-internal-token") ?? "").trim();
  return incomingSecret.length > 0 && incomingSecret === configuredSecret;
}
