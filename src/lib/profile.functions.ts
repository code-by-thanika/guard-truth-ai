/** Profile server functions: read and update the signed-in user's profile. */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const UpdateInput = z.object({
  fullName: z.string().trim().min(1, "Name cannot be empty.").max(80),
  language: z.enum(["en", "hi"]),
  theme: z.enum(["light", "dark"]),
});

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, language, theme, created_at")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ full_name: data.fullName, language: data.language, theme: data.theme })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
