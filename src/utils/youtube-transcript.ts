import { parse } from "node-html-parser";

const RE_YOUTUBE =
  /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36,gzip(gfe)";

export class YoutubeTranscriptError extends Error {
  constructor(message: string) {
    super(`[YoutubeTranscript] ${message}`);
  }
}

export class YoutubeTranscript {
  static async fetchTranscript(
    videoId: string,
    config: { lang?: string } = {}
  ) {
    const identifier = this.retrieveVideoId(videoId);
    const lang = config?.lang ?? "en";

    try {
      const transcriptUrl = await fetch(
        `https://www.youtube.com/watch?v=${identifier}`,
        {
          headers: {
            "User-Agent": USER_AGENT,
          },
        }
      )
        .then((res) => res.text())
        .then((html) => parse(html))
        .then((html) => this.parseTranscriptEndpoint(html, lang));

      if (!transcriptUrl) {
        throw new Error("Failed to locate a transcript for this video!");
      }

      const transcriptXML = await fetch(transcriptUrl)
        .then((res) => res.text())
        .then((xml) => parse(xml));

      let transcript = "";
      const chunks = transcriptXML.getElementsByTagName("text");
      for (const chunk of chunks) {
        transcript += chunk.textContent + " ";
      }

      return transcript.trim();
    } catch (e) {
      throw new YoutubeTranscriptError(e as string);
    }
  }

  private static parseTranscriptEndpoint(
    document: any,
    langCode: string | null = null
  ) {
    try {
      const scripts = document.getElementsByTagName("script");

      const playerScript = scripts.find((script: any) =>
        script.textContent.includes("var ytInitialPlayerResponse = {")
      );

      const dataString =
        playerScript?.textContent
          ?.split("var ytInitialPlayerResponse = ")?.[1]
          ?.split("};")?.[0] + "}";

      const data = JSON.parse(dataString.trim());
      const availableCaptions =
        data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];

      let captionTrack = availableCaptions?.[0];
      if (langCode) {
        captionTrack =
          availableCaptions.find((track: any) =>
            track.languageCode.includes(langCode)
          ) ?? availableCaptions?.[0];
      }

      return captionTrack?.baseUrl;
    } catch (e) {
      console.error(`YoutubeTranscript.parseTranscriptEndpoint ${e}`);
      return null;
    }
  }

  static retrieveVideoId(videoId: string): string {
    if (videoId.length === 11) {
      return videoId;
    }
    const matchId = videoId.match(RE_YOUTUBE);
    if (matchId && matchId.length) {
      return matchId[1];
    }
    throw new YoutubeTranscriptError(
      "Impossible to retrieve Youtube video ID."
    );
  }
}
