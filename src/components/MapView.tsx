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

  const { speeches, activeSpeechId, setActiveSpeechId } = useStore();

  // マーカーを作成する．
  const createMarker = useCallback(
    (speech: Speech): maplibregl.Marker | null => {
      if (!speech.lat || !speech.lng || !map.current) return null;

      // マーカー要素を作成する．
      const el = document.createElement("div");
      el.className = "party-marker";
      el.style.backgroundColor = speech.party_color;
      el.id = `marker-${speech.id}`;

      // クリックイベントを設定する．
      el.addEventListener("click", () => {
        setActiveSpeechId(speech.id);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([speech.lng, speech.lat])
        .addTo(map.current);

      return marker;
    },
    [setActiveSpeechId],
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
        transition: border-color 0.2s, box-shadow 0.2s;
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

  // マーカーの更新を行う．
  useEffect(() => {
    if (!map.current) return;

    // 既存のマーカーを削除する．
    markersRef.current.forEach(marker => {
      marker.remove();
    });
    markersRef.current.clear();

    // 新しいマーカーを追加する．
    speeches.forEach(speech => {
      const marker = createMarker(speech);
      if (marker) {
        markersRef.current.set(speech.id, marker);
      }
    });
  }, [speeches, createMarker]);

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
