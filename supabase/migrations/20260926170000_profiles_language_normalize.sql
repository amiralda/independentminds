-- Language preference: one canonical, lowercase ISO 639-1 code per profile.
-- The UI language used to live only in localStorage ('im_lang'); the app now
-- saves it to profiles.language_pref on every change and restores it at login.
-- profiles has two columns for the same fact (language_pref, read by the app,
-- and preferred_language, written by handle_new_user at signup); this trigger
-- normalizes both and keeps them equal, so every writer stays correct without
-- touching handle_new_user. Additive + reversible.

CREATE OR REPLACE FUNCTION public.normalize_language_code(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  -- 'EN' -> 'en', ' pt-BR ' -> 'pt', 'zh_CN' -> 'zh'; unknown/empty -> NULL
  SELECT CASE
    WHEN c IN ('en','ht','fr','es','pt','ar','zh','de','ja','ru') THEN c
  END
  FROM (SELECT lower(split_part(replace(btrim(coalesce(p, '')), '_', '-'), '-', 1)) AS c) s;
$$;

CREATE OR REPLACE FUNCTION public.profiles_sync_language()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_pref text := public.normalize_language_code(NEW.language_pref);
  v_preferred text := public.normalize_language_code(NEW.preferred_language);
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Signup writes only preferred_language (language_pref gets its 'en'
    -- default): the signup language wins over that default.
    IF v_preferred IS NOT NULL AND (v_pref IS NULL OR v_pref = 'en') THEN
      v_pref := v_preferred;
    END IF;
  ELSIF NEW.language_pref IS DISTINCT FROM OLD.language_pref THEN
    NULL; -- language_pref changed: it wins
  ELSIF NEW.preferred_language IS DISTINCT FROM OLD.preferred_language THEN
    v_pref := coalesce(v_preferred, v_pref);
  END IF;

  NEW.language_pref := coalesce(v_pref, 'en');
  NEW.preferred_language := NEW.language_pref;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.profiles_sync_language() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_sync_language ON public.profiles;
CREATE TRIGGER profiles_sync_language
  BEFORE INSERT OR UPDATE OF language_pref, preferred_language ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_sync_language();

-- Existing rows: all 6 are en/EN (no other signal of their real language),
-- so this lowercases them to 'en'; any invalid value would also become 'en'.
UPDATE public.profiles
   SET language_pref = coalesce(public.normalize_language_code(language_pref), 'en')
 WHERE language_pref IS DISTINCT FROM coalesce(public.normalize_language_code(language_pref), 'en')
    OR preferred_language IS DISTINCT FROM coalesce(public.normalize_language_code(language_pref), 'en');

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_language_pref_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_language_pref_check
  CHECK (language_pref IN ('en','ht','fr','es','pt','ar','zh','de','ja','ru'));

-- Rollback:
--   ALTER TABLE public.profiles DROP CONSTRAINT profiles_language_pref_check;
--   DROP TRIGGER profiles_sync_language ON public.profiles;
--   DROP FUNCTION public.profiles_sync_language(); DROP FUNCTION public.normalize_language_code(text);
--   (data: values were en/EN before; 'en' is equivalent for every reader.)
