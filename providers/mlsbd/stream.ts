import { ProviderContext, Stream } from "../types";
import { hubcloudExtractor } from "../extractors/hubcloud";
import { zcloudExtractor } from "../extractors/zcloud";
import { buzzheavierExtractor } from "../extractors/buzzheavier";
import { gofileExtractor } from "../extractors/gofile";
import { throwProviderError } from "../providerErrors";

const providerValue = "mlsbd";

export const getStream = async function ({
  link,
  type,
  signal,
  providerContext,
  isDownload,
}: {
  link: string;
  type: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
  isDownload?: boolean;
}): Promise<Stream[]> {
  const { axios, cheerio, commonHeaders } = providerContext;
  try {
    const streams: Stream[] = [];

    // Direct video stream
    if (/\.(m3u8|mp4|mkv)(\?|$)/i.test(link)) {
      return [
        {
          server: "Direct",
          link,
          type: link.includes(".m3u8") ? "m3u8" : "mp4",
          quality: "1080p",
        },
      ];
    }

    // Hubcloud extractor
    if (/hubcloud|hubdrive/i.test(link)) {
      try {
        const hubStreams = await hubcloudExtractor(link, signal, providerContext);
        if (hubStreams && hubStreams.length > 0) {
          streams.push(...hubStreams);
        }
      } catch (e) {
        console.warn(`[MLSBD] HubCloud extractor failed for ${link}:`, e);
      }
    }

    // ZCloud / Filepress
    if (/zcloud|filepress/i.test(link)) {
      try {
        const zStreams = await zcloudExtractor(link, signal, providerContext);
        if (zStreams && zStreams.length > 0) {
          streams.push(...zStreams);
        }
      } catch (e) {
        console.warn(`[MLSBD] ZCloud extractor failed for ${link}:`, e);
      }
    }

    // Buzzheavier
    if (/buzzheavier/i.test(link)) {
      try {
        const bhStreams = await buzzheavierExtractor(link, signal, providerContext);
        if (bhStreams && bhStreams.length > 0) {
          streams.push(...bhStreams);
        }
      } catch (e) {
        console.warn(`[MLSBD] Buzzheavier extractor failed for ${link}:`, e);
      }
    }

    // GoFile
    if (/gofile/i.test(link)) {
      try {
        const gfStreams = await gofileExtractor(link, signal, providerContext);
        if (gfStreams && gfStreams.length > 0) {
          streams.push(...gfStreams);
        }
      } catch (e) {
        console.warn(`[MLSBD] GoFile extractor failed for ${link}:`, e);
      }
    }

    // If no stream resolved yet, check if it's an intermediate redirect page
    if (streams.length === 0) {
      try {
        const res = await axios.get(link, {
          headers: { ...commonHeaders, Referer: link },
          signal,
          maxRedirects: 5,
        });

        const finalUrl = res.request?.res?.responseUrl || link;
        if (finalUrl !== link) {
          if (/hubcloud|hubdrive/i.test(finalUrl)) {
            const hs = await hubcloudExtractor(finalUrl, signal, providerContext);
            if (hs) streams.push(...hs);
          } else if (/buzzheavier/i.test(finalUrl)) {
            const bs = await buzzheavierExtractor(finalUrl, signal, providerContext);
            if (bs) streams.push(...bs);
          }
        }

        if (streams.length === 0 && typeof res.data === "string") {
          const $ = cheerio.load(res.data);
          const downloadBtn = $("a.btn-download, a.download, a#download, a.fsl-btn").attr("href");
          if (downloadBtn && downloadBtn.startsWith("http")) {
            if (/hubcloud|hubdrive/i.test(downloadBtn)) {
              const hs = await hubcloudExtractor(downloadBtn, signal, providerContext);
              if (hs) streams.push(...hs);
            } else {
              streams.push({
                server: "FastDL",
                link: downloadBtn,
                type: downloadBtn.includes(".m3u8") ? "m3u8" : "mp4",
                quality: "auto",
              });
            }
          }
        }
      } catch {}
    }

    if (streams.length === 0) {
      // Fallback stream item
      streams.push({
        server: "Source",
        link,
        type: "m3u8",
        quality: "auto",
      });
    }

    return streams;
  } catch (err: any) {
    return throwProviderError(providerValue, "getStream", err);
  }
};
