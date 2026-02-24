import axios, { AxiosInstance, AxiosError } from 'axios';
import { error as printError, warn, spinner } from './output';

const BASE_URLS: Record<string, string> = {
  us: 'https://api.intercom.io',
  eu: 'https://api.eu.intercom.io',
  au: 'https://api.au.intercom.io',
};

const API_VERSION = '2.11';
const RATE_LIMIT_MAX = 1000;
const RATE_LIMIT_WARN_THRESHOLD = 900;

export class IntercomClient {
  private http: AxiosInstance;
  private requestCount = 0;
  private windowStart = Date.now();

  constructor(token: string, region: 'us' | 'eu' | 'au' = 'us') {
    const baseURL = BASE_URLS[region] || BASE_URLS.us;

    this.http = axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Intercom-Version': API_VERSION,
      },
      timeout: 30000,
    });

    this.http.interceptors.response.use(undefined, (err: AxiosError) =>
      this.handleError(err)
    );
  }

  private trackRequest(): void {
    const now = Date.now();
    if (now - this.windowStart > 60000) {
      this.requestCount = 0;
      this.windowStart = now;
    }
    this.requestCount++;
    if (this.requestCount >= RATE_LIMIT_WARN_THRESHOLD) {
      warn(
        `Approaching rate limit: ${this.requestCount}/${RATE_LIMIT_MAX} requests this minute.`
      );
    }
  }

  private async handleError(err: AxiosError): Promise<never> {
    if (!err.response) {
      printError('Could not connect to Intercom. Check your internet connection.');
      throw err; // unreachable — printError calls process.exit
    }

    const status = err.response!.status;
    const body = err.response!.data as Record<string, any> | undefined;
    const message =
      body?.errors?.[0]?.message ||
      body?.message ||
      err.message ||
      'Unknown error';

    switch (status) {
      case 401:
        printError(
          "Authentication failed. Run 'intercom auth login' to set your token.",
          2
        );
        break; // unreachable — printError exits
      case 403:
        printError(
          'Permission denied. Your token may not have access to this resource.'
        );
        break;
      case 404:
        printError(`Not found: ${message}`, 3);
        break;
      case 429: {
        const retryAfter = parseInt(
          (err.response!.headers['retry-after'] as string) || '10',
          10
        );
        const spin = spinner(`Rate limited. Waiting ${retryAfter}s...`);
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        spin.succeed('Retrying...');
        // Retry the original request
        return this.http.request(err.config!);
      }
      default:
        if (status >= 500) {
          printError(`Intercom API error (${status}): ${message}`);
        } else {
          printError(`Request failed (${status}): ${message}`);
        }
    }

    // Fallback — should not reach here since printError calls process.exit
    throw err;
  }

  async get<T = any>(path: string, params?: Record<string, any>): Promise<T> {
    this.trackRequest();
    const res = await this.http.get(path, { params });
    return res.data;
  }

  async post<T = any>(path: string, body: Record<string, any> = {}): Promise<T> {
    this.trackRequest();
    const res = await this.http.post(path, body);
    return res.data;
  }

  async put<T = any>(path: string, body: Record<string, any> = {}): Promise<T> {
    this.trackRequest();
    const res = await this.http.put(path, body);
    return res.data;
  }

  async delete<T = any>(path: string): Promise<T> {
    this.trackRequest();
    const res = await this.http.delete(path);
    return res.data;
  }

  /**
   * Auto-paginate through cursor-based Intercom responses.
   * Follows `pages.next.starting_after` until exhausted.
   * Returns all items as a flat array.
   */
  async paginate<T = any>(
    path: string,
    params: Record<string, any> = {},
    dataKey = 'data',
    limit?: number
  ): Promise<T[]> {
    const results: T[] = [];
    let cursor: string | undefined;

    while (true) {
      const query: Record<string, any> = { ...params, per_page: 50 };
      if (cursor) {
        query.starting_after = cursor;
      }

      this.trackRequest();
      const res = await this.http.get(path, { params: query });
      const body = res.data;

      const items: T[] = body[dataKey] || [];
      results.push(...items);

      if (limit && results.length >= limit) {
        return results.slice(0, limit);
      }

      const next = body.pages?.next;
      if (next?.starting_after) {
        cursor = next.starting_after;
      } else {
        break;
      }
    }

    return results;
  }

  /**
   * Paginate a search endpoint (POST-based pagination).
   * Follows `pages.next.starting_after` with POST requests.
   */
  async paginateSearch<T = any>(
    path: string,
    body: Record<string, any>,
    dataKey = 'data',
    limit?: number
  ): Promise<T[]> {
    const results: T[] = [];
    let cursor: string | undefined;

    while (true) {
      const payload: Record<string, any> = { ...body };
      if (cursor) {
        payload.pagination = { starting_after: cursor };
      }

      this.trackRequest();
      const res = await this.http.post(path, payload);
      const data = res.data;

      const items: T[] = data[dataKey] || [];
      results.push(...items);

      if (limit && results.length >= limit) {
        return results.slice(0, limit);
      }

      const next = data.pages?.next;
      if (next?.starting_after) {
        cursor = next.starting_after;
      } else {
        break;
      }
    }

    return results;
  }
}
