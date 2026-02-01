"use client";

import { Box, HStack, Icon, Input, Text, VStack } from "@chakra-ui/react";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/store/useStore";

interface Suggestion {
  type: "candidate" | "speaker";
  name: string;
}

export function SearchBox() {
  const { rawSpeeches, filter, setFilter } = useStore();
  const [inputValue, setInputValue] = useState(filter.searchQuery);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 外部ストアのフィルタが変更されたら入力欄も同期する
  useEffect(() => {
    setInputValue(filter.searchQuery);
  }, [filter.searchQuery]);

  // サジェストリストの生成
  const suggestions = useMemo(() => {
    const candidates = new Set<string>();
    const speakers = new Set<string>();

    rawSpeeches.forEach(speech => {
      if (speech.candidate_name) candidates.add(speech.candidate_name);
      if (speech.speakers) {
        speech.speakers.forEach(speaker => {
          speakers.add(speaker);
        });
      }
    });

    const list: Suggestion[] = [];
    candidates.forEach(name => {
      list.push({ type: "candidate", name });
    });
    speakers.forEach(name => {
      list.push({ type: "speaker", name });
    });

    // 重複除去
    const uniqueList = Array.from(
      new Map(list.map(item => [item.name, item])).values(),
    );
    return uniqueList.sort((a, b) => a.name.localeCompare(b.name, "ja"));
  }, [rawSpeeches]);

  // 入力に基づくフィルタリング
  const filteredSuggestions = useMemo(() => {
    if (!inputValue) return [];
    const lowerInput = inputValue.toLowerCase();
    if (suggestions.some(s => s.name.toLowerCase() === lowerInput)) return [];

    return suggestions
      .filter(s => s.name.toLowerCase().includes(lowerInput))
      .slice(0, 10);
  }, [inputValue, suggestions]);

  // Outside Click Handler
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

  const handleSelect = (name: string) => {
    setInputValue(name);
    setFilter({ searchQuery: name });
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setInputValue("");
    setFilter({ searchQuery: "" });
    inputRef.current?.focus();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setIsOpen(true);
    if (val === "") {
      setFilter({ searchQuery: "" });
    }
  };

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
                py={2}
                cursor="pointer"
                _hover={{ bg: "gray.50" }}
                onClick={() => handleSelect(suggestion.name)}
                borderBottom={
                  index < filteredSuggestions.length - 1 ? "1px solid" : "none"
                }
                borderColor="gray.100"
              >
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.800" fontWeight="medium">
                    {suggestion.name}
                  </Text>
                  <Text fontSize="xs" color="gray.400">
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
