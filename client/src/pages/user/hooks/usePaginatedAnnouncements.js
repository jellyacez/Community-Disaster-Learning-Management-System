import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../lib/apiClient';
import { useOfflineSession } from '../../../hooks/offlineSession';
import { readContent, writeContent, mergeAnnouncements } from '../../../lib/offlineContent';

export function usePaginatedAnnouncements(initialLimit = 5) {
  const [currentPage, setCurrentPage] = useState(1);
  const {data: session} = useOfflineSession();
  const userId = session?.user?.id;
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['announcements', userId, currentPage, initialLimit],
    enabled: Boolean(userId), networkMode: 'offlineFirst', retry: false,
    queryFn: async () => {
      const cached = readContent(userId, 'announcements');
      const offlinePage = () => {
        if (!cached) {
          const error = new Error('No announcements saved yet. Open this page online first.');
          error.code = 'ERR_NETWORK'; throw error;
        }
        const items = cached.value;
        const totalPages = Math.max(1, Math.ceil(items.length / initialLimit));
        const page = Math.min(currentPage, totalPages);
        return {announcements: items.slice((page-1)*initialLimit, page*initialLimit), pagination:{totalPages,total:items.length}, page, fromCache:true, savedAt:cached.savedAt, persisted:true};
      };
      if (!navigator.onLine) return offlinePage();
      try {
        const response = await apiClient.get(`/users/announcements?page=${currentPage}&limit=${initialLimit}`, {timeout:8000});
        const payload = response.data;
        if (!Array.isArray(payload?.announcements)) throw new Error('Unexpected announcement response.');
        const stored = writeContent(userId, 'announcements', mergeAnnouncements(cached?.value, payload.announcements));
        return {...payload, page:currentPage, fromCache:false, savedAt:stored.savedAt, persisted:stored.persisted};
      } catch(error) {
        if (!error.response && cached) return offlinePage();
        throw error;
      }
    },
  });
  const pagination = data?.pagination || {totalPages:1};
  const displayedPage = data?.page || currentPage;
  return {
    announcements:data?.announcements || [], isLoading, isError, error,
    currentPage:displayedPage, setCurrentPage,
    totalPages:pagination.totalPages,
    totalAnnouncements:pagination.total ?? pagination.totalAnnouncements,
    nextPage:()=>setCurrentPage(Math.min(displayedPage+1,pagination.totalPages)),
    prevPage:()=>setCurrentPage(Math.max(1,displayedPage-1)),
    isCached: data?.fromCache, savedAt:data?.savedAt, storageWarning:data?.persisted === false,
  };
}
