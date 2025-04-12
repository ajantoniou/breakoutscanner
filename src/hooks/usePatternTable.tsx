
import { useState } from "react";
import { PatternData } from "@/services/types/patternTypes";

interface UsePatternTableProps {
  patterns: PatternData[];
  rowsPerPage?: number;
}

export const usePatternTable = ({ 
  patterns, 
  rowsPerPage = 10 
}: UsePatternTableProps) => {
  const [sortField, setSortField] = useState<keyof PatternData>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (field: keyof PatternData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedPatterns = [...patterns].sort((a, b) => {
    if (sortField === "createdAt") {
      const aDate = typeof a.createdAt === 'string' ? new Date(a.createdAt) : a.createdAt;
      const bDate = typeof b.createdAt === 'string' ? new Date(b.createdAt) : b.createdAt;
      
      const aTime = aDate instanceof Date ? aDate.getTime() : new Date(aDate).getTime();
      const bTime = bDate instanceof Date ? bDate.getTime() : new Date(bDate).getTime();
      
      return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
    }

    // For numeric fields like confidenceScore, entryPrice, etc.
    if (
      sortField === "confidenceScore" || 
      sortField === "entryPrice" || 
      sortField === "targetPrice" ||
      sortField === "supportLevel" ||
      sortField === "resistanceLevel"
    ) {
      const aValue = a[sortField] as number || 0;
      const bValue = b[sortField] as number || 0;
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }

    // For string fields like symbol, patternType, etc.
    if (typeof a[sortField] === "string" && typeof b[sortField] === "string") {
      const aValue = a[sortField] as string;
      const bValue = b[sortField] as string;
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    // For boolean fields
    if (typeof a[sortField] === "boolean" && typeof b[sortField] === "boolean") {
      const aValue = a[sortField] as boolean;
      const bValue = b[sortField] as boolean;
      return sortDirection === "asc"
        ? (aValue === bValue ? 0 : aValue ? 1 : -1)
        : (aValue === bValue ? 0 : aValue ? -1 : 1);
    }

    // Default comparison if types don't match or are not comparable
    return 0;
  });

  // Calculate pagination
  const totalPages = Math.ceil(sortedPatterns.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedPatterns = sortedPatterns.slice(startIndex, startIndex + rowsPerPage);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return {
    sortField,
    sortDirection,
    currentPage,
    totalPages,
    paginatedPatterns,
    handleSort,
    handlePageChange,
  };
};
