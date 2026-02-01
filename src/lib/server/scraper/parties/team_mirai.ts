import { BaseScraper, type SpeechData } from "../base";

/**
 * 「チームみらい」の公式サイトから演説スケジュールを収集するスクレイパー．
 * スケジュール詳細に含まれる X (旧 Twitter) のリンクを辿り，氏名を補完する．
 */
export class TeamMiraiScraper extends BaseScraper {
  partyName = "チームみらい";
  baseUrl = "https://team-mir.ai/";

  private nameCache: Record<string, string> = {};

  async scrape(): Promise<SpeechData[]> {
    const speeches: SpeechData[] = [];
    const browser = await this.getBrowser();

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      locale: "ja-JP",
    });

    const eventItems: {
      date: Date;
      time: string;
      location: string;
      xUrl: string;
    }[] = [];

    try {
      const page = await context.newPage();

      try {
        await page.goto(this.baseUrl, {
          timeout: 30000,
          waitUntil: "networkidle",
        });
      } catch (e) {
        console.warn(`⚠️ Failed to access TeamMirai page: ${this.baseUrl}`, e);
        return [];
      }

      try {
        await page.waitForSelector("#schedule", {
          state: "visible",
          timeout: 10000,
        });
      } catch (_e) {
        // セレクター待機タイムアウト時はそのまま続行を試みる
      }

      // 日付グループ要素を走査する
      const dateGroups = await page.$$("#schedule .event-date-group");

      for (const group of dateGroups) {
        const header = await group.$(".event-date-header");
        if (!header) continue;
        const dateText = (await header.innerText()).trim();
        const date = this.parseDate(dateText);
        if (!date) continue;

        // 各日付グループ内のイベントカードを処理する
        const cards = await group.$$(".event-card");
        for (const card of cards) {
          const timeElem = await card.$(".event-time");
          if (!timeElem) continue;
          const timeText = (await timeElem.innerText()).trim();

          const locElem = await card.$(".event-location");
          let location = "";
          if (locElem) {
            location = (await locElem.innerText()).replace("@", "").trim();
          }
          if (!location) continue;

          // X (旧 Twitter) へのリンクを取得する
          const linkElem = await card.$(
            ".event-sns a[href*='x.com'], .event-sns a[href*='twitter.com']",
          );
          let xUrl = "";
          if (linkElem) {
            xUrl = (await linkElem.getAttribute("href")) || "";
          }

          if (xUrl) {
            eventItems.push({ date, time: timeText, location, xUrl });
          }
        }
      }
      await page.close();

      // 各演説者の X プロフィールから氏名を抽出・補完する
      const uniqueUrls = [...new Set(eventItems.map(i => i.xUrl))];
      for (const url of uniqueUrls) {
        if (this.nameCache[url]) continue;

        const maxRetries = 3;
        let fetchedName: string | null = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          const profilePage = await context.newPage();
          try {
            await profilePage.goto(url, {
              timeout: 20000,
              waitUntil: "domcontentloaded",
            });

            await profilePage.waitForTimeout(4000);

            let candidateTitle = "";

            // OGP タイトルから氏名抽出を試みる
            const ogTitle = await profilePage
              .$eval('meta[property="og:title"]', el =>
                el.getAttribute("content"),
              )
              .catch(() => null);

            if (ogTitle) {
              candidateTitle = ogTitle;
            } else {
              // DOM の UserName 要素から抽出を試みる
              const userNameElem = await profilePage.$(
                'div[data-testid="UserName"] span span',
              );
              if (userNameElem) {
                const text = await userNameElem.innerText();
                if (text) candidateTitle = text;
              }

              if (!candidateTitle) {
                candidateTitle = await profilePage.title();
              }
            }

            let name = candidateTitle;
            if (name) {
              if (name.includes("(@")) {
                name = name.split("(@")[0].trim();
              }
              if (name.includes(" on X")) {
                name = name.split(" on X")[0].trim();
              }
              name = name.replace(/ \/ (X|Twitter)$/, "").trim();
            }

            if (
              !name ||
              name === "X" ||
              name === "Profile" ||
              name === "プロフィール"
            ) {
              // 有効なタイトルが取れなかった場合はリトライ
            } else {
              // 不要な記号や ID 部分を除去して純粋な氏名を得る
              const clean = name.split(/[\s　@＠|｜/／(（【[<＜\-:：・]/)[0];
              if (
                clean &&
                clean !== "X" &&
                clean !== "Profile" &&
                clean !== "プロフィール"
              ) {
                fetchedName = clean;
                break;
              }
            }
          } catch (e) {
            console.warn(`⚠️ Attempt ${attempt + 1} failed for ${url}:`, e);
          } finally {
            await profilePage.close();
            if (!fetchedName && attempt < maxRetries - 1) {
              await new Promise(r => setTimeout(r, 2000));
            }
          }
        }

        if (fetchedName) {
          this.nameCache[url] = fetchedName;
          console.log(`👤 Fetched X profile: ${fetchedName} (${url})`);
        } else {
          const urlParts = url.split("/");
          const id = urlParts[urlParts.length - 1];
          this.nameCache[url] = id || "チームみらい弁士";
        }
      }

      // 収集・補完したデータを使って Speech データ配列を組み立てる
      for (const item of eventItems) {
        const startAt = this.combineDateTime(item.date, item.time);
        const candidateName = this.nameCache[item.xUrl] || "チームみらい弁士";

        speeches.push({
          candidate_name: candidateName,
          start_at: startAt,
          location_name: item.location,
          source_url: this.baseUrl,
          speakers: ["安野貴博 党首"],
        });
      }
    } catch (e) {
      console.error("❌ TeamMirai scraping error:", e);
    } finally {
      await context.close();
      await browser.close();
    }

    return speeches;
  }

  /**
   * 日付文字列（例：「1 / 31」）を解析し， Date オブジェクトを生成する．
   */
  private parseDate(text: string): Date | null {
    const now = new Date();
    const currentYear = now.getFullYear();
    const match = text.match(/(\d{1,2})\/(\d{1,2})/);
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
