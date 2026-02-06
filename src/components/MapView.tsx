"use client";

import maplibregl from "maplibre-gl";
import { useCallback, useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { Box } from "@chakra-ui/react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useStore } from "@/store/useStore";
import type { Speech } from "@/types";

/**
 * OpenStreetMap のタイルレイヤーを使用した地図スタイル定義．
 */
const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: [
        "https://tile.openstreetmap.jp/styles/maptiler-basic-ja/{z}/{x}/{y}.png",
      ],
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
 * 地図表示コンポーネント．
 * MapLibre GL JS を用いて演説場所のマーカー表示，経路描画，ポップアップ管理を行う．
 */
export function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<number, maplibregl.Marker>>(new Map());
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const isProgrammaticClose = useRef(false);
  const prevSpeechIdsRef = useRef<string>("");

  const { speeches, activeSpeechId, setActiveSpeechId, filter, selectedTime } =
    useStore();

  /**
   * 指定された演説データに基づいてカスタムマーカーを作成する．
   */
  const createMarker = useCallback(
    (
      speech: Speech,
      showPopupFn: (speech: Speech, shouldZoom: boolean) => void,
      closePopupFn: () => void,
    ): maplibregl.Marker | null => {
      // ローカル変数に確保して型ガードを有効にする
      const currentMap = map.current;
      if (!speech.lat || !speech.lng || !currentMap) return null;

      let opacity = 1;
      let scale = 1;
      let zIndex = 1;

      // 検索フィルタ適用中かつ「今日」モード時かつ終日モードでない場合の視覚的強調処理
      if (
        filter.selectedNames.length > 0 &&
        filter.dateMode === "today" &&
        !filter.allDay
      ) {
        const speechTime = new Date(speech.start_at).getTime();
        const currentTime = selectedTime.getTime();
        const diffHours = Math.abs(speechTime - currentTime) / (1000 * 60 * 60);

        // 選択時刻の前後 1.5 時間以内を強調し，他を透過させる
        if (diffHours <= 1.5) {
          scale = 1.2;
          zIndex = 10;
        } else {
          opacity = 0.3;
          scale = 0.8;
          zIndex = 0;
        }
      }

      // マーカー要素を作成
      const el = document.createElement("div");
      el.className = "party-marker";
      el.style.backgroundColor = speech.party_color;
      el.id = `marker-${speech.id}`;
      el.style.opacity = opacity.toString();
      el.style.transform = `scale(${scale})`;
      el.style.zIndex = zIndex.toString();

      // マーカークリック時の処理（ズームあり）
      el.addEventListener("click", e => {
        e.stopPropagation();
        showPopupFn(speech, true);
        setActiveSpeechId(speech.id);
      });

      // Hover時にもpopupを表示（ズームなし）
      el.addEventListener("mouseenter", () => {
        showPopupFn(speech, false);
      });

      // Hoverを外したらpopupを閉じる
      el.addEventListener("mouseleave", () => {
        closePopupFn();
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([speech.lng, speech.lat])
        .addTo(currentMap);

      return marker;
    },
    [
      setActiveSpeechId,
      filter.selectedNames,
      filter.dateMode,
      filter.allDay,
      selectedTime,
    ],
  );

  /**
   * マーカークリック時に詳細情報を表示するポップアップを生成・表示する．
   * @param speech 演説データ
   * @param shouldZoom ズームインを行うかどうか（クリック時はtrue、hover時はfalse）
   */
  const showPopup = useCallback(
    (speech: Speech, shouldZoom = true) => {
      // ローカル変数に確保して型ガードを有効にする
      const currentMap = map.current;
      if (!speech.lat || !speech.lng || !currentMap) return;

      if (popupRef.current) {
        isProgrammaticClose.current = true;
        popupRef.current.remove();
        isProgrammaticClose.current = false;
      }

      const startTime = new Date(speech.start_at);
      const timeStr = format(startTime, "M月d日 HH:mm", { locale: ja });

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
        .addTo(currentMap);

      popup.on("close", () => {
        if (!isProgrammaticClose.current) {
          setActiveSpeechId(null);
        }
      });

      popupRef.current = popup;

      // ズームインはクリック時のみ実行
      if (shouldZoom) {
        currentMap.flyTo({
          center: [speech.lng, speech.lat],
          zoom: 15,
          duration: 1000,
        });
      }
    },
    [setActiveSpeechId],
  );

  /**
   * ポップアップを閉じる
   */
  const closePopup = useCallback(() => {
    if (popupRef.current) {
      isProgrammaticClose.current = true;
      popupRef.current.remove();
      popupRef.current = null;
      isProgrammaticClose.current = false;
    }
  }, []);

  /**
   * コンポーネントのマウント時に地図インスタンスを初期化する．
   */
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: OSM_STYLE,
      center: [139.6917, 35.6895],
      zoom: 10,
      attributionControl: false,
    });

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

    // ルート表示用の矢印アイコンを生成して登録する
    map.current.on("load", () => {
      if (!map.current) return;
      const size = 128;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 12;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.beginPath();
        const padding = size * 0.1;
        const h = size - padding * 2;
        const left = padding;
        const right = size - padding;
        const top = padding;
        const bottom = size - padding;
        const centerX = size / 2;

        ctx.moveTo(left, bottom);
        ctx.lineTo(centerX, top);
        ctx.lineTo(right, bottom);
        ctx.lineTo(centerX, bottom - h * 0.3);
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

    // ポップアップおよびマーカー用のカスタムスタイルを注入する
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
      .maplibregl-popup {
        z-index: 100;
      }
      .party-marker {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);
        cursor: pointer;
        transition: border-color 0.2s, box-shadow 0.2s, opacity 0.3s;
        box-sizing: border-box;
      }
      .party-marker:hover {
        box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.5), 0 8px 12px -2px rgba(0,0,0,0.4);
        z-index: 10;
        border-width: 2px;
      }
      .party-marker.active {
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

  /**
   * 演説データまたはフィルター条件が変更された際に，マーカーと移動経路を更新する．
   */
  useEffect(() => {
    if (!map.current) return;

    const currentSpeechIds = speeches
      .map(s => s.id)
      .sort((a, b) => a - b)
      .join(",");
    const isDataChanged = currentSpeechIds !== prevSpeechIdsRef.current;

    // 既存の全マーカーを地図から削除してクリアする
    markersRef.current.forEach(marker => {
      marker.remove();
    });
    markersRef.current.clear();

    // 新しい演説リストに基づいてマーカーを再配置する
    speeches.forEach(speech => {
      const marker = createMarker(speech, showPopup, closePopup);
      if (marker) {
        markersRef.current.set(speech.id, marker);
      }
    });

    const sourceId = "route-source";
    const lineLayerId = "route-line-layer";
    const arrowLayerId = "route-arrow-layer";

    const removeLayers = () => {
      if (!map.current) return;

      // 既存のレイヤーを削除
      if (map.current.getLayer(arrowLayerId))
        map.current.removeLayer(arrowLayerId);
      if (map.current.getLayer(lineLayerId))
        map.current.removeLayer(lineLayerId);
      if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);

      // 候補者ごとのレイヤーも削除（route-*パターン）
      const style = map.current.getStyle();
      if (style?.layers) {
        style.layers.forEach(layer => {
          if (
            layer.id.startsWith("route-line-layer-") ||
            layer.id.startsWith("route-arrow-layer-")
          ) {
            map.current?.removeLayer(layer.id);
          }
        });
      }
      if (style?.sources) {
        Object.keys(style.sources).forEach(sourceKey => {
          if (sourceKey.startsWith("route-source-")) {
            map.current?.removeSource(sourceKey);
          }
        });
      }
    };

    removeLayers();

    let shouldFitBounds = false;
    const boundsCoordinates: [number, number][] = [];

    // 表示範囲の計算用に座標を収集する
    speeches.forEach(s => {
      if (s.lng && s.lat) {
        boundsCoordinates.push([s.lng, s.lat]);
      }
    });

    if (filter.selectedNames.length > 0) {
      shouldFitBounds = true;
    }

    // 演説が複数ある場合で、かつ1人だけ選択時のみ移動経路を描画する
    // （同一候補者または共通弁士がいる場合のみ）
    if (speeches.length >= 2 && filter.selectedNames.length === 1) {
      const candidateIds = new Set(speeches.map(s => s.candidate_id));
      const isSingleCandidate = candidateIds.size === 1;

      let isCommonSpeaker = false;
      const firstSpeakers = speeches[0].speakers || [];
      if (!isSingleCandidate && firstSpeakers.length > 0) {
        isCommonSpeaker = firstSpeakers.some(speaker =>
          speeches.every(s => s.speakers?.includes(speaker)),
        );
      }

      if (isSingleCandidate || isCommonSpeaker) {
        // 単一候補者または共通弁士の場合は従来通り1本の経路
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

          try {
            if (map.current) {
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

              if (map.current.hasImage("arrow-icon")) {
                map.current.addLayer({
                  id: arrowLayerId,
                  type: "symbol",
                  source: sourceId,
                  layout: {
                    "symbol-placement": "line",
                    "symbol-spacing": 100,
                    "icon-image": "arrow-icon",
                    "icon-size": 0.6,
                    "icon-allow-overlap": true,
                    "icon-rotate": 90,
                    "icon-rotation-alignment": "map",
                  },
                  paint: {
                    "icon-color": partyColor,
                    "icon-halo-color": "#ffffff",
                    "icon-halo-width": 2,
                  },
                });
              }
            }
          } catch (e) {
            console.error("❌ Failed to add route layer:", e);
            removeLayers();
          }
        }
      }
    }

    // 必要に応じて表示範囲全体のズーム調整を行う (Fit Bounds) ．
    // データが変更された場合のみ実行する．
    if (
      isDataChanged &&
      shouldFitBounds &&
      boundsCoordinates.length > 0 &&
      map.current
    ) {
      const bounds = new maplibregl.LngLatBounds();
      boundsCoordinates.forEach(coord => {
        bounds.extend(coord);
      });

      // 地図サイズが変更されている可能性があるため強制的にリサイズを反映
      map.current.resize();

      map.current.fitBounds(bounds, {
        padding: { top: 80, bottom: 150, left: 50, right: 50 },
        maxZoom: 16,
        duration: 1200,
      });
    }

    // 1 つだけのピンの場合は Tooltip を表示する（データ変更時）．
    if (isDataChanged && speeches.length === 1) {
      setTimeout(() => {
        showPopup(speeches[0], false);
      }, 100);
    }

    // フィルター結果が 0 件の場合は日本列島全体にズームアウトする．
    if (
      isDataChanged &&
      speeches.length === 0 &&
      filter.selectedNames.length > 0 &&
      map.current
    ) {
      // 日本列島全体が見える範囲．
      const japanBounds = new maplibregl.LngLatBounds(
        [127.5, 26.0], // 南西
        [146.0, 46.0], // 北東
      );

      map.current.fitBounds(japanBounds, {
        padding: 50,
        maxZoom: 5,
        duration: 1200,
      });
    }

    // データ変更状態を更新する．
    if (isDataChanged) {
      prevSpeechIdsRef.current = currentSpeechIds;
    }
  }, [speeches, filter.selectedNames, createMarker, showPopup, closePopup]);

  /**
   * ストア上のアクティブな演説 ID が変更された際，マーカーの強調および詳細ポップアップ表示を行う．
   */
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const el = marker.getElement();
      el.classList.toggle("active", id === activeSpeechId);
    });

    if (activeSpeechId) {
      const speech = speeches.find(s => s.id === activeSpeechId);
      if (speech) {
        showPopup(speech);

        // モバイルかつポップアップ表示時は中心を少し上にずらすなどの調整が必要になる可能性があるが
        // まずは fitBounds の Padding 修正で全体の挙動を確認する
      } else {
        if (popupRef.current) {
          isProgrammaticClose.current = true;
          popupRef.current.remove();
          popupRef.current = null;
          isProgrammaticClose.current = false;
        }
      }
    } else {
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
