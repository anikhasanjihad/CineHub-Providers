import { getBaseUrl } from "../getBaseUrl";
import { Post, ProviderContext } from "../types";
import { throwProviderError } from "../providerErrors";

const providerValue = "moviehubbd";
const defaultBaseUrl = "https://moviehubbd.net";

const defaultHeaders = {
  Referer: "https://www.google.com/",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

async function getWithWAF(
  url: string,
  axios: any,
  openWebView: any,
  headers: any,
  signal?: AbortSignal,
): Promise<any> {
  const baseUrl = url.split("/").slice(0, 3).join("/");
  try {
    return await axios.get(url, {
      headers: { ...headers, Referer: `${baseUrl}/` },
      signal,
    });
  } catch (error: any) {
    if (error.response?.status === 403 && openWebView) {
      console.log(`[MovieHubBD] WAF (403) detected for ${url}, opening webview solver...`);
      const wafResult = await openWebView(baseUrl, {
        title: "MovieHubBD Verification",
        description: "Please complete verification if prompted.",
        headers: { ...headers, Referer: `${baseUrl}/` },
        waitForCookie: "cf_clearance",
        force: true,
      });
      return await axios.get(url, {
        headers: {
          ...headers,
          Referer: `${baseUrl}/`,
          Cookie: wafResult?.cookie || "",
        },
        signal,
      });
    }
    throw error;
  }
}

async function fetchPosts(
  url: string,
  baseUrl: string,
  signal: AbortSignal,
  providerContext: ProviderContext,
): Promise<Post[]> {
  const { axios, cheerio, commonHeaders, openWebView } = providerContext;
  try {
    const headers = { ...defaultHeaders, ...commonHeaders };
    const response = await getWithWAF(url, axios, openWebView, headers, signal);
    const $ = cheerio.load(response.data || "");
    const posts: Post[] = [];

    const selectors = [
      ".post-item",
      "article.post",
      ".movie-card",
      ".item",
      ".thumb",
      ".latest-posts article",
    ];

    let items = $(selectors.join(", "));
    if (items.length === 0) {
      items = $("article, .entry, .card");
    }

    items.each((_, el) => {
      const card = $(el);
      const linkElem = card.find("a").first();
      let link = linkElem.attr("href") || card.attr("href") || "";

      let title =
        card.find(".entry-title, .title, h2, h3").first().text().trim() ||
        linkElem.attr("title")?.trim() ||
        card.find("img").attr("alt")?.trim() ||
        "";

      let img =
        card.find("img").attr("src") ||
        card.find("img").attr("data-src") ||
        card.find("img").attr("data-lazy-src") ||
        "";

      if (link && title) {
        if (!link.startsWith("http")) {
          try {
            link = new URL(link, baseUrl).href;
          } catch {}
        }
        if (img && !img.startsWith("http")) {
          try {
            img = new URL(img, baseUrl).href;
          } catch {}
        }
        posts.push({ title, link, image: img });
      }
    });

    return posts;
  } catch (err: any) {
    return throwProviderError(providerValue, "fetchPosts", err);
  }
}

export const getPosts = async function ({
  filter,
  page,
  signal,
  providerContext,
}: {
  filter: string;
  page: number;
  providerValue: string;
  providerContext: ProviderContext;
  signal: AbortSignal;
}): Promise<Post[]> {
  const baseUrl = (await getBaseUrl(providerValue)) || defaultBaseUrl;
  let url = `${baseUrl}${filter || ""}`;
  if (page && page > 1) {
    url = `${url.replace(/\/+$/, "")}/page/${page}/`;
  } else {
    url = `${url.replace(/\/+$/, "")}/`;
  }
  return fetchPosts(url, baseUrl, signal, providerContext);
};

export const getSearchPosts = async function ({
  searchQuery,
  page,
  signal,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerValue: string;
  providerContext: ProviderContext;
  signal: AbortSignal;
}): Promise<Post[]> {
  const baseUrl = (await getBaseUrl(providerValue)) || defaultBaseUrl;
  let url = `${baseUrl}/?s=${encodeURIComponent(searchQuery)}`;
  if (page && page > 1) {
    url = `${baseUrl}/page/${page}/?s=${encodeURIComponent(searchQuery)}`;
  }
  return fetchPosts(url, baseUrl, signal, providerContext);
};
