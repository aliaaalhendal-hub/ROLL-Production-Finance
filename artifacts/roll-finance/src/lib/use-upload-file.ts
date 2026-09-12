import { useAuth } from "@clerk/react";
import { useMutation } from "@tanstack/react-query";

export function useUploadFile() {
  const { getToken } = useAuth();
  
  return useMutation({
    mutationFn: async (file: File) => {
      const token = await getToken();
      const res = await fetch("/api/storage/upload-url", {
        method: "POST",
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "Content-Type": "application/json"
        }
      });
      if (!res.ok) throw new Error("Failed to get upload URL");
      
      const { uploadUrl, normalizedPath } = await res.json();
      
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type
        }
      });
      
      if (!uploadRes.ok) throw new Error("Failed to upload file");
      
      const finalizeRes = await fetch("/api/storage/finalize", {
        method: "POST",
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ normalizedPath })
      });
      
      if (!finalizeRes.ok) throw new Error("Failed to finalize upload");

      return normalizedPath;
    }
  });
}