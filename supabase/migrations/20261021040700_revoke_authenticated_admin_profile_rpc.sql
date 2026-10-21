-- Prevent signed-in non-admin clients from invoking the SECURITY DEFINER admin profile RPC.
-- The admin dashboard uses the separately authenticated rasta-admin-users Edge Function.
REVOKE EXECUTE ON FUNCTION public.admin_user_profiles() FROM authenticated;
