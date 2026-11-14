import { getBaseUrl } from "../getBaseUrl";
import { Info, Link, ProviderContext } from "../types";
import { throwProviderError } from "../providerErrors";

const providerValue = "mlsbd";
const defaultBaseUrl = "https://mlsbd.co";

const defaultHeaders = {
  Referer: "https://www.google.com/",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

function cleanQuality(text: string): string {
  const match = text.match(/\b(480p|720p|1080p|2160p|4k)\b/i);
  if (match) return match[1].toLowerCase();
  return "";
}

export const getMeta = async function ({
  link,
  providerContext,
}: {
  link: string;
  providerContext: ProviderContext;
}): Promise<Info> {
  const { axios, cheerio, commonHeaders, openWebView } = providerContext;
  try {
    const baseUrl = (await getBaseUrl(providerValue)) || defaultBaseUrl;
    const url = new URL(link, baseUrl).href;

    let response: any;
    try {
      response = await axios.get(url, {
        headers: { ...defaultHeaders, ...commonHeaders, Referer: `${baseUrl}/` },
      });
    } catch (err: any) {
      if (err.response?.status === 403 && openWebView) {
        const wafResult = await openWebView(baseUrl, {
          title: "MLSBD Protection Check",
          description: "Please complete verification if prompted.",
          headers: { ...defaultHeaders, Referer: `${baseUrl}/` },
          waitForCookie: "cf_clearance",
          force: true,
        });
        response = await axios.get(url, {
          headers: {
            ...defaultHeaders,
            Referer: `${baseUrl}/`,
            Cookie: wafResult?.cookie || "",
          },
        });
      } else {
        throw err;
      }
    }

    const $ = cheerio.load(response.data || "");

    const title =
      $("h1.entry-title, h1.title, .entry-title").first().text().trim() ||
      $('meta[property="og:title"]').attr("content") ||
      $("title").text().split("-")[0].trim();

    const image =
      $('meta[property="og:image"]').attr("content") ||
      $(".entry-content img").first().attr("src") ||
      $(".attachment-post-thumbnail").first().attr("src") ||
      "";

    let synopsis =
      $('meta[property="og:description"]').attr("content") ||
      $(".entry-content p").first().text().trim() ||
      "";

    // Detect IMDb ID
    let imdbId: string | undefined;
    const imdbMatch = (response.data || "").match(/tt\d{7,8}/i);
    if (imdbMatch) {
      imdbId = imdbMatch[0];
    }

    // Detect Series vs Movie
    const isSeries =
      /season|episode|s\d{1,2}|series|complete/i.test(title) ||
      /category\/web-series|category\/tv-series/i.test(response.data || "");

    const type = isSeries ? "series" : "movie";
    const linkList: Link[] = [];

    // Find download / stream links in entry content
    const directLinksFound: { title: string; link: string; quality?: string }[] = [];

    $(".entry-content a, .download-links a, a.btn, a.download-btn, a[href*='download']").each(
      (_, el) => {
        const a = $(el);
        const href = a.attr("href") || "";
        const text = a.text().trim();

        if (
          !href ||
          href.startsWith("#") ||
          href.includes("javascript:") ||
          href.includes("wp-admin") ||
          href.includes("telegram") ||
          href.includes("facebook")
        ) {
          return;
        }

        // Likely stream / download link
        if (
          /hubcloud|fastdl|drive|gdtot|filepress|zcloud|buzzheavier|gofile|fsl|mega|sharer|download|link/i.test(
            href,
          ) ||
          /download|watch|stream|720p|1080p|480p|4k|episode/i.test(text)
        ) {
          const q = cleanQuality(text) || cleanQuality(href);
          directLinksFound.push({
            title: text || `Server ${directLinksFound.length + 1}`,
            link: href,
            quality: q || "720p",
          });
        }
      },
    );

    if (isSeries) {
      // Group series episodes
      const episodesMap = new Map<string, { title: string; link: string }[]>();
      directLinksFound.forEach((item, idx) => {
        const epMatch = item.title.match(/ep(?:isode)?\s*(\d+)/i);
        const epNum = epMatch ? epMatch[1] : `${idx + 1}`;
        const groupName = "Season 1";

        if (!episodesMap.has(groupName)) {
          episodesMap.set(groupName, []);
        }
        episodesMap.get(groupName)!.push({
          title: `Episode ${epNum}`,
          link: item.link,
        });
      });

      for (const [seasonTitle, epList] of episodesMap.entries()) {
        linkList.push({
          title: seasonTitle,
          directLinks: epList.map((ep) => ({
            title: ep.title,
            link: ep.link,
            type: "series",
          })),
        });
      }
    } else {
      // For movie, group by quality
      if (directLinksFound.length > 0) {
        linkList.push({
          title: "Movie",
          quality: directLinksFound[0]?.quality || "1080p",
          directLinks: directLinksFound.map((d) => ({
            title: d.title || "Movie Stream",
            link: d.link,
            type: "movie",
          })),
        });
      }
    }

    return {
      title,
      synopsis,
      image,
      imdbId,
      type,
      linkList,
    };
  } catch (err: any) {
    return throwProviderError(providerValue, "getMeta", err);
  }
};
