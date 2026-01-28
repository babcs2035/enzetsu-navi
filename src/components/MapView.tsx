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

      // 既存のポップアップを閉じる（プログラム的な制御なのでイベントを発火させない，フラグで管理する）．
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

      // Lucide Icons を SVG 文字列として定義する．
      const iconColor = "#4A5568";
      const iconStyle =
        "width: 16px; height: 16px; flex-shrink: 0; vertical-align: middle;";

      const mapPinIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="${iconStyle}"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;

      const clockIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="${iconStyle}"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

      const usersIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="${iconStyle}"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;

      // スタイル調整: bg を純白からわずかにオフホワイトへ変更し，テキスト色を調整する．
      const popupContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 4px; max-width: 240px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 4px;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background-color: ${speech.party_color};"></div>
            <span style="font-size: 11px; color: #64748b; font-weight: 500;">${speech.party_name}</span>
          </div>
        </div>
        
        <h3 style="font-size: 16px; font-weight: bold; color: #1e293b; margin: 0 0 10px 0; line-height: 1.4;">
          ${speech.candidate_name}
        </h3>
        
        ${
          speech.speakers && speech.speakers.length > 0
            ? `
          <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 10px;">
            <div style="margin-top: 2px;">${usersIcon}</div>
            <div>
              <div style="font-size: 11px; font-weight: bold; color: #718096; line-height: 1;">応援弁士</div>
              <div style="font-size: 13px; font-weight: bold; color: #374151; line-height: 1.4;">${speech.speakers.join(", ")}</div>
            </div>
          </div>
        `
            : ""
        }
        
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; align-items: flex-start; gap: 8px;">
            <div style="margin-top: 2px;">${mapPinIcon}</div>
            <span style="font-size: 13px; font-weight: bold; color: #374151; line-height: 1.4;">${speech.location_name}</span>
          </div>
          
          <div style="display: flex; align-items: center; gap: 8px;">
             <div>${clockIcon}</div>
            <span style="font-size: 13px; font-weight: bold; color: #374151;">${timeStr}</span>
          </div>
        </div>
        
        ${
          speech.source_url
            ? `
          <div style="text-align: right; margin-top: 8px; border-top: 1px solid #f1f5f9; padding-top: 8px;">
            <a href="${speech.source_url}" target="_blank" rel="noopener noreferrer" style="font-size: 11px; color: #3b82f6; text-decoration: none; font-weight: 500;">詳細を見る →</a>
          </div>
        `
            : ""
        }
      </div>
    `;

      const popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: false,
        maxWidth: "300px",
        className: "custom-popup", // CSS でスタイル制御しやすくするためにクラスを追加する．
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

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
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
      }
    }
  }, [activeSpeechId, speeches, showPopup]);

  return <Box ref={mapContainer} w="full" h="full" />;
}
