import { createServerClient } from '@/lib/supabase-server';

export type OutreachContactCategory = { id: string; name: string };

export async function getOutreachContactCategories(): Promise<OutreachContactCategory[]> {
  try {
    const client = await createServerClient();
    const { data, error } = await client
      .from('outreach_contact_categories')
      .select('id,name')
      .order('name', { ascending: true });
    if (error) throw error;
    return (data ?? []) as OutreachContactCategory[];
  } catch {
    return [];
  }
}
