-- Allow admins to view all user profiles
CREATE POLICY "Admins can view all profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Allow admins to update user profiles
CREATE POLICY "Admins can update profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);