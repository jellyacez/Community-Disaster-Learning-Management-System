import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../lib/apiClient';
import { useOfflineSession } from '../../../hooks/offlineSession';
import { readContent, writeContent, mergeAnnouncements } from '../../../lib/offlineContent';
import { getAdvisoryStatus } from '../../../lib/advisoryStatus';

// Urgent advisories currently in effect, for the top of the Announcements page.
// Saved into the same offline store as the list, so they still show without a connection.
export function useActiveAdvisories() {
  const { data: session } = useOfflineSession();
  const userId = session?.user?.id;
  const { data } = useQuery({
    queryKey: ['announcements', userId, 'active'],
    enabled: Boolean(userId), networkMode: 'offlineFirst', retry: false,
    queryFn: async () => {
      const cached = readContent(userId, 'announcements');
      const fromCache = () => (cached?.value || []).filter((item) => getAdvisoryStatus(item)?.state === 'in_effect');
      if (!navigator.onLine) return fromCache();
      try {
        const response = await apiClient.get('/users/announcements?status=active&limit=20', { timeout: 8000 });
        const items = response.data?.announcements;
        if (!Array.isArray(items)) throw new Error('Unexpected announcement response.');
        writeContent(userId, 'announcements', mergeAnnouncements(cached?.value, items));
        return items;
      } catch (error) {
        if (!error.response) return fromCache();
        throw error;
      }
    },
    refetchInterval: 60000,
  });
  return data || [];
}
