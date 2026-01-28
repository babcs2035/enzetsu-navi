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
import { AlertCircle, Clock, ExternalLink, MapPin, Users } from "lucide-react";
import { useEffect, useRef } from "react";
import { useStore } from "@/store/useStore";

export function SpeechList() {
  const { speeches, activeSpeechId, setActiveSpeechId, isLoading, error } =
    useStore();
  const listRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // アクティブな演説にスクロール
  useEffect(() => {
    if (activeSpeechId) {
      const cardEl = cardRefs.current.get(activeSpeechId);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeSpeechId]);

  // ローディング表示
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

  // エラー表示
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

  // データなし
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
      {/* 件数表示 */}
      <Flex align="center" justify="space-between" mb={3}>
        <Text fontSize="sm" color="gray.500">
          {speeches.length}件の演説
        </Text>
        {isLoading && <Spinner size="sm" color="blue.500" />}
      </Flex>

      {/* 演説カードリスト */}
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
              onClick={() => setActiveSpeechId(speech.id)}
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
              {/* 政党バッジ */}
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
              <Heading size="sm" color="gray.800" mb={3}>
                {speech.candidate_name}
              </Heading>

              {/* 弁士情報 (あれば表示) */}
              {speech.speakers && speech.speakers.length > 0 && (
                <Flex
                  align="flex-start"
                  gap={2}
                  mb={2}
                  p={2}
                  bg="gray.50"
                  borderRadius="md"
                >
                  <Users
                    size={14}
                    color="#718096"
                    style={{ marginTop: 2, flexShrink: 0 }}
                  />
                  <Box>
                    <Text
                      fontSize="xs"
                      color="gray.500"
                      fontWeight="bold"
                      mb={0.5}
                    >
                      応援弁士
                    </Text>
                    <Text fontSize="sm" color="gray.700">
                      {speech.speakers.join(", ")}
                    </Text>
                  </Box>
                </Flex>
              )}

              {/* 場所 */}
              <Flex align="flex-start" gap={2} mb={2}>
                <MapPin
                  size={16}
                  color="#718096"
                  style={{ marginTop: 2, flexShrink: 0 }}
                />
                <Box>
                  <Text fontSize="sm" color="gray.700">
                    {speech.location_name}
                  </Text>
                  {speech.address && (
                    <Text fontSize="xs" color="gray.500" mt={0.5}>
                      {speech.address}
                    </Text>
                  )}
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

              {/* 時刻 */}
              <Flex
                align="center"
                gap={2}
                fontSize="xs"
                color="gray.500"
                mt={3}
                pt={2}
                borderTopWidth="1px"
                borderColor="gray.100"
              >
                <Clock size={14} />
                <Text>
                  {format(startTime, "M月d日（E） HH:mm", { locale: ja })}
                </Text>

                {/* ソースリンク (右寄せ) */}
                {speech.source_url && (
                  <Link
                    href={speech.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    display="inline-flex"
                    alignItems="center"
                    gap={1}
                    ml="auto"
                    color="blue.500"
                    _hover={{ color: "blue.600", textDecoration: "underline" }}
                  >
                    <ExternalLink size={12} />
                    出典
                  </Link>
                )}
              </Flex>
            </Box>
          );
        })}
      </VStack>
    </Box>
  );
}
