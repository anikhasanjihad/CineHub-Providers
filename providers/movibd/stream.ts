import { ProviderContext, Stream } from "../types";
import { hubcloudExtractor } from "../extractors/hubcloud";
import { zcloudExtractor } from "../extractors/zcloud";
import { buzzheavierExtractor } from "../extractors/buzzheavier";
import { gofileExtractor } from "../extractors/gofile";
import { throwProviderError } from "../providerErrors";

const providerValue = "movibd";

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

    if (/hubcloud|hubdrive/i.test(link)) {
      try {
        const hs = await hubcloudExtractor(link, signal, providerContext);
        if (hs) streams.push(...hs);
      } catch {}
    }

    if (/zcloud|filepress/i.test(link)) {
      try {
        const zs = await zcloudExtractor(link, signal, providerContext);
        if (zs) streams.push(...zs);
      } catch {}
    }

    if (/buzzheavier/i.test(link)) {
      try {
        const bs = await buzzheavierExtractor(link, signal, providerContext);
        if (bs) streams.push(...bs);
      } catch {}
    }

    if (/gofile/i.test(link)) {
      try {
        const gs = await gofileExtractor(link, signal, providerContext);
        if (gs) streams.push(...gs);
      } catch {}
    }

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
          const dlBtn = $("a.btn-download, a.download, a#download, a.fsl-btn").attr("href");
          if (dlBtn && dlBtn.startsWith("http")) {
            if (/hubcloud|hubdrive/i.test(dlBtn)) {
              const hs = await hubcloudExtractor(dlBtn, signal, providerContext);
              if (hs) streams.push(...hs);
            } else {
              streams.push({
                server: "FastDL",
                link: dlBtn,
                type: dlBtn.includes(".m3u8") ? "m3u8" : "mp4",
                quality: "auto",
              });
            }
          }
        }
      } catch {}
    }

    if (streams.length === 0) {
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
