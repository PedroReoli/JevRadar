const REQUIRED_ENVIRONMENT = [
  "JEVRADAR_UPDATER_PUBLIC_KEY",
  "JEVRADAR_UPDATER_ENDPOINT",
  "TAURI_SIGNING_PRIVATE_KEY",
  "TAURI_SIGNING_PRIVATE_KEY_PASSWORD",
  "WINDOWS_CERTIFICATE_THUMBPRINT",
  "JEVRADAR_TIMESTAMP_URL",
];

function requiredValue(environment, name) {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}

function secureUrl(value, name) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} precisa ser uma URL válida.`);
  }
  if (parsed.protocol !== "https:") throw new Error(`${name} precisa usar HTTPS.`);
  return parsed.toString();
}

export function validateReleaseEnvironment(environment) {
  const values = Object.fromEntries(REQUIRED_ENVIRONMENT.map((name) => [name, requiredValue(environment, name)]));
  const thumbprint = values.WINDOWS_CERTIFICATE_THUMBPRINT.replaceAll(/\s/g, "").toUpperCase();
  if (!/^[A-F0-9]{40}$/.test(thumbprint)) {
    throw new Error("WINDOWS_CERTIFICATE_THUMBPRINT precisa conter os 40 caracteres hexadecimais do certificado.");
  }
  return {
    endpoint: secureUrl(values.JEVRADAR_UPDATER_ENDPOINT, "JEVRADAR_UPDATER_ENDPOINT"),
    publicKey: values.JEVRADAR_UPDATER_PUBLIC_KEY,
    thumbprint,
    timestampUrl: secureUrl(values.JEVRADAR_TIMESTAMP_URL, "JEVRADAR_TIMESTAMP_URL"),
  };
}

export function createReleaseConfig(environment) {
  const values = validateReleaseEnvironment(environment);
  return {
    bundle: {
      createUpdaterArtifacts: true,
      windows: {
        certificateThumbprint: values.thumbprint,
        digestAlgorithm: "sha256",
        timestampUrl: values.timestampUrl,
      },
    },
    plugins: {
      updater: {
        endpoints: [values.endpoint],
        pubkey: values.publicKey,
        windows: { installMode: "passive" },
      },
    },
  };
}
