import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/utils/auth';
import { isAdmin as checkIsAdmin } from '@/utils/roles';
import UsuariosClient from './UsuariosClient';

type UserRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  created_at: string;
  team_order?: number | null;
  team_section?: string | null;
};

export default async function UsuariosPage() {
  const auth = await getAuthUser();
  if (!auth) redirect('/admin/login');

  const isAdmin = checkIsAdmin(auth.role);
  const supabase = await createClient();

  const { data: profilesWithOrder, error: withOrderError } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role, created_at, team_order, team_section')
    .order('team_section', { ascending: true, nullsFirst: false })
    .order('team_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .returns<UserRow[]>();

  let profiles: UserRow[] | null = profilesWithOrder;
  if (withOrderError) {
    const { data: fallbackProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role, created_at')
      .order('created_at', { ascending: false })
      .returns<Omit<UserRow, 'team_order'>[]>();
    profiles = (fallbackProfiles || []).map((row) => ({
      ...row,
      team_order: null,
      team_section: null,
    }));
  }

  return (
    <UsuariosClient
      profiles={profiles || []}
      currentUserId={auth.user.id}
      isAdmin={isAdmin}
    />
  );
}
