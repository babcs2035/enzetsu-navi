"use client";

import { Box, HStack, Icon, Input, Text, VStack } from "@chakra-ui/react";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/store/useStore";

/**
 * 検索ボックスコンポーネント．
 * 候補者名や応援弁士名によるフィルタリング，および入力候補の提示（サジェスト）を行う．
 */
export function SearchBox() {
  const { searchSuggestions, filter, setFilter } = useStore();
  const [inputValue, setInputValue] = useState(filter.searchQuery);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // グローバルなフィルタ状態が変更された際，入力欄の表示を同期する
  useEffect(() => {
    setInputValue(filter.searchQuery);
  }, [filter.searchQuery]);

  /**
   * 現在の入力内容に基づきサジェストリストをフィルタリングする．
   */
  const filteredSuggestions = useMemo(() => {
    if (!inputValue) return [];
    const lowerInput = inputValue.toLowerCase();
    // 完全一致する項目が既に存在する場合はサジェストを表示しない
    if (searchSuggestions.some(s => s.name.toLowerCase() === lowerInput))
      return [];

    return searchSuggestions
      .filter(s => s.name.toLowerCase().includes(lowerInput))
      .slice(0, 10);
  }, [inputValue, searchSuggestions]);

  /**
   * コンポーネント外クリックを検知してサジェストを閉じるためのイベント登録．
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /**
   * サジェスト項目が選択された際の処理．
   */
  const handleSelect = (name: string) => {
    setInputValue(name);
    setFilter({ searchQuery: name });
    setIsOpen(false);
    inputRef.current?.blur();
  };

  /**
   * 検索条件をクリアする．
   */
  const handleClear = () => {
    setInputValue("");
    setFilter({ searchQuery: "" });
    inputRef.current?.focus();
  };

  /**
   * 入力内容の変更イベントハンドラ．
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setIsOpen(true);
    if (val === "") {
      setFilter({ searchQuery: "" });
    }
  };

  /**
   * Enter キー押下で検索を実行する．
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setFilter({ searchQuery: inputValue });
      setIsOpen(false);
    }
  };

  return (
    <Box position="relative" w="full" maxW="400px" ref={containerRef}>
      <Box position="relative">
        <Box
          position="absolute"
          left={3}
          top="50%"
          transform="translateY(-50%)"
          zIndex={2}
          pointerEvents="none"
        >
          <Icon as={Search} color="gray.400" />
        </Box>
        <Input
          ref={inputRef}
          pl={10}
          pr={inputValue ? 10 : 4}
          placeholder="候補者・弁士を検索..."
          value={inputValue}
          onChange={handleChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          bg="gray.50"
          border="none"
          color="gray.800"
          borderRadius="lg"
          _focus={{
            bg: "white",
            boxShadow: "0 0 0 2px var(--chakra-colors-blue-400)",
          }}
          _placeholder={{ color: "gray.500" }}
          aria-label="検索ボックス"
        />
        {inputValue && (
          <Box
            position="absolute"
            right={3}
            top="50%"
            transform="translateY(-50%)"
            zIndex={2}
            cursor="pointer"
            onClick={handleClear}
            color="gray.400"
            _hover={{ color: "gray.600" }}
          >
            <Icon as={X} />
          </Box>
        )}
      </Box>

      {/* サジェストリストの表示エリア */}
      {isOpen && filteredSuggestions.length > 0 && (
        <Box
          position="absolute"
          top="100%"
          left={0}
          right={0}
          mt={2}
          bg="white"
          borderRadius="md"
          boxShadow="lg"
          zIndex={100}
          overflow="hidden"
          maxH="300px"
          overflowY="auto"
        >
          <VStack
            as="ul"
            align="stretch"
            gap={0}
            m={0}
            p={0}
            listStyleType="none"
          >
            {filteredSuggestions.map((suggestion, index) => (
              <Box
                as="li"
                key={`${suggestion.type}-${suggestion.name}`}
                px={4}
                py={3}
                cursor="pointer"
                _hover={{ bg: "gray.50" }}
                onClick={() => handleSelect(suggestion.name)}
                borderBottom={
                  index < filteredSuggestions.length - 1 ? "1px solid" : "none"
                }
                borderColor="gray.100"
              >
                <HStack justify="space-between">
                  <VStack align="start" gap={0}>
                    <Text fontSize="md" color="gray.800" fontWeight="medium">
                      {suggestion.name}
                    </Text>
                    {suggestion.party && (
                      <HStack gap={1.5} mt={0.5}>
                        <Box
                          w={2}
                          h={2}
                          borderRadius="full"
                          bg={suggestion.party.color}
                        />
                        <Text fontSize="xs" color="gray.500">
                          {suggestion.party.name}
                        </Text>
                      </HStack>
                    )}
                  </VStack>
                  <Text
                    fontSize="xs"
                    color="gray.400"
                    bg="gray.100"
                    px={2}
                    py={0.5}
                    borderRadius="full"
                  >
                    {suggestion.type === "candidate" ? "候補者" : "弁士"}
                  </Text>
                </HStack>
              </Box>
            ))}
          </VStack>
        </Box>
      )}
    </Box>
  );
}
