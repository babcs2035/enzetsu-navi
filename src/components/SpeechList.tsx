'use client'

import { Box, Flex, Heading, Link, Spinner, Text, VStack } from '@chakra-ui/react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { AlertCircle, Clock, ExternalLink, MapPin } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useStore } from '@/store/useStore'

export function SpeechList() {
  const { speeches, activeSpeechId, setActiveSpeechId, isLoading, error } = useStore()
  const listRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  // アクティブな演説にスクロール
  useEffect(() => {
    if (activeSpeechId) {
      const cardEl = cardRefs.current.get(activeSpeechId)
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [activeSpeechId])

  // ローディング表示
  if (isLoading && speeches.length === 0) {
    return (
      <Flex align="center" justify="center" h="full">
        <VStack gap={3}>
          <Spinner size="lg" color="purple.500" borderWidth="3px" />
          <Text color="whiteAlpha.600" fontSize="sm">
            データを読み込み中...
          </Text>
        </VStack>
      </Flex>
    )
  }

  // エラー表示
  if (error) {
    return (
      <Flex align="center" justify="center" h="full" p={4}>
        <VStack gap={3}>
          <AlertCircle size={40} color="#F56565" />
          <Text color="whiteAlpha.800">エラーが発生しました</Text>
          <Text color="whiteAlpha.500" fontSize="sm">
            {error}
          </Text>
        </VStack>
      </Flex>
    )
  }

  // データなし
  if (speeches.length === 0) {
    return (
      <Flex align="center" justify="center" h="full" p={4}>
        <VStack gap={3}>
          <MapPin size={40} color="rgba(255,255,255,0.3)" />
          <Text color="whiteAlpha.600">この時間帯の演説データはありません</Text>
          <Text color="whiteAlpha.400" fontSize="sm">
            時間を変更してみてください
          </Text>
        </VStack>
      </Flex>
    )
  }

  return (
    <Box ref={listRef} h="full" overflowY="auto" p={4}>
      {/* 件数表示 */}
      <Flex align="center" justify="space-between" mb={3}>
        <Text fontSize="sm" color="whiteAlpha.500">
          {speeches.length}件の演説
        </Text>
        {isLoading && <Spinner size="sm" color="purple.500" />}
      </Flex>

      {/* 演説カードリスト */}
      <VStack gap={3} align="stretch">
        {speeches.map((speech) => {
          const isActive = speech.id === activeSpeechId
          const startTime = new Date(speech.start_at)

          return (
            <Box
              key={speech.id}
              ref={(el: HTMLDivElement | null) => {
                if (el) cardRefs.current.set(speech.id, el)
              }}
              onClick={() => setActiveSpeechId(speech.id)}
              p={4}
              borderRadius="xl"
              cursor="pointer"
              bg={isActive ? 'whiteAlpha.150' : 'whiteAlpha.50'}
              borderWidth={isActive ? '2px' : '1px'}
              borderColor={isActive ? 'purple.500' : 'transparent'}
              boxShadow={isActive ? 'lg' : 'none'}
              _hover={{ bg: 'whiteAlpha.100' }}
              transition="all 0.3s"
            >
              {/* 政党バッジ */}
              <Flex align="center" gap={2} mb={2}>
                <Box w={2.5} h={2.5} borderRadius="full" bg={speech.party_color} />
                <Text fontSize="xs" color="whiteAlpha.500">
                  {speech.party_name}
                </Text>
              </Flex>

              {/* 候補者名 */}
              <Heading size="sm" color="white" mb={2}>
                {speech.candidate_name}
              </Heading>

              {/* 場所 */}
              <Flex align="flex-start" gap={2} mb={2}>
                <MapPin
                  size={16}
                  color="rgba(255,255,255,0.4)"
                  style={{ marginTop: 2, flexShrink: 0 }}
                />
                <Box>
                  <Text fontSize="sm" color="whiteAlpha.800">
                    {speech.location_name}
                  </Text>
                  {speech.address && (
                    <Text fontSize="xs" color="whiteAlpha.400" mt={0.5}>
                      {speech.address}
                    </Text>
                  )}
                  {!speech.lat && (
                    <Flex align="center" gap={1} mt={0.5}>
                      <AlertCircle size={12} color="#ECC94B" />
                      <Text fontSize="xs" color="yellow.400">
                        座標不明
                      </Text>
                    </Flex>
                  )}
                </Box>
              </Flex>

              {/* 時刻 */}
              <Flex align="center" gap={2} fontSize="xs" color="whiteAlpha.400">
                <Clock size={14} />
                <Text>{format(startTime, 'M月d日（E） HH:mm', { locale: ja })}</Text>
              </Flex>

              {/* ソースリンク */}
              {speech.source_url && (
                <Link
                  href={speech.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  display="inline-flex"
                  alignItems="center"
                  gap={1}
                  mt={2}
                  fontSize="xs"
                  color="purple.400"
                  _hover={{ color: 'purple.300' }}
                >
                  <ExternalLink size={12} />
                  出典を見る
                </Link>
              )}
            </Box>
          )
        })}
      </VStack>
    </Box>
  )
}
