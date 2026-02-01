import { BaseScraper, type SpeechData } from "../base";

/**
 * 日本共産党の公式サイトから演説スケジュールを収集するスクレイパー．
 */
export class JCPScraper extends BaseScraper {
  partyName = "日本共産党";
  baseUrl = "https://www.jcp.or.jp/enzetu/";

  async scrape(): Promise<SpeechData[]> {
    const speeches: SpeechData[] = [];
    const browser = await this.getBrowser();
    const page = await this.getPage(browser);

    try {
      try {
        await page.goto(this.baseUrl, { timeout: 30000 });
      } catch (e) {
        console.warn(
          `⚠️ Failed to access JCP schedule page: ${this.baseUrl}`,
          e,
        );
        await browser.close();
        return [];
      }

      // 日付ごとのスケジュールセクションを取得する
      const sections = await page.$$("div.schedule01 > section");

      for (const section of sections) {
        try {
          // 日付の見出しテキスト（例：「1 月 31 日（土）」）を取得する
          const h3 = await section.$("h3");
          if (!h3) continue;
          const dateText = (await h3.innerText()).trim();

          const parsedDate = this.parseDate(dateText);
          if (!parsedDate) continue;

          // セクション内の各スケジュールブロックを取得する
          const schedules = await section.$$("div.schedule");

          for (const schedule of schedules) {
            try {
              // メインの弁士（Speaker）情報を取得する
              const personElem = await schedule.$(".title .person");
              let speakerName = "";
              if (personElem) {
                speakerName = (await personElem.innerText()).trim();
              }

              // スケジュールの詳細（時刻，場所，同行候補者など）を取得する
              const detailElem = await schedule.$(".detail");
              if (!detailElem) continue;

              const detailText = await detailElem.innerText();
              const lines = detailText
                .split("\n")
                .map(l => l.trim())
                .filter(l => l);

              for (const line of lines) {
                // 中継情報などの非演説行をスキップする
                if (
                  line.includes("YouTubeで中継") ||
                  line.includes("YouTbueで中継")
                )
                  continue;
                if (!line.includes("～")) continue;

                // 開始時刻を抽出する
                const timeMatch = line.match(/(\d{1,2}:\d{2})～/);
                if (!timeMatch) continue;
                const timeStr = timeMatch[1];
                const startAt = this.combineDateTime(parsedDate, timeStr);

                // 時刻以降のテキストから場所名と候補者名を抽出する
                const content = line.replace(timeMatch[0], "").trim();
                const candidates: string[] = [];
                const parenMatches = content.matchAll(/（(.*?)）/g);
                const blocksToRemove: string[] = [];

                for (const match of parenMatches) {
                  const textInParen = match[1];
                  const fullMatch = match[0];

                  // 候補者情報が含まれる括弧（「～と」「～候補」「～議員」等）を特定する
                  if (
                    textInParen.endsWith("と") ||
                    textInParen.includes("候補") ||
                    textInParen.includes("議員")
                  ) {
                    blocksToRemove.push(fullMatch);
                    const cleanCandidateText = textInParen
                      .replace(/と$/, "")
                      .trim();

                    const candidateParts = cleanCandidateText.split("、");
                    for (const part of candidateParts) {
                      let name = part.trim();
                      // 氏名抽出のために、選挙区や役職の記載を除去する
                      name = name.replace(/(沖縄|東京)\d+区[・]?/g, "");
                      name = name.replace(/(比例|小選挙区|選挙区)[・]?/g, "");
                      name = name.replace(
                        /(衆院|参院|前|元)?(候補|議員).*$/,
                        "",
                      );
                      name = name.trim();

                      if (name) {
                        candidates.push(name);
                      }
                    }
                  }
                }

                let locationName = content;
                // 場所名に含まれる候補者情報の括弧書きを削除する
                for (const block of blocksToRemove) {
                  locationName = locationName.replace(block, "").trim();
                }

                if (candidates.length === 0) {
                  speeches.push({
                    candidate_name: "（候補者なし）",
                    start_at: startAt,
                    location_name: locationName,
                    source_url: this.baseUrl,
                    speakers: speakerName ? [speakerName] : [],
                  });
                } else {
                  for (const candidate of candidates) {
                    speeches.push({
                      candidate_name: candidate,
                      start_at: startAt,
                      location_name: locationName,
                      source_url: this.baseUrl,
                      speakers: speakerName ? [speakerName] : [],
                    });
                  }
                }
              }
            } catch (e) {
              console.warn("⚠️ Failed to parse JCP schedule detail:", e);
            }
          }
        } catch (e) {
          console.warn("⚠️ Failed to parse JCP section:", e);
        }
      }
    } catch (e) {
      console.error("❌ JCP scraping error:", e);
    } finally {
      await browser.close();
    }

    return speeches;
  }

  /**
   * 日付文字列を解析し，Date オブジェクトを生成する．
   */
  private parseDate(text: string): Date | null {
    const now = new Date();
    const currentYear = now.getFullYear();
    const match = text.match(/(\d{1,2})月(\d{1,2})日/);
    if (!match) return null;

    const month = parseInt(match[1], 10);
    const day = parseInt(match[2], 10);

    let year = currentYear;
    if (now.getMonth() === 11 && month === 1) {
      year += 1;
    }

    return new Date(year, month - 1, day);
  }

  /**
   * 日付オブジェクトと時刻文字列を結合して単一の Date オブジェクトを作成する．
   */
  private combineDateTime(date: Date, timeStr: string): Date {
    const [hour, minute] = timeStr.split(":").map(Number);
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hour,
      minute,
    );
  }
}
