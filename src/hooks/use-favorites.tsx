import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function useFavoriteIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("listing_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set(data.map((d) => d.listing_id));
    },
  });
}

export function useFavorite(listingId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: ids } = useFavoriteIds();
  const isFav = ids?.has(listingId) ?? false;

  const m = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (isFav) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("listing_id", listingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ user_id: user.id, listing_id: listingId });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites", user?.id] }),
  });

  return { isFav, toggle: () => m.mutateAsync(), pending: m.isPending };
}
