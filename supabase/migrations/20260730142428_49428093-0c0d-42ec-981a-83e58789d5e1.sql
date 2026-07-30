ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_key ON public.profiles (lower(username));

CREATE OR REPLACE FUNCTION public.ensure_profile_for_user(_user_id uuid, _email text, _full_name text DEFAULT NULL::text, _avatar_url text DEFAULT NULL::text, _username text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, username)
  VALUES (
    _user_id,
    _email,
    COALESCE(NULLIF(trim(_full_name), ''), _username, split_part(COALESCE(_email, 'user'), '@', 1)),
    _avatar_url,
    _username
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    username = COALESCE(EXCLUDED.username, public.profiles.username);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.ensure_profile_for_user(
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url',
    NEW.raw_user_meta_data ->> 'username'
  );
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.ensure_profile_for_user(uuid, text, text, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;