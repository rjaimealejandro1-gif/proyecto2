-- =============================================
-- 014: STORAGE BUCKETS AND POLICY FIXES
-- =============================================

-- 1. Ensure 'entregas' and 'materiales' buckets exist
INSERT INTO storage.buckets (id, name, public, created_at, updated_at)
VALUES 
('entregas', 'entregas', true, NOW(), NOW()),
('materiales', 'materiales', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Clean up existing faulty policies
DROP POLICY IF EXISTS "entregas_insert_owner_or_admin" ON storage.objects;
DROP POLICY IF EXISTS "entregas_update_owner_or_admin" ON storage.objects;
DROP POLICY IF EXISTS "entregas_delete_owner_or_admin" ON storage.objects;
DROP POLICY IF EXISTS "entregas_read_authenticated" ON storage.objects;

-- 3. Entregas (Tasks/File Uploads) Policies
CREATE POLICY "entregas_select_policy"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'entregas');

CREATE POLICY "entregas_insert_policy"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'entregas');

CREATE POLICY "entregas_update_policy"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'entregas' AND owner = auth.uid())
WITH CHECK (bucket_id = 'entregas' AND owner = auth.uid());

CREATE POLICY "entregas_delete_policy"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'entregas' AND (owner = auth.uid() OR public.current_user_role() = 'administrador'));

-- 4. Materiales (Courses) Policies
CREATE POLICY "materiales_select_policy"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'materiales');

CREATE POLICY "materiales_insert_policy"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'materiales' AND public.current_user_role() IN ('docente', 'administrador'));

CREATE POLICY "materiales_update_policy"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'materiales' AND (owner = auth.uid() OR public.current_user_role() = 'administrador'))
WITH CHECK (bucket_id = 'materiales' AND (owner = auth.uid() OR public.current_user_role() = 'administrador'));

CREATE POLICY "materiales_delete_policy"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'materiales' AND (owner = auth.uid() OR public.current_user_role() = 'administrador'));

-- 5. Enable Buckets Reading
-- This is critical so the storage API can successfully read bucket properties (like file size limits) before inserting
DROP POLICY IF EXISTS "Storage Buckets Public Select" ON storage.buckets;
CREATE POLICY "Storage Buckets Public Select"
ON storage.buckets FOR SELECT TO authenticated
USING (true);
