import { BaseScraper, type SpeechData } from "../base";

export class TeamMiraiScraper extends BaseScraper {
  partyName = "チームみらい";
  baseUrl = "https://team-mir.ai/";

  // URLと名前のキャッシュ
  private nameCache: Record<string, string> = {};

  async scrape(): Promise<SpeechData[]> {
    const speeches: SpeechData[] = [];
    const browser = await this.getBrowser();

    // X対策としてUser-Agentを設定したコンテキストを使用
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
        console.warn(
          `⚠️ TeamMirai scraping: Failed to access page (${this.baseUrl}):`,
          e,
        );
        return [];
      }

      // スケジュールセクションのロード待機
      try {
        await page.waitForSelector("#schedule", {
          state: "visible",
          timeout: 10000,
        });
      } catch (_e) {
        console.warn(
          "⚠️ Timeout waiting for #schedule selector, trying to parse anyway",
        );
      }

      // 日付グループごとの処理
      const dateGroups = await page.$$("#schedule .event-date-group");

      for (const group of dateGroups) {
        // 日付取得 "1/31(土)"
        const header = await group.$(".event-date-header");
        if (!header) {
          continue;
        }
        const dateText = (await header.innerText()).trim();
        const date = this.parseDate(dateText);
        if (!date) continue;

        // カードごとの処理
        const cards = await group.$$(".event-card");
        for (const card of cards) {
          // 時間 "10:30"
          const timeElem = await card.$(".event-time");
          if (!timeElem) continue;
          const timeText = (await timeElem.innerText()).trim();

          // 場所
          const locElem = await card.$(".event-location");
          let location = "";
          if (locElem) {
            location = (await locElem.innerText()).replace("@", "").trim();
          }
          if (!location) continue;

          // Xリンク
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

      // Xのプロフィール名を取得（ユニークなURLのみアクセス）
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

            // 少し長めに待機してJSの実行を待つ
            await profilePage.waitForTimeout(4000);

            // 名前候補の取得試行
            let candidateTitle = "";

            // 1. OGPタグ（最優先）
            // <meta property="og:title" content="名前 (@id) / X">
            const ogTitle = await profilePage
              .$eval('meta[property="og:title"]', el =>
                el.getAttribute("content"),
              )
              .catch(() => null);

            if (ogTitle) {
              candidateTitle = ogTitle;
            } else {
              // 2. DOM要素（data-testid="UserName"）
              // 構造: <div data-testid="UserName">...<span><span>名前</span></span>...</div>
              const userNameElem = await profilePage.$(
                'div[data-testid="UserName"] span span',
              );
              if (userNameElem) {
                const text = await userNameElem.innerText();
                if (text) candidateTitle = text;
              }

              // 3. 通常のTitleタグ
              if (!candidateTitle) {
                candidateTitle = await profilePage.title();
              }
            }

            // 名前のクリーニング
            let name = candidateTitle;
            if (name) {
              // "名前 (@id)..." 形式の処理
              if (name.includes("(@")) {
                name = name.split("(@")[0].trim();
              }
              // " on X"
              if (name.includes(" on X")) {
                name = name.split(" on X")[0].trim();
              }
              // 末尾の / X
              name = name.replace(/ \/ (X|Twitter)$/, "").trim();
            }

            // 無効判定
            if (
              !name ||
              name === "X" ||
              name === "Profile" ||
              name === "プロフィール"
            ) {
              // 失敗、リトライへ
              // console.warn(`⚠️ Attempt ${attempt + 1}: Invalid title parsed: "${candidateTitle}" from ${url}`);
            } else {
              // 有効な名前が取れた
              // さらに整形
              const clean = name.split(/[\s　@＠|｜/／(（【[<＜\-:：・]/)[0];
              if (
                clean &&
                clean !== "X" &&
                clean !== "Profile" &&
                clean !== "プロフィール"
              ) {
                fetchedName = clean;
                break; // 成功、ループ抜ける
              }
            }
          } catch (e) {
            console.warn(`⚠️ Attempt ${attempt + 1} failed for ${url}:`, e);
          } finally {
            await profilePage.close();
            // リトライ間隔
            if (!fetchedName && attempt < maxRetries - 1) {
              await new Promise(r => setTimeout(r, 2000));
            }
          }
        }

        if (fetchedName) {
          this.nameCache[url] = fetchedName;
          console.log(`👤 Fetched X profile: ${fetchedName} from ${url}`);
        } else {
          // 最終フォールバック
          const urlParts = url.split("/");
          const id = urlParts[urlParts.length - 1];
          this.nameCache[url] = id || "チームみらい弁士";
        }
      }

      // データの組み立て
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
      console.error("❌ TeamMirai total scraping error:", e);
    } finally {
      await context.close();
      await browser.close();
    }

    return speeches;
  }

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
