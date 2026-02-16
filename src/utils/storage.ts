import { supabase } from "@/integrations/supabase/client";

export const BUCKET_EMAIL = "email-attachments";
export const BUCKET_CHAT = "chat-attachments";

export async function uploadFile(
  bucket: string,
  file: File,
  path?: string
): Promise<{ path: string; url: string }> {
  // Generate a unique path if not provided
  const filePath = path || `${Date.now()}_${file.name}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Error uploading file:", error);
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return { path: data.path, url: publicUrl };
}

export async function uploadEmailAttachment(file: File) {
  return uploadFile(BUCKET_EMAIL, file);
}

export async function uploadChatAttachment(file: File) {
  return uploadFile(BUCKET_CHAT, file);
}
