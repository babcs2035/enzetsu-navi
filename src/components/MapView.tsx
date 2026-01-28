"use client";

import maplibregl from "maplibre-gl";
import { useCallback, useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { Box } from "@chakra-ui/react";
import { useStore } from "@/store/useStore";
import type { Speech } from "@/types";

// OpenStreetMap タイルスタイル（APIキー不要）
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

export function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<number, maplibregl.Marker>>(new Map());
  const popupRef = useRef<maplibregl.Popup | null>(null);

  const { speeches, activeSpeechId, setActiveSpeechId } = useStore();

  // マーカーを作成
  const createMarker = useCallback(
    (speech: Speech): maplibregl.Marker | null => {
      if (!speech.lat || !speech.lng || !map.current) return null;

      // マーカー要素を作成
      const el = document.createElement("div");
      el.className = "party-marker";
      el.style.backgroundColor = speech.party_color;
      el.id = `marker-${speech.id}`;

      // クリックイベント
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

  // ポップアップを表示
  const showPopup = useCallback(
    (speech: Speech) => {
      if (!speech.lat || !speech.lng || !map.current) return;

      // 既存のポップアップを閉じる（プログラム的なのでイベント発火させない、あるいはフラグ立て）
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

      // スタイル調整: bgを純白からわずかにオフホワイトへ、テキスト色を調整
      const popupContent = `
      <div style="min-width: 200px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${speech.party_color};"></div>
          <span style="font-size: 12px; color: #64748b; font-weight: 500;">${speech.party_name}</span>
        </div>
        <h3 style="font-weight: bold; color: #1e293b; margin-bottom: 4px; font-size: 16px;">${speech.candidate_name}</h3>
        ${speech.speakers && speech.speakers.length > 0 ? `<div style="font-size: 12px; color: #475569; margin-bottom: 4px; background-color: #f1f5f9; padding: 4px; border-radius: 4px;"><span style="font-weight: bold; color: #64748b;">弁士:</span> ${speech.speakers.join(", ")}</div>` : ""}
        <p style="font-size: 14px; color: #334155; margin-bottom: 8px;">${speech.location_name}</p>
        <p style="font-size: 12px; color: #64748b;">${timeStr}</p>
        ${speech.source_url ? `<a href="${speech.source_url}" target="_blank" rel="noopener noreferrer" style="font-size: 12px; color: #3b82f6; margin-top: 8px; display: inline-block; text-decoration: none; font-weight: 500;">詳細を見る →</a>` : ""}
      </div>
    `;

      const popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: false,
        maxWidth: "300px",
        className: "custom-popup", // CSSでスタイル制御しやすくするため
      })
        .setLngLat([speech.lng, speech.lat])
        .setHTML(popupContent)
        .addTo(map.current);

      // closeイベントハンドリング
      popup.on("close", () => {
        if (!isProgrammaticClose.current) {
          setActiveSpeechId(null);
        }
      });

      popupRef.current = popup;

      // 地図を移動
      map.current.flyTo({
        center: [speech.lng, speech.lat],
        zoom: 15,
        duration: 1000,
      });
    },
    [setActiveSpeechId],
  );

  // 地図の初期化
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: OSM_STYLE,
      center: [139.6917, 35.6895], // 東京
      zoom: 10,
      attributionControl: false,
    });

    // コントロールを追加
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

  // マーカーの更新
  useEffect(() => {
    if (!map.current) return;

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
  }, [speeches, createMarker]);

  // アクティブな演説が変更されたとき
  useEffect(() => {
    // 全てのマーカーのアクティブ状態をリセット
    markersRef.current.forEach((marker, id) => {
      const el = marker.getElement();
      el.classList.toggle("active", id === activeSpeechId);
    });

    // ポップアップを表示
    if (activeSpeechId) {
      const speech = speeches.find(s => s.id === activeSpeechId);
      if (speech) {
        showPopup(speech);
      }
    }
  }, [activeSpeechId, speeches, showPopup]);

  return <Box ref={mapContainer} w="full" h="full" />;
}
