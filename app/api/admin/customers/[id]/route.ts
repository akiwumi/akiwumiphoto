import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/admin-auth';
import { serviceClient } from '@/lib/stripe';

const EDITABLE_FIELDS = [
  'first_name', 'last_name', 'phone', 'address_line1', 'address_line2',
  'city', 'region', 'postcode', 'country_code',
] as const;

type EditableField = (typeof EDITABLE_FIELDS)[number];

async function requireAdmin() {
  const auth = await createServerClient();
  const { data: { user } } = await auth.auth.getUser();
  return isAdmin(user);
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireAdmin())) return errorResponse('Admin access required.', 403);
    const { id } = await params;
    const input = await request.json() as Record<string, unknown>;
    const fields = Object.fromEntries(
      EDITABLE_FIELDS
        .filter((field) => field in input)
        .map((field) => [field, String(input[field] ?? '').trim()]),
    ) as Partial<Record<EditableField, string>>;

    if (Object.keys(fields).length === 0) return errorResponse('No editable fields were supplied.');
    if (fields.country_code) fields.country_code = fields.country_code.toUpperCase();
    const db = serviceClient();
    const { data, error } = await db.from('collectors').update(fields).eq('id', id).select('*').single();
    if (error) return errorResponse(error.message);
    return NextResponse.json({ collector: data });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Could not update this user.', 500);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireAdmin())) return errorResponse('Admin access required.', 403);
    const { id } = await params;
    const db = serviceClient();
    const { data, error } = await db.from('collectors').delete().eq('id', id).select('id').maybeSingle();
    if (error) {
      const message = error.message.toLowerCase().includes('foreign key') || error.code === '23503'
        ? 'This user has protected certificate records and cannot be erased.'
        : error.message;
      return errorResponse(message, 409);
    }
    if (!data) return errorResponse('Registered user not found.', 404);
    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Could not erase this user.', 500);
  }
}
