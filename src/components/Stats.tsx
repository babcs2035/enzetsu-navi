"use client";

import { Box, Flex, Spinner, Text } from "@chakra-ui/react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  AlertTriangle,
  Building2,
  MapPin,
  RefreshCw,
  Users,
} from "lucide-react";
import { useStore } from "@/store/useStore";

export function Stats() {
  const { stats, isLoading } = useStore();

  if (!stats) return null;

  const items = [
    {
      icon: MapPin,
      label: "演説データ",
      value: stats.total_speeches,
      color: "#3b82f6",
    },
    {
      icon: Users,
      label: "候補者",
      value: stats.total_candidates,
      color: "#10B981",
    },
    {
      icon: Building2,
      label: "政党",
      value: stats.total_parties,
      color: "#F59E0B",
    },
  ];

  return (
    <Box
      bg="whiteAlpha.900"
      backdropFilter="blur(12px)"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="2xl"
      p={3}
      boxShadow="lg"
    >
      <Flex align="center" gap={4}>
        {items.map(item => (
          <Flex key={item.label} align="center" gap={2}>
            <item.icon
              size={16}
              color={item.label === "演説データ" ? "#3b82f6" : item.color}
            />
            <Box>
              <Text fontSize="lg" fontWeight="bold" color="gray.800">
                {item.value.toLocaleString()}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {item.label}
              </Text>
            </Box>
          </Flex>
        ))}

        {/* 座標不明件数 */}
        {stats.speeches_without_location > 0 && (
          <Flex
            align="center"
            gap={2}
            pl={4}
            borderLeft="1px solid"
            borderColor="gray.200"
          >
            <AlertTriangle size={16} color="#ECC94B" />
            <Box>
              <Text fontSize="sm" fontWeight="medium" color="yellow.500">
                {stats.speeches_without_location}
              </Text>
              <Text fontSize="xs" color="gray.500">
                座標不明
              </Text>
            </Box>
          </Flex>
        )}
      </Flex>

      {/* 最終更新時刻 */}
      {stats.last_updated && (
        <Flex
          align="center"
          gap={1.5}
          mt={2}
          pt={2}
          borderTop="1px solid"
          borderColor="gray.200"
        >
          {isLoading ? (
            <Spinner size="xs" color="gray.400" />
          ) : (
            <RefreshCw size={12} color="#A0AEC0" />
          )}
          <Text fontSize="xs" color="gray.500">
            最終更新:{" "}
            {format(new Date(stats.last_updated), "M/d HH:mm", { locale: ja })}
          </Text>
        </Flex>
      )}
    </Box>
  );
}
