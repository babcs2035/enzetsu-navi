"use client";

import { Box, Button, Flex, Text, VStack } from "@chakra-ui/react";
import { Check } from "lucide-react";
import { useStore } from "@/store/useStore";

/**
 * フィルターパネルコンポーネント．
 * 政党によるフィルタリング機能を提供する．
 */
export function FilterPanel() {
  const { parties, filter, setFilter, resetFilter, rawSpeeches } = useStore();

  const toggleParty = (partyId: number) => {
    const newIds = filter.selectedPartyIds.includes(partyId)
      ? filter.selectedPartyIds.filter(id => id !== partyId)
      : [...filter.selectedPartyIds, partyId];
    setFilter({ selectedPartyIds: newIds });
  };

  const deselectAllParties = () => {
    setFilter({ selectedPartyIds: [] });
  };

  return (
    <Box>
      <Box mb={4}>
        <Flex align="center" justify="space-between" mb={2}>
          <Text fontSize="sm" color="gray.500">
            政党
          </Text>
          <Button
            variant="plain"
            size="xs"
            color="blue.500"
            onClick={deselectAllParties}
            _hover={{ textDecoration: "underline" }}
          >
            すべて選択
          </Button>
        </Flex>

        <VStack gap={1.5} align="stretch" maxH="60vh" overflowY="auto">
          {parties.map(party => {
            const isSelected =
              filter.selectedPartyIds.length === 0 ||
              filter.selectedPartyIds.includes(party.id);

            // 現在の時間帯の全データから、この政党の件数をカウント
            const count = rawSpeeches.filter(
              s => s.party_id === party.id,
            ).length;

            return (
              <Flex
                key={party.id}
                as="button"
                onClick={() => toggleParty(party.id)}
                align="center"
                gap={3}
                p={2}
                borderRadius="lg"
                bg={isSelected ? "blue.50" : "whiteAlpha.600"}
                borderWidth="1px"
                borderColor={isSelected ? "blue.200" : "transparent"}
                opacity={isSelected ? 1 : 0.8}
                _hover={{ bg: isSelected ? "blue.100" : "blackAlpha.50" }}
                cursor="pointer"
                transition="all 0.2s"
                w="full"
              >
                <Box
                  w={4}
                  h={4}
                  borderRadius="full"
                  flexShrink={0}
                  bg={party.color}
                />
                <Text fontSize="sm" color="gray.700" flex={1} textAlign="left">
                  {party.name}
                </Text>

                {/* 件数表示 */}
                <Text fontSize="xs" color="gray.500" fontWeight="medium">
                  {count}件
                </Text>

                {isSelected && <Check size={16} color="#3b82f6" />}
              </Flex>
            );
          })}
        </VStack>
      </Box>

      <Button
        onClick={resetFilter}
        variant="ghost"
        size="sm"
        w="full"
        mt={4}
        color="gray.500"
        _hover={{ bg: "gray.100", color: "gray.700" }}
      >
        フィルターをリセット
      </Button>
    </Box>
  );
}
