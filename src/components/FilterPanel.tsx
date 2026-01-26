'use client'

import { Box, Button, Checkbox, Flex, Heading, IconButton, Text, VStack } from '@chakra-ui/react'
import { Check, X } from 'lucide-react'
import { useStore } from '@/store/useStore'

interface FilterPanelProps {
  onClose: () => void
}

export function FilterPanel({ onClose }: FilterPanelProps) {
  const { parties, filter, setFilter, resetFilter } = useStore()

  const toggleParty = (partyId: number) => {
    const newIds = filter.selectedPartyIds.includes(partyId)
      ? filter.selectedPartyIds.filter((id) => id !== partyId)
      : [...filter.selectedPartyIds, partyId]
    setFilter({ selectedPartyIds: newIds })
  }

  const selectAllParties = () => {
    setFilter({ selectedPartyIds: parties.map((p) => p.id) })
  }

  const deselectAllParties = () => {
    setFilter({ selectedPartyIds: [] })
  }

  return (
    <Box
      bg="whiteAlpha.50"
      backdropFilter="blur(12px)"
      border="1px solid"
      borderColor="whiteAlpha.100"
      borderRadius="2xl"
      p={4}
      w="72"
      boxShadow="xl"
    >
      <Flex align="center" justify="space-between" mb={4}>
        <Heading size="sm" color="white">
          フィルター
        </Heading>
        <IconButton
          aria-label="閉じる"
          onClick={onClose}
          variant="ghost"
          size="sm"
          color="whiteAlpha.800"
          _hover={{ bg: 'whiteAlpha.100' }}
        >
          <X size={16} />
        </IconButton>
      </Flex>

      {/* 政党フィルター */}
      <Box mb={4}>
        <Flex align="center" justify="space-between" mb={2}>
          <Text fontSize="sm" color="whiteAlpha.600">
            政党
          </Text>
          <Flex gap={2}>
            <Button
              variant="plain"
              size="xs"
              color="purple.400"
              onClick={selectAllParties}
              _hover={{ textDecoration: 'underline' }}
            >
              全選択
            </Button>
            <Button
              variant="plain"
              size="xs"
              color="whiteAlpha.400"
              onClick={deselectAllParties}
              _hover={{ textDecoration: 'underline' }}
            >
              解除
            </Button>
          </Flex>
        </Flex>

        <VStack gap={1.5} maxH="64" overflowY="auto" align="stretch">
          {parties.map((party) => {
            const isSelected =
              filter.selectedPartyIds.length === 0 || filter.selectedPartyIds.includes(party.id)
            return (
              <Flex
                key={party.id}
                as="button"
                onClick={() => toggleParty(party.id)}
                align="center"
                gap={3}
                p={2}
                borderRadius="lg"
                bg={isSelected ? 'whiteAlpha.100' : 'whiteAlpha.50'}
                opacity={isSelected ? 1 : 0.5}
                _hover={{ bg: 'whiteAlpha.150' }}
                transition="all 0.2s"
                w="full"
              >
                <Box w={4} h={4} borderRadius="full" flexShrink={0} bg={party.color} />
                <Text fontSize="sm" color="white" flex={1} textAlign="left">
                  {party.name}
                </Text>
                {isSelected && <Check size={16} color="#a78bfa" />}
              </Flex>
            )
          })}
        </VStack>
      </Box>

      {/* 表示オプション */}
      <Box borderTop="1px solid" borderColor="whiteAlpha.100" pt={4}>
        <Checkbox.Root
          checked={filter.showWithLocationOnly}
          onCheckedChange={(e) => setFilter({ showWithLocationOnly: !!e.checked })}
          colorPalette="purple"
          display="flex"
          alignItems="center"
          gap={2}
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control
            bg="whiteAlpha.100"
            borderColor="whiteAlpha.200"
            _checked={{ bg: 'purple.500', borderColor: 'purple.500' }}
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
            <Text fontSize="sm" color="whiteAlpha.800">
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
        color="whiteAlpha.600"
        _hover={{ color: 'whiteAlpha.800' }}
      >
        フィルターをリセット
      </Button>
    </Box>
  )
}
