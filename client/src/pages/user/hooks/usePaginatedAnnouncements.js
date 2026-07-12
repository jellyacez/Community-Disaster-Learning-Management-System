import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../lib/apiClient';

export function usePaginatedAnnouncements(initialLimit = 5) {
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['announcements', currentPage, initialLimit],
    queryFn: async () => {
      const response = await apiClient.get(`/users/announcements?page=${currentPage}&limit=${initialLimit}`);
      return response.data;
    },
    keepPreviousData: true, // Keeps old data on screen while fetching the new page
  });

  const announcements = data?.announcements || [];
  const pagination = data?.pagination || { totalPages: 1 };

  const nextPage = () => {
    if (currentPage < pagination.totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  return {
    announcements,
    isLoading,
    isError,
    currentPage,
    totalPages: pagination.totalPages,
    nextPage,
    prevPage,
  };
}
