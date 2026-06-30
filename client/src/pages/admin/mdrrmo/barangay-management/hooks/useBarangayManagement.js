import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../../../lib/apiClient";

const fetchResidents = async () => {
  const res = await apiClient.get("/admin/residents");
  return res.data;
};

export const useBarangayManagement = () => {
  const [selectedBarangay, setSelectedBarangay] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResident, setSelectedResident] = useState(null);

  const { data: residents = [], isLoading, isError } = useQuery({
    queryKey: ["adminResidents"],
    queryFn: fetchResidents,
    retry: 1
  });

  const filteredResidents = useMemo(() => {
    return residents.filter(r => {
      const matchesBarangay = selectedBarangay === "All" || r.barangay === selectedBarangay;
      const matchesSearch = r.name?.toLowerCase().includes(searchQuery.toLowerCase()) || r.status?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesBarangay && matchesSearch;
    });
  }, [residents, selectedBarangay, searchQuery]);

  const stats = useMemo(() => {
    const total = filteredResidents.length;
    const ready = filteredResidents.filter(r => r.status === "Ready").length;
    const avgScore = total > 0 
      ? Math.round(filteredResidents.reduce((acc, r) => acc + (r.quizScore || 0), 0) / total) 
      : 0;
    const coverage = total > 0 
      ? Math.round((filteredResidents.filter(r => (r.modulesCompleted || 0) > 0).length / total) * 100) 
      : 0;
      
    return {
      totalResidentsCount: total,
      readyCount: ready,
      averageScore: avgScore,
      coverageRate: coverage
    };
  }, [filteredResidents]);

  const handleAccountAction = async (userId, action) => {
    // In a real application, you'd trigger a mutation here via react-query's useMutation
    alert(`Account ID reference node ${userId} successfully updated: ${action.toUpperCase()}`);
  };

  return {
    state: {
      selectedBarangay,
      searchQuery,
      selectedResident,
      residents: filteredResidents,
      isLoading,
      isError,
      stats
    },
    actions: {
      setSelectedBarangay,
      setSearchQuery,
      setSelectedResident,
      handleAccountAction
    }
  };
};
