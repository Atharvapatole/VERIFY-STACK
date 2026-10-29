-- Verify Stack: Profile Auto-Provisioning & Foreign Key Integrity
-- Migration: 20261029000003_ensure_profiles_trigger.sql

-- 1. Backfill any existing auth.users that do not have a public.profiles entry
INSERT INTO public.profiles (id, full_name, email, role, status)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1), 'Developer'),
  COALESCE(u.email, u.id || '@verifystack.local'),
  COALESCE(u.raw_app_meta_data->>'role', 'user'),
  'active'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  updated_at = NOW();

-- 2. Create the trigger function to automatically create a profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'Developer'),
    COALESCE(NEW.email, NEW.id || '@verifystack.local'),
    COALESCE(NEW.raw_app_meta_data->>'role', 'user'),
    'active'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Ensure execute permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;
