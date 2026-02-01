"use client";

import maplibregl from "maplibre-gl";
import { useCallback, useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { Box } from "@chakra-ui/react";
import { useStore } from "@/store/useStore";
import type { Speech } from "@/types";

// OpenStreetMap タイルスタイル（API キー不要）．
const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

/**
 * 地図コンポーネント．
 * MapLibre GL JS を使用して地図を表示し，演説場所をマーカーとして描画する．
 */
export function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<number, maplibregl.Marker>>(new Map());
  const popupRef = useRef<maplibregl.Popup | null>(null);

  const { speeches, activeSpeechId, setActiveSpeechId, filter, selectedTime } =
    useStore();

  // マーカーを作成する．
  const createMarker = useCallback(
    (speech: Speech): maplibregl.Marker | null => {
      if (!speech.lat || !speech.lng || !map.current) return null;

      // 時間によるスタイル制御
      let opacity = 1;
      let scale = 1;
      let zIndex = 1;

      // 検索中かつ今日モードの場合は、選択時間との差分で表示を変える
      if (filter.searchQuery && filter.dateMode === "today") {
        const speechTime = new Date(speech.start_at).getTime();
        const currentTime = selectedTime.getTime();
        const diffHours = Math.abs(speechTime - currentTime) / (1000 * 60 * 60);

        // 前後1.5時間以内なら強調、それ以外は薄く
        if (diffHours <= 1.5) {
          opacity = 1;
          scale = 1.2;
          zIndex = 10;
        } else {
          opacity = 0.3;
          scale = 0.8;
          zIndex = 0;
        }
      }

      // マーカー要素を作成する．
      const el = document.createElement("div");
      el.className = "party-marker";
      el.style.backgroundColor = speech.party_color;
      el.id = `marker-${speech.id}`;

      // スタイル適用
      el.style.opacity = opacity.toString();
      el.style.transform = `scale(${scale})`;
      el.style.zIndex = zIndex.toString();

      // クリックイベントを設定する．
      el.addEventListener("click", () => {
        setActiveSpeechId(speech.id);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([speech.lng, speech.lat])
        .addTo(map.current);

      return marker;
    },
    [setActiveSpeechId, filter.searchQuery, filter.dateMode, selectedTime],
  );

  const isProgrammaticClose = useRef(false);

  // ポップアップを表示する．
  const showPopup = useCallback(
    (speech: Speech) => {
      if (!speech.lat || !speech.lng || !map.current) return;

      if (popupRef.current) {
        isProgrammaticClose.current = true;
        popupRef.current.remove();
        isProgrammaticClose.current = false;
      }

      const startTime = new Date(speech.start_at);
      const timeStr = startTime.toLocaleString("ja-JP", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const iconColor = "#4A5568";
      const iconStyle =
        "width: 14px; height: 14px; flex-shrink: 0; vertical-align: middle;";

      const mapPinIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="${iconStyle}"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
      const clockIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="${iconStyle}"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
      const usersIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="${iconStyle}"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
      const externalLinkIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 12px; height: 12px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
      const mapIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 12px; height: 12px;"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="6" x2="15" y2="21"/></svg>`;

      const popupContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-width: 200px;">
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
           <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${speech.party_color}; box-shadow: 0 0 0 1px rgba(0,0,0,0.1);"></div>
           <span style="font-size: 11px; color: #64748b; font-weight: 600;">${speech.party_name}</span>
        </div>
        
        <h3 style="font-size: 16px; font-weight: 800; color: #1e293b; margin: 0 0 10px 0; line-height: 1.3;">
          ${speech.candidate_name}
        </h3>
        
        ${
          speech.speakers && speech.speakers.length > 0
            ? `
          <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
            <div style="margin-top: 2px; color: #64748b;">${usersIcon}</div>
            <div>
              <div style="font-size: 10px; font-weight: bold; color: #94a3b8; line-height: 1; margin-bottom: 2px;">応援弁士</div>
              <div style="font-size: 13px; font-weight: 600; color: #334155; line-height: 1.4;">${speech.speakers.join(", ")}</div>
            </div>
          </div>
        `
            : ""
        }
        
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
          <div style="display: flex; align-items: flex-start; gap: 8px;">
            <div style="margin-top: 2px; color: #64748b;">${mapPinIcon}</div>
            <span style="font-size: 13px; font-weight: 600; color: #334155; line-height: 1.4;">${speech.location_name}</span>
          </div>
          
          <div style="display: flex; align-items: center; gap: 8px;">
             <div style="color: #64748b;">${clockIcon}</div>
            <span style="font-size: 13px; font-weight: 600; color: #334155;">${timeStr}</span>
          </div>
        </div>
        
        <div style="display: flex; align-items: center; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid #f1f5f9;">
          ${
            speech.source_url
              ? `
            <a href="${speech.source_url}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: #3b82f6; text-decoration: none; font-weight: 600; padding: 4px 8px; background-color: #eff6ff; border-radius: 6px; transition: background-color 0.2s;">
              ${externalLinkIcon}
              出典
            </a>
          `
              : ""
          }
           <a href="https://www.google.com/maps/search/?api=1&query=${speech.lat},${speech.lng}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: #3b82f6; text-decoration: none; font-weight: 600; padding: 4px 8px; background-color: #eff6ff; border-radius: 6px; transition: background-color 0.2s;">
              ${mapIcon}
              地図
            </a>
        </div>
      </div>
    `;

      const popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: false,
        maxWidth: "320px",
        className: "custom-popup",
        offset: 15,
      })
        .setLngLat([speech.lng, speech.lat])
        .setHTML(popupContent)
        .addTo(map.current);

      // close イベントのハンドリングを行う．
      popup.on("close", () => {
        if (!isProgrammaticClose.current) {
          setActiveSpeechId(null);
        }
      });

      popupRef.current = popup;

      // 地図を指定座標へ移動する．
      map.current.flyTo({
        center: [speech.lng, speech.lat],
        zoom: 15,
        duration: 1000,
      });
    },
    [setActiveSpeechId],
  );

  // 地図の初期化を行う．
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: OSM_STYLE,
      center: [139.6917, 35.6895], // 東京を中心に初期化する．
      zoom: 10,
      attributionControl: false,
    });

    // コントロールを追加する．
    map.current.addControl(new maplibregl.NavigationControl(), "top-right");
    map.current.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      "top-right",
    );
    map.current.addControl(
      new maplibregl.AttributionControl({
        compact: false,
      }),
      "bottom-right",
    );

    // 矢印アイコンの登録
    map.current.on("load", () => {
      if (!map.current) return;
      // シンプルな矢印の画像を生成して登録
      const size = 128; // 20 -> 128
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 12; // 線幅も太く
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.beginPath();
        // 矢印の形状描画
        const padding = size * 0.1;
        const h = size - padding * 2;

        // 座標調整 (中央基準)
        const left = padding;
        const right = size - padding;
        const top = padding;
        const bottom = size - padding;
        const centerX = size / 2;

        ctx.moveTo(left, bottom); // 左下
        ctx.lineTo(centerX, top); // 上中央 (先端)
        ctx.lineTo(right, bottom); // 右下
        ctx.lineTo(centerX, bottom - h * 0.3); // 中央下（少し凹ませる）
        ctx.closePath();

        ctx.fill();
        ctx.stroke();
        const imageData = ctx.getImageData(0, 0, size, size);
        map.current.addImage("arrow-icon", imageData, {
          sdf: true,
          pixelRatio: 4,
        });
      }
    });

    // カススタム CSS を注入
    const style = document.createElement("style");
    style.innerHTML = `
      .custom-popup .maplibregl-popup-content {
        padding: 16px;
        border-radius: 12px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        border: 1px solid rgba(226, 232, 240, 1);
        overflow: hidden;
      }
      .custom-popup .maplibregl-popup-close-button {
        padding: 8px 12px;
        color: #94a3b8;
        font-size: 18px;
        border-radius: 0 12px 0 12px;
        z-index: 10;
        top: 0;
        right: 0;
      }
      .custom-popup .maplibregl-popup-close-button:hover {
        background-color: #f1f5f9;
        color: #334155;
        cursor: pointer;
      }
      .custom-popup .maplibregl-popup-tip {
        border-top-color: #ffffff;
      }
      /* マーカーのアニメーション */
      .party-marker {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);
        cursor: pointer;
        /* 重要: transform を transition に含めないことで、マップ移動時の追従性悪化を防ぐ */
        transition: border-color 0.2s, box-shadow 0.2s, opacity 0.3s;
        box-sizing: border-box;
      }
      .party-marker:hover {
        /* scale は使用せず、box-shadow で強調する */
        box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.5), 0 8px 12px -2px rgba(0,0,0,0.4);
        z-index: 10;
        border-width: 2px;
      }
      .party-marker.active {
        /* active 時の強調 */
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 8px 12px -2px rgba(0,0,0,0.4);
        z-index: 20;
        border-color: white;
      }
    `;
    document.head.appendChild(style);

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      document.head.removeChild(style);
    };
  }, []);

  // マーカーとルートの更新を行う．
  useEffect(() => {
    if (!map.current) return;

    // --- 1. マーカーの更新 ---
    // 既存のマーカーを削除
    markersRef.current.forEach(marker => {
      marker.remove();
    });
    markersRef.current.clear();

    // 新しいマーカーを追加
    speeches.forEach(speech => {
      const marker = createMarker(speech);
      if (marker) {
        markersRef.current.set(speech.id, marker);
      }
    });

    // --- 2. 移動経路（LineString + Arrows）の描画 ---
    // レイヤー・ソースID定義
    const sourceId = "route-source";
    const lineLayerId = "route-line-layer";
    const arrowLayerId = "route-arrow-layer";

    // 安全に削除するためのヘルパー関数
    const removeLayers = () => {
      if (!map.current) return;
      if (map.current.getLayer(arrowLayerId))
        map.current.removeLayer(arrowLayerId);
      if (map.current.getLayer(lineLayerId))
        map.current.removeLayer(lineLayerId);
      if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);
    };

    // 一旦削除してクリーンな状態にする
    removeLayers();

    // 候補者が一人だけの場合のみ描画する
    // データ件数が2件以上ないと線は引けない
    let shouldFitBounds = false;
    const boundsCoordinates: [number, number][] = [];

    // データが存在する場合、バウンディングボックス計算用の座標を集める
    // 検索などで絞り込まれている場合を想定
    speeches.forEach(s => {
      if (s.lng && s.lat) {
        boundsCoordinates.push([s.lng, s.lat]);
      }
    });

    // 検索クエリがある場合、ズームを合わせる
    if (filter.searchQuery) {
      shouldFitBounds = true;
    }

    if (speeches.length >= 2) {
      // 候補者IDを一意にする
      const candidateIds = new Set(speeches.map(s => s.candidate_id));
      const isSingleCandidate = candidateIds.size === 1;

      // 共通の弁士がいるかチェック（応援弁士検索時の移動経路表示のため）
      let isCommonSpeaker = false;
      const firstSpeakers = speeches[0].speakers || [];
      // 候補者が複数で、かつ最初の演説に弁士がいる場合のみチェック
      if (!isSingleCandidate && firstSpeakers.length > 0) {
        // すべての演説に含まれている弁士がいるか
        isCommonSpeaker = firstSpeakers.some(speaker =>
          speeches.every(s => s.speakers?.includes(speaker)),
        );
      }

      // 厳密に1人の候補者、または共通の弁士がいる場合のみ線を引く
      // かつ、それが検索などによる意図的な絞り込みの結果である場合に限定する？
      // 現状は isSingleCandidate なら無条件で引いているので、それに合わせる。
      if (isSingleCandidate || isCommonSpeaker) {
        // 時系列順にソート (immutableに)
        const sortedSpeeches = [...speeches].sort(
          (a, b) =>
            new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
        );

        const routeCoordinates = sortedSpeeches.reduce<[number, number][]>(
          (acc, s) => {
            if (s.lng && s.lat) {
              acc.push([s.lng, s.lat]);
            }
            return acc;
          },
          [],
        );

        if (routeCoordinates.length >= 2) {
          const partyColor = sortedSpeeches[0].party_color || "#3b82f6";

          shouldFitBounds = true;

          // ソースを追加
          try {
            map.current.addSource(sourceId, {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: routeCoordinates,
                },
              },
            });

            // 線のレイヤーを追加
            map.current.addLayer({
              id: lineLayerId,
              type: "line",
              source: sourceId,
              layout: {
                "line-join": "round",
                "line-cap": "round",
              },
              paint: {
                "line-color": partyColor,
                "line-width": 5,
                "line-opacity": 0.8,
              },
            });

            // 矢印のレイヤーを追加
            // 注意: 'arrow-icon' がロードされている必要がある。
            // map.on('load') で追加しているが、タイミング的にまだない場合の対策が必要かも知れないが
            // 通常 React の useEffect フローなら画像の準備は間に合うことが多い。
            // もし画像がない場合はエラーにならず単に表示されない。
            if (map.current.hasImage("arrow-icon")) {
              map.current.addLayer({
                id: arrowLayerId,
                type: "symbol",
                source: sourceId,
                layout: {
                  "symbol-placement": "line",
                  "symbol-spacing": 100, // 矢印の間隔
                  "icon-image": "arrow-icon",
                  "icon-size": 0.6,
                  "icon-allow-overlap": true,
                  "icon-rotate": 90, // アイコンの向き調整（右向き矢印を進行方向に向ける）
                  "icon-rotation-alignment": "map",
                },
                paint: {
                  "icon-color": partyColor, // SDFアイコンなので色変更可能
                  "icon-halo-color": "#ffffff",
                  "icon-halo-width": 2,
                },
              });
            }
          } catch (e) {
            console.error("Layer add failed", e);
            // 失敗時はクリーンアップ
            removeLayers();
          }
        }
      }
    }

    // --- 3. Fit Bounds (検索結果全体を表示) ---
    // 検索クエリがある場合や、明示的に絞り込まれている場合はズーム合わせを行う
    if (boundsCoordinates.length > 0) {
      // shouldFitBoundsフラグが立っている場合のみ実行
      if (shouldFitBounds && boundsCoordinates.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        boundsCoordinates.forEach(coord => {
          bounds.extend(coord);
        });

        map.current.fitBounds(bounds, {
          padding: { top: 100, bottom: 200, left: 50, right: 350 }, // サイドバーやヘッダーを考慮
          maxZoom: 16,
          duration: 1200,
        });
      }
    }
  }, [speeches, createMarker, filter.searchQuery]);

  // アクティブな演説が変更されたときの処理．
  useEffect(() => {
    // 全てのマーカーのアクティブ状態をリセットする．
    markersRef.current.forEach((marker, id) => {
      const el = marker.getElement();
      el.classList.toggle("active", id === activeSpeechId);
    });

    // ポップアップを表示する．
    if (activeSpeechId) {
      const speech = speeches.find(s => s.id === activeSpeechId);
      if (speech) {
        showPopup(speech);
      } else {
        // データセットから見つからない（フィルタリングされた）場合は閉じる
        if (popupRef.current) {
          isProgrammaticClose.current = true;
          popupRef.current.remove();
          popupRef.current = null;
          isProgrammaticClose.current = false;
        }
      }
    } else {
      // IDがnullになったら閉じる
      if (popupRef.current) {
        isProgrammaticClose.current = true;
        popupRef.current.remove();
        popupRef.current = null;
        isProgrammaticClose.current = false;
      }
    }
  }, [activeSpeechId, speeches, showPopup]);

  return <Box ref={mapContainer} w="full" h="full" />;
}
