"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import { Building2, MapPin, Users } from "lucide-react";
import { useStore } from "@/store/useStore";

/**
 * 統計情報表示コンポーネント．
 * 選択された時間帯に基づき，演説地点数，候補者数，政党数の情報をコンパクトに表示する．
 */
export function Stats() {
  const { rawSpeeches } = useStore();

  // フィルタリング適用前の生データ（時間帯指定のみ適用済み）から統計値を算出する
  const uniqueHandlers = new Set(rawSpeeches.map(s => s.candidate_id));
  const uniqueParties = new Set(rawSpeeches.map(s => s.party_id));

  const items = [
    {
      icon: MapPin,
      value: rawSpeeches.length.toLocaleString(),
      color: "#3b82f6",
    },
    {
      icon: Users,
      value: uniqueHandlers.size.toLocaleString(),
      color: "#10B981",
    },
    {
      icon: Building2,
      value: uniqueParties.size.toLocaleString(),
      color: "#F59E0B",
    },
  ];

  if (rawSpeeches.length === 0) return null;

  return (
    <Box
      bg="rgba(249, 250, 251, 0.9)"
      backdropFilter="blur(12px)"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="xl"
      p={2}
      boxShadow="lg"
    >
      <Flex align="center" gap={3}>
        {items.map(item => (
          <Flex key={item.color} align="center" gap={1.5}>
            <item.icon size={14} color={item.color} />
            <Text fontSize="sm" fontWeight="bold" color="gray.700">
              {item.value}
            </Text>
          </Flex>
        ))}
      </Flex>
    </Box>
  );
}
