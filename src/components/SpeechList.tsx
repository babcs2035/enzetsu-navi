"use client";

import {
  Box,
  Flex,
  Heading,
  Link,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  AlertCircle,
  Clock,
  ExternalLink,
  Map as MapIcon,
  MapPin,
  Users,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { useStore } from "@/store/useStore";

interface SpeechListProps {
  onSelect?: () => void;
}

/**
 * 演説リスト表示コンポーネント．
 * 取得・フィルタリングされた演説データをカード形式のリストで表示し，
 * クリックによる詳細選択や，地図との連動スクロールを制御する．
 */
export function SpeechList({ onSelect }: SpeechListProps) {
  const { speeches, activeSpeechId, setActiveSpeechId, isLoading, error } =
    useStore();
  const listRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  /**
   * 地図上でピンが選択された際，該当するリストアイテムまで自動スクロールする．
   */
  useEffect(() => {
    if (activeSpeechId) {
      const cardEl = cardRefs.current.get(activeSpeechId);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeSpeechId]);

  /**
   * リスト内のアイテムがクリックされた際のハンドラ．
   */
  const handleSpeechClick = (id: number) => {
    setActiveSpeechId(id);
    if (onSelect) {
      onSelect();
    }
  };

  // データ読み込み中（かつ初回表示時）のローディング表示
  if (isLoading && speeches.length === 0) {
    return (
      <Flex align="center" justify="center" h="full">
        <VStack gap={3}>
          <Spinner size="lg" color="blue.500" borderWidth="3px" />
          <Text color="gray.500" fontSize="sm">
            データを読み込み中...
          </Text>
        </VStack>
      </Flex>
    );
  }

  // データ取得エラー発生時の表示
  if (error) {
    return (
      <Flex align="center" justify="center" h="full" p={4}>
        <VStack gap={3}>
          <AlertCircle size={40} color="#F56565" />
          <Text color="gray.800">エラーが発生しました</Text>
          <Text color="gray.500" fontSize="sm">
            {error}
          </Text>
        </VStack>
      </Flex>
    );
  }

  // 表示対象のデータが 0 件の場合の表示
  if (speeches.length === 0) {
    return (
      <Flex align="center" justify="center" h="full" p={4}>
        <VStack gap={3}>
          <MapPin size={40} color="#CBD5E0" />
          <Text color="gray.600">この時間帯の演説データはありません</Text>
          <Text color="gray.400" fontSize="sm">
            時間を変更してみてください
          </Text>
        </VStack>
      </Flex>
    );
  }

  return (
    <Box ref={listRef} h="full" overflowY="auto" p={4}>
      <Flex align="center" justify="space-between" mb={3}>
        <Text fontSize="sm" color="gray.500">
          {speeches.length} 件の演説
        </Text>
        {isLoading && <Spinner size="sm" color="blue.500" />}
      </Flex>

      <VStack gap={3} align="stretch">
        {speeches.map(speech => {
          const isActive = speech.id === activeSpeechId;
          const startTime = new Date(speech.start_at);

          return (
            <Box
              key={speech.id}
              ref={(el: HTMLDivElement | null) => {
                if (el) cardRefs.current.set(speech.id, el);
              }}
              onClick={() => handleSpeechClick(speech.id)}
              p={4}
              borderRadius="xl"
              cursor="pointer"
              bg={isActive ? "blue.50" : "whiteAlpha.900"}
              borderWidth="1px"
              borderColor={isActive ? "blue.400" : "gray.200"}
              boxShadow={isActive ? "md" : "sm"}
              _hover={{
                borderColor: "blue.300",
                transform: "translateY(-1px)",
              }}
              transition="all 0.2s"
            >
              {/* 政党情報バッジ */}
              <Flex align="center" gap={2} mb={2}>
                <Box
                  w={2.5}
                  h={2.5}
                  borderRadius="full"
                  bg={speech.party_color}
                />
                <Text fontSize="xs" color="gray.500" fontWeight="medium">
                  {speech.party_name}
                </Text>
              </Flex>

              {/* 候補者名 */}
              <Heading size="md" color="gray.800" mb={3} lineHeight="shorter">
                {speech.candidate_name}
              </Heading>

              {/* 応援弁士（存在する場合のみ表示） */}
              {speech.speakers && speech.speakers.length > 0 && (
                <Flex align="flex-start" gap={2.5} mb={2}>
                  <Users
                    size={16}
                    color="#4A5568"
                    style={{ marginTop: 3, flexShrink: 0 }}
                  />
                  <Box>
                    <Text
                      fontSize="xs"
                      color="gray.500"
                      fontWeight="bold"
                      mb={0.5}
                      lineHeight="shorter"
                    >
                      応援弁士
                    </Text>
                    <Text
                      fontSize="sm"
                      fontWeight="bold"
                      color="gray.700"
                      lineHeight="base"
                    >
                      {speech.speakers.join(", ")}
                    </Text>
                  </Box>
                </Flex>
              )}

              {/* 演説場所と日時情報 */}
              <VStack align="stretch" gap={2}>
                <Flex align="flex-start" gap={2.5}>
                  <MapPin
                    size={16}
                    color="#4A5568"
                    style={{ marginTop: 3, flexShrink: 0 }}
                  />
                  <Box>
                    <Text
                      fontSize="sm"
                      fontWeight="bold"
                      color="gray.700"
                      lineHeight="base"
                    >
                      {speech.location_name}
                    </Text>
                    {!speech.lat && (
                      <Flex align="center" gap={1} mt={1}>
                        <AlertCircle size={12} color="#ECC94B" />
                        <Text fontSize="xs" color="yellow.600">
                          座標不明 - 地図に表示されません
                        </Text>
                      </Flex>
                    )}
                  </Box>
                </Flex>

                <Flex align="center" gap={2.5}>
                  <Clock size={16} color="#4A5568" style={{ flexShrink: 0 }} />
                  <Text fontSize="sm" fontWeight="bold" color="gray.700">
                    {format(startTime, "M月d日 (E) HH:mm", { locale: ja })}
                  </Text>

                  {/* 各種外部リンクボタン */}
                  <Flex ml="auto" gap={2}>
                    {speech.source_url && (
                      <Link
                        href={speech.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        display="inline-flex"
                        alignItems="center"
                        gap={1}
                        color="blue.500"
                        bg="blue.50"
                        px={2}
                        py={1}
                        borderRadius="md"
                        fontSize="xs"
                        fontWeight="bold"
                        _hover={{
                          bg: "blue.100",
                          textDecoration: "none",
                        }}
                      >
                        <ExternalLink size={12} />
                        出典
                      </Link>
                    )}

                    {speech.lat && speech.lng && (
                      <Link
                        href={`https://www.google.com/maps/search/?api=1&query=${speech.lat},${speech.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        display="inline-flex"
                        alignItems="center"
                        gap={1}
                        color="blue.500"
                        bg="blue.50"
                        px={2}
                        py={1}
                        borderRadius="md"
                        fontSize="xs"
                        fontWeight="bold"
                        _hover={{
                          bg: "blue.100",
                          textDecoration: "none",
                        }}
                      >
                        <MapIcon size={12} />
                        地図
                      </Link>
                    )}
                  </Flex>
                </Flex>
              </VStack>
            </Box>
          );
        })}
      </VStack>
    </Box>
  );
}
