"use client";

import {
  Box,
  Button,
  Checkbox,
  Flex,
  Heading,
  IconButton,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Check, X } from "lucide-react";
import { useStore } from "@/store/useStore";

interface FilterPanelProps {
  onClose: () => void;
}

export function FilterPanel({ onClose }: FilterPanelProps) {
  const { parties, filter, setFilter, resetFilter } = useStore();

  const toggleParty = (partyId: number) => {
    const newIds = filter.selectedPartyIds.includes(partyId)
      ? filter.selectedPartyIds.filter(id => id !== partyId)
      : [...filter.selectedPartyIds, partyId];
    setFilter({ selectedPartyIds: newIds });
  };

  const selectAllParties = () => {
    setFilter({ selectedPartyIds: parties.map(p => p.id) });
  };

  const deselectAllParties = () => {
    setFilter({ selectedPartyIds: [] });
  };

  return (
    <Box
      bg="whiteAlpha.900"
      backdropFilter="blur(12px)"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="2xl"
      p={4}
      w="72"
      boxShadow="lg"
    >
      <Flex align="center" justify="space-between" mb={4}>
        <Heading size="sm" color="gray.800">
          フィルター
        </Heading>
        <IconButton
          aria-label="閉じる"
          onClick={onClose}
          variant="ghost"
          size="sm"
          color="gray.600"
          _hover={{ bg: "gray.100" }}
        >
          <X size={16} />
        </IconButton>
      </Flex>

      {/* 政党フィルター */}
      <Box mb={4}>
        <Flex align="center" justify="space-between" mb={2}>
          <Text fontSize="sm" color="gray.500">
            政党
          </Text>
          <Flex gap={2}>
            <Button
              variant="plain"
              size="xs"
              color="blue.500"
              onClick={selectAllParties}
              _hover={{ textDecoration: "underline" }}
            >
              全選択
            </Button>
            <Button
              variant="plain"
              size="xs"
              color="gray.400"
              onClick={deselectAllParties}
              _hover={{ textDecoration: "underline" }}
            >
              解除
            </Button>
          </Flex>
        </Flex>

        <VStack gap={1.5} maxH="64" overflowY="auto" align="stretch">
          {parties.map(party => {
            const isSelected =
              filter.selectedPartyIds.length === 0 ||
              filter.selectedPartyIds.includes(party.id);
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
                {isSelected && <Check size={16} color="#3b82f6" />}
              </Flex>
            );
          })}
        </VStack>
      </Box>

      {/* 期間フィルター */}
      <Box mb={4}>
        <Text fontSize="sm" color="gray.500" mb={2}>
          期間
        </Text>
        <VStack align="stretch" gap={2}>
          {(["today", "upcoming", "all"] as const).map(mode => {
            const isSelected = filter.dateMode === mode;
            let label = "";
            switch (mode) {
              case "today":
                label = "本日の演説";
                break;
              case "upcoming":
                label = "これから実施される演説";
                break;
              case "all":
                label = "すべての演説（過去含む）";
                break;
            }

            return (
              <Button
                key={mode}
                onClick={() => setFilter({ dateMode: mode })}
                variant={isSelected ? "solid" : "outline"}
                colorScheme="blue"
                size="sm"
                justifyContent="flex-start"
                bg={isSelected ? "blue.500" : "transparent"}
                color={isSelected ? "white" : "gray.700"}
                borderColor={isSelected ? "blue.500" : "gray.200"}
                _hover={{
                  bg: isSelected ? "blue.600" : "gray.50",
                }}
              >
                {label}
              </Button>
            );
          })}
        </VStack>
      </Box>

      {/* 表示オプション */}
      <Box borderTop="1px solid" borderColor="gray.100" pt={4}>
        <Checkbox.Root
          checked={filter.showWithLocationOnly}
          onCheckedChange={e =>
            setFilter({ showWithLocationOnly: !!e.checked })
          }
          colorPalette="blue"
          display="flex"
          alignItems="center"
          gap={2}
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control
            bg="white"
            borderColor="gray.300"
            _checked={{ bg: "blue.500", borderColor: "blue.500" }}
            borderRadius="sm"
            width={4}
            height={4}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Checkbox.Indicator>
              <Check size={12} color="white" />
            </Checkbox.Indicator>
          </Checkbox.Control>
          <Checkbox.Label>
            <Text fontSize="sm" color="gray.600">
              座標のあるデータのみ表示
            </Text>
          </Checkbox.Label>
        </Checkbox.Root>
      </Box>

      {/* リセットボタン */}
      <Button
        onClick={resetFilter}
        variant="ghost"
        size="sm"
        w="full"
        mt={4}
        color="gray.500"
        _hover={{ color: "gray.700" }}
      >
        フィルターをリセット
      </Button>
    </Box>
  );
}
