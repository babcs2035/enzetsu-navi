"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import { Building2, MapPin, Users } from "lucide-react";
import { useStore } from "@/store/useStore";

/**
 * 統計情報表示コンポーネント．
 * 登録されている演説データ，候補者，政党の総数などを表示する．
 */
export function Stats() {
  const { rawSpeeches } = useStore();

  // 現在表示されているデータ（フィルター前）の統計を計算
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

  if (rawSpeeches.length === 0) return null; // データがない時は表示しない？ または0件表示？ 今回は0件でも表示してよいが、nullのままでもよい。

  return (
    <Box
      bg="whiteAlpha.900"
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
