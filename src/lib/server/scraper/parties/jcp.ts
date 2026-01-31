import { BaseScraper, type SpeechData } from "../base";

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
          `⚠️ JCP scraping: Failed to access page (${this.baseUrl}):`,
          e,
        );
        await browser.close();
        return [];
      }

      // 日付ごとのセクションを取得する
      // h3（日付）とその直後の div.schedule のリストをセットで扱う必要があるが、
      // 構造的には section > h3, div.schedule, div.schedule ... となっているようだ。
      // 提供されたHTMLを見ると、sectionタグの中に h3 があり、その後に div.schedule が続いている。

      const sections = await page.$$("div.schedule01 > section");

      for (const section of sections) {
        try {
          // 日付を取得
          const h3 = await section.$("h3");
          if (!h3) continue;
          const dateText = (await h3.innerText()).trim();
          // 例: "1月31日（土）"

          const parsedDate = this.parseDate(dateText);
          if (!parsedDate) continue;

          // スケジュールブロックを取得
          const schedules = await section.$$("div.schedule");

          for (const schedule of schedules) {
            try {
              // 弁士（Speaker）を取得
              const personElem = await schedule.$(".title .person");
              let speakerName = "";
              if (personElem) {
                speakerName = (await personElem.innerText()).trim();
                // "志位和夫議長" -> "志位和夫 議長" のようにスペースを入れたい場合もあるが、
                // 日本共産党の表記に合わせて一旦そのまま取得し、後で調整も可能。
                // 他のスクレイパーに合わせて役職との間にスペースを入れる処理を入れてみる。
                // ただし、単純な正規表現では難しいので、一旦そのままにするか、
                // 既知の役職リストで分離する。
                // ここでは単純に取得する。
              }

              // 詳細（時間、場所、候補者）を取得
              const detailElem = await schedule.$(".detail");
              if (!detailElem) continue;

              // detail内のテキストを行ごとに分割
              // <br>タグを改行文字に置換してからテキスト取得すると行分割しやすい
              // <br>タグを改行文字に置換してからテキスト取得すると行分割しやすい
              // <br> <a ...>...</a> などを処理
              // <a>タグ（YouTubeリンクなど）は行として分かれていることが多いが、
              // 同じ行に含まれる場合もあるかもしれない。
              // 単純に innerText を取得すると <br> は改行になるはず。
              const detailText = await detailElem.innerText();
              const lines = detailText
                .split("\n")
                .map(l => l.trim())
                .filter(l => l);

              for (const line of lines) {
                // "YouTubeで中継" などの行はスキップ
                if (
                  line.includes("YouTubeで中継") ||
                  line.includes("YouTbueで中継")
                )
                  continue;
                if (!line.includes("～")) continue; // 時間の区切りがない行はスキップ

                // 時間抽出 "13:30～"
                const timeMatch = line.match(/(\d{1,2}:\d{2})～/);
                if (!timeMatch) continue;
                const timeStr = timeMatch[1];
                const startAt = this.combineDateTime(parsedDate, timeStr);

                // 残りのテキストから場所と候補者を抽出
                // "13:30～　京都・京都市下京区 JR京都駅前（堀川あきこ比例候補と）"
                // "13:30～　京都・京都市下京区 JR京都駅前（堀川あきこ比例候補と）"
                const content = line.replace(timeMatch[0], "").trim();

                // 括弧内の候補者情報を抽出
                // 複数の括弧がある場合に対応（例："...（日航ホテル前）（藤野やすふみ比例候補と）"）
                const candidates: string[] = [];

                // 括弧ブロックを全て抽出して検証
                // 非貪欲マッチで括弧の中身を取得
                const parenMatches = content.matchAll(/（(.*?)）/g);
                const blocksToRemove: string[] = [];

                for (const match of parenMatches) {
                  const textInParen = match[1];
                  const fullMatch = match[0];

                  // 候補者情報かどうかの判定
                  // "と" で終わる、または "候補" "議員" が含まれる
                  if (
                    textInParen.endsWith("と") ||
                    textInParen.includes("候補") ||
                    textInParen.includes("議員")
                  ) {
                    blocksToRemove.push(fullMatch);

                    // "と" を削除
                    const cleanCandidateText = textInParen
                      .replace(/と$/, "")
                      .trim();

                    // "、" で分割
                    const candidateParts = cleanCandidateText.split("、");
                    for (const part of candidateParts) {
                      let name = part.trim();
                      // 役職・選挙区情報の除去

                      // 1. 選挙区（沖縄1区・など）
                      name = name.replace(/(沖縄|東京)\d+区[・]?/g, "");

                      // 2. 選挙タイプ（比例・小選挙区・）
                      name = name.replace(/(比例|小選挙区|選挙区)[・]?/g, "");

                      // 3. 役職・身分（衆院議員・候補・前議員など）
                      // これらは末尾に来ることが多いので、これ以降を削除
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
                // 特定された候補者ブロックを場所名から削除
                for (const block of blocksToRemove) {
                  locationName = locationName.replace(block, "").trim();
                }

                // 候補者がいない場合は "（候補者なし）"
                if (candidates.length === 0) {
                  speeches.push({
                    candidate_name: "（候補者なし）",
                    start_at: startAt,
                    location_name: locationName,
                    source_url: this.baseUrl,
                    speakers: speakerName ? [speakerName] : [],
                  });
                } else {
                  // 候補者ごとに作成
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
              console.warn("⚠️ JCP schedule parse error:", e);
            }
          }
        } catch (e) {
          console.warn("⚠️ JCP section parse error:", e);
        }
      }
    } catch (e) {
      console.error("❌ JCP total scraping error:", e);
    } finally {
      await browser.close();
    }

    return speeches;
  }

  private parseDate(text: string): Date | null {
    // "1月31日（土）" -> Date object
    const now = new Date();
    const currentYear = now.getFullYear();
    const match = text.match(/(\d{1,2})月(\d{1,2})日/);
    if (!match) return null;

    const month = parseInt(match[1], 10);
    const day = parseInt(match[2], 10);

    let year = currentYear;
    // 年越し対応（現在12月で、取得した月が1月なら来年とみなすなど）
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
