import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/hooks/useAuth";
import { supabase } from "../../../shared/services/supabaseClient";
import type { AllocationTargets } from "../utils/allocationTargets";

export function useAllocationTargets(walletId: string, enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["wallets", "allocation-targets", user?.id, walletId],
    enabled: enabled && Boolean(user?.id && walletId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallets")
        .select("allocation_targets")
        .eq("id", walletId)
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return (data.allocation_targets ?? {}) as AllocationTargets;
    },
  });
}
