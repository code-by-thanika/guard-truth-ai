/** Local username + password registration (no email, no external providers). */
import { createServerFn } from "@tanstack/react-start";
import { RegisterInput, usernameToLoginEmail } from "@/lib/auth-shared";

export const registerAccount = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RegisterInput.parse(input))
  .handler(async ({ data }) => {
    const username = data.username.toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .maybeSingle();
    if (lookupError) throw new Error(lookupError.message);
    if (existing) throw new Error("That username is already taken.");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: usernameToLoginEmail(username),
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, username },
    });
    if (error || !created?.user) {
      throw new Error(
        error?.message?.toLowerCase().includes("already")
          ? "That username is already taken."
          : (error?.message ?? "Could not create the account."),
      );
    }

    const { error: profileError } = await supabaseAdmin.rpc("ensure_profile_for_user", {
      _user_id: created.user.id,
      _email: null,
      _full_name: data.fullName,
      _avatar_url: null,
      _username: username,
    });
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error(
        profileError.message.includes("profiles_username_lower_key")
          ? "That username is already taken."
          : profileError.message,
      );
    }

    return { ok: true as const, username };
  });
