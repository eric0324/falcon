import { getConfig } from "@/lib/config";

const WEBINARJAM_BASE_URL = "https://api.webinarjam.com/webinarjam";

export class WebinarjamApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "WebinarjamApiError";
  }
}

export interface Webinar {
  webinar_id: string;
  name: string;
  description: string;
  type: string;
  series: number;
  schedules: string[] | Array<{ date: string; schedule: number }>;
  timezone: string;
}

export interface Presenter {
  name: string;
  email: string;
  picture: string;
}

export interface WebinarDetail {
  webinar_id: string;
  name: string;
  description: string;
  type: string;
  series: number;
  schedules: Array<{ date: string; schedule: number }>;
  timezone: string;
  presenters: Presenter[];
  registration_url: string;
  registration_type: string;
  registration_fee: number;
  registration_currency: string;
  registration_checkout_url: string;
  registration_post_payment_url: string;
}

export interface Registrant {
  first_name: string;
  last_name?: string;
  email: string;
  ip?: string;
  attended_live?: number;
  attended_replay?: number;
  purchased_live?: number;
  revenue_live?: string;
  phone?: string;
  signup_date?: string;
  date_live?: string;
  time_live?: string;
  [key: string]: unknown;
}

export async function isWebinarjamConfigured(): Promise<boolean> {
  return !!(await getConfig("WEBINARJAM_API_KEY"));
}

async function getApiKey(): Promise<string> {
  const key = await getConfig("WEBINARJAM_API_KEY");
  if (!key) throw new WebinarjamApiError("WEBINARJAM_API_KEY is not configured");
  return key;
}

async function webinarjamPost<T>(
  path: string,
  body: Record<string, string | number | undefined>
): Promise<T> {
  const apiKey = await getApiKey();
  const form = new URLSearchParams();
  form.set("api_key", apiKey);
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined) continue;
    form.set(k, String(v));
  }

  const res = await fetch(`${WEBINARJAM_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const json = await res.json();
      detail = (json as { message?: string }).message || detail;
    } catch { /* ignore */ }
    throw new WebinarjamApiError(
      `WebinarJam API error (${res.status}): ${detail}`,
      res.status
    );
  }

  const json = (await res.json()) as { status?: string; message?: string } & T;
  if (json.status === "error") {
    throw new WebinarjamApiError(
      json.message || "WebinarJam API returned status: error"
    );
  }
  return json;
}

export async function listWebinars(): Promise<Webinar[]> {
  const data = await webinarjamPost<{ webinars: Webinar[] }>("/webinars", {});
  return data.webinars || [];
}

export async function getWebinar(webinarId: string): Promise<WebinarDetail> {
  const data = await webinarjamPost<{ webinar: WebinarDetail }>("/webinar", {
    webinar_id: webinarId,
  });
  return data.webinar;
}

export interface GetRegistrantsParams {
  webinarId: string;
  scheduleId: number;
  attendedLive?: 0 | 1 | 2 | 3 | 4;
  attendedReplay?: 0 | 1 | 2 | 3 | 4;
  purchased?: 0 | 1 | 2;
  search?: string;
  page?: number;
}

export async function getRegistrants(
  params: GetRegistrantsParams
): Promise<Registrant[]> {
  const data = await webinarjamPost<{ data?: Registrant[] }>("/registrants", {
    webinar_id: params.webinarId,
    schedule_id: params.scheduleId,
    attended_live: params.attendedLive,
    attended_replay: params.attendedReplay,
    purchased: params.purchased,
    search: params.search,
    page: params.page,
  });
  return data.data || [];
}
