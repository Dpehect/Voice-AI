export type Language = {
  code: string;
  name: string;
  native_name: string;
};

export type Health = {
  status: string;
  model_loaded: boolean;
  device: string;
};

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: string };
    return body.detail || "İşlem tamamlanamadı.";
  } catch {
    return "Sunucuyla bağlantı kurulamadı.";
  }
}

export async function getHealth(signal?: AbortSignal): Promise<Health> {
  const response = await fetch(`${API_URL}/api/health`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function getLanguages(): Promise<Language[]> {
  const response = await fetch(`${API_URL}/api/languages`, { cache: "no-store" });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function synthesize(
  file: File,
  text: string,
  language: string,
  speed: number,
  consent: boolean,
): Promise<Blob> {
  const form = new FormData();
  form.append("voice", file);
  form.append("text", text);
  form.append("language", language);
  form.append("speed", speed.toString());
  form.append("consent", consent.toString());

  const response = await fetch(`${API_URL}/api/synthesize`, { method: "POST", body: form });
  if (!response.ok) throw new Error(await parseError(response));
  return response.blob();
}

