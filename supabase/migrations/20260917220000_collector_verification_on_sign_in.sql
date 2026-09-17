-- Existing confirmed accounts do not change email_confirmed_at on sign-in.
-- Run the same verification sync after a successful sign-in as well.
DROP TRIGGER on_auth_user_verified ON auth.users;
CREATE TRIGGER on_auth_user_verified
  AFTER INSERT OR UPDATE OF email_confirmed_at, last_sign_in_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_collector_verification();

-- Repair only records whose confirmed account signed in after registration.
-- No account is confirmed here, and no session or permission is created.
UPDATE public.collectors AS c
SET auth_user_id = u.id,
    email_verified = true,
    verified_at = COALESCE(c.verified_at, u.last_sign_in_at)
FROM auth.users AS u
WHERE c.email = lower(u.email)
  AND NOT c.email_verified
  AND c.auth_user_id IS NULL
  AND u.email_confirmed_at IS NOT NULL
  AND u.last_sign_in_at >= c.created_at;

