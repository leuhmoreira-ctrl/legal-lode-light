
-- Drop the problematic restrictive policies
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Anyone can view roles" ON public.user_roles;

-- Recreate: anyone can view roles (PERMISSIVE)
CREATE POLICY "Anyone can view roles"
  ON public.user_roles
  FOR SELECT
  USING (true);

-- Admins can insert/update/delete roles (using security definer function to avoid recursion)
CREATE POLICY "Admins can manage roles"
  ON public.user_roles
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
