import { BaseScraper, type SpeechData } from "../base";

export class LDPScraper extends BaseScraper {
  partyName = "自由民主党";
  baseUrl = "https://www.jimin.jp/election/sen_shu51/speech/index.html";

  async scrape(): Promise<SpeechData[]> {
    const speeches: SpeechData[] = [];

    try {
      const browser = await this.getBrowser();
      const page = await this.getPage(browser);

      try {
        await page.goto(this.baseUrl, { timeout: 30000 });
      } catch (e) {
        console.warn(
          `LDPスクレイピング: ページアクセス失敗 (${this.baseUrl}):`,
          e,
        );
        await browser.close();
        return [];
      }

      // 役員ごとのブロックを取得
      const memberBlocks = await page.$$(".speech-member");

      for (const block of memberBlocks) {
        try {
          const memberNameElem = await block.$(".member_name");
          let officerName = "";
          if (memberNameElem) {
            // evaluateを使ってDOM操作し、rtタグを削除してからテキスト取得
            officerName = await memberNameElem.evaluate(el => {
              const clone = el.cloneNode(true) as HTMLElement;
              const rts = clone.querySelectorAll("rt");
              rts.forEach(rt => {
                rt.remove();
              });
              // 全角スペース等も全て削除
              return (clone.textContent || "").replace(/\s/g, "");
            });
          }

          const scheduleBlocks = await block.$$(".speech-schedule");

          for (const scheduleBlock of scheduleBlocks) {
            const dateElem = await scheduleBlock.$(".speech-schedule_ttl");
            if (!dateElem) continue;
            const dateText = (await dateElem.innerText()).trim();
            const dateMatch = dateText.match(/(\d{4}\/\d{1,2}\/\d{1,2})/);
            if (!dateMatch) continue;
            const dateStr = dateMatch[1];

            const rows = await scheduleBlock.$$(".speech-table tbody tr");

            for (const row of rows) {
              try {
                // 時間取得 (th)
                const timeElem = await row.$("th");
                if (!timeElem) continue;
                const timeText = (await timeElem.innerText()).trim();
                const startAt = this.parseDateTime(`${dateStr} ${timeText}`);
                if (!startAt) continue;

                // 情報取得 (.speech-table_info p)
                const infoParams = await row.$$(".speech-table_info p");
                const candidateNames: string[] = [];
                let locationName = "";

                const normalizeText = (text: string) => {
                  return text
                    .replace(/【.*?】/g, "")
                    .replace(/[（(].*?[）)]/g, "") // 全角・半角括弧に対応
                    .replace(/\s/g, ""); // すべての空白を削除
                };

                for (const p of infoParams) {
                  const text = (await p.innerText()).trim();
                  const link = await p.$("a");
                  if (link) {
                    // リンクがある場合は候補者名とみなす
                    candidateNames.push(normalizeText(text));
                  } else {
                    // リンクがない場合は場所とみなす
                    locationName = normalizeText(text);
                  }
                }

                const speakers: string[] = [];
                if (officerName) {
                  speakers.push(officerName);
                }

                // 場所名がない場合はスキップ
                if (!locationName) continue;

                // 候補者が複数いる場合は分割して登録
                if (candidateNames.length > 0) {
                  for (const name of candidateNames) {
                    if (!name) continue;
                    speeches.push({
                      candidate_name: name,
                      start_at: startAt,
                      location_name: locationName,
                      source_url: this.baseUrl,
                      speakers: speakers,
                    });
                  }
                } else if (officerName) {
                  // 候補者がいない場合は役員を候補者として登録
                  speeches.push({
                    candidate_name: officerName,
                    start_at: startAt,
                    location_name: locationName,
                    source_url: this.baseUrl,
                    speakers: speakers,
                  });
                }
              } catch (e) {
                console.warn("LDP行パースエラー:", e);
              }
            }
          }
        } catch (e) {
          console.warn("LDPブロックパースエラー:", e);
        }
      }

      await browser.close();
    } catch (e) {
      console.error("LDPスクレイピング全体エラー:", e);
    }

    return speeches;
  }
}
