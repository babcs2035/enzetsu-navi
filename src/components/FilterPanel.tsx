"use client";

import { Box, Button, Flex, Text, VStack } from "@chakra-ui/react";
import { Check } from "lucide-react";
import { useStore } from "@/store/useStore";

/**
 * フィルターパネルコンポーネント．
 * 政党の選択状態に応じたフィルタリング機能，および該当件数の表示を行う．
 */
export function FilterPanel() {
  const { parties, filter, setFilter, resetFilter, rawSpeeches } = useStore();

  /**
   * 指定された政党の選択状態を切り替える．
   */
  const toggleParty = (partyId: number) => {
    const newIds = filter.selectedPartyIds.includes(partyId)
      ? filter.selectedPartyIds.filter(id => id !== partyId)
      : [...filter.selectedPartyIds, partyId];
    setFilter({ selectedPartyIds: newIds });
  };

  /**
   * 全ての政党の選択を解除（＝全て表示）する．
   */
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

            // 現在の時間帯の全データのうち，この政党に属する演説数をカウントする
            const count = rawSpeeches.filter(
              s => s.party_id === party.id,
            ).length;

            const isDisabled = count === 0;

            return (
              <Flex
                key={party.id}
                as="button"
                onClick={() => !isDisabled && toggleParty(party.id)}
                align="center"
                gap={3}
                p={2}
                borderRadius="lg"
                bg={isSelected ? "blue.50" : "whiteAlpha.600"}
                borderWidth="1px"
                borderColor={isSelected ? "blue.200" : "transparent"}
                opacity={isDisabled ? 0.4 : isSelected ? 1 : 0.8}
                _hover={{
                  bg: isDisabled
                    ? "whiteAlpha.600"
                    : isSelected
                      ? "blue.100"
                      : "blackAlpha.50",
                }}
                cursor={isDisabled ? "default" : "pointer"}
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
