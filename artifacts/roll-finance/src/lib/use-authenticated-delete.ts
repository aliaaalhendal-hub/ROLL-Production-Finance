import { useAuth } from "@clerk/react";
import { useMutation } from "@tanstack/react-query";

export function useAuthenticatedDelete() {
  const { getToken } = useAuth();
  
  return useMutation({
    mutationFn: async (url: string) => {
      const token = await getToken();
      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "Content-Type": "application/json"
        }
      });
      if (!res.ok) {
        throw new Error("Failed to delete");
      }
      return res.json().catch(() => ({}));
    }
  });
}