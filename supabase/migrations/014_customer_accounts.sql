-- Customer account ownership for paid print orders and certificates.
-- Checkout remains guest friendly: the service role links an order after
-- Stripe confirms payment, and authenticated users can only read their own
-- settled orders and registrations.

ALTER TABLE public.print_orders
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS print_orders_auth_user_idx
  ON public.print_orders (auth_user_id, created_at DESC)
  WHERE auth_user_id IS NOT NULL;

-- Link once, safely retryable from a webhook. The account email must match the
-- checkout email, and only paid orders can become account-owned.
CREATE OR REPLACE FUNCTION public.link_paid_order_to_user(
  p_order_id uuid,
  p_auth_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.print_orders;
  v_user_email text;
  v_order_email text;
BEGIN
  IF p_order_id IS NULL OR p_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Order and user are required' USING ERRCODE = '22023';
  END IF;

  SELECT lower(btrim(email)) INTO v_user_email
    FROM auth.users WHERE id = p_auth_user_id;
  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_order
    FROM public.print_orders
   WHERE id = p_order_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = '22023';
  END IF;

  IF v_order.status <> 'paid' THEN
    RAISE EXCEPTION 'Only paid orders can be linked' USING ERRCODE = '42501';
  END IF;

  IF v_order.auth_user_id IS NOT NULL THEN
    IF v_order.auth_user_id = p_auth_user_id THEN
      RETURN jsonb_build_object('linked', true, 'already_linked', true,
                                'order_id', v_order.id, 'user_id', p_auth_user_id);
    END IF;
    RAISE EXCEPTION 'Order is already linked to another account' USING ERRCODE = '42501';
  END IF;

  v_order_email := lower(btrim(v_order.email));
  IF v_order_email IS DISTINCT FROM v_user_email THEN
    RAISE EXCEPTION 'Account email does not match order email' USING ERRCODE = '42501';
  END IF;

  UPDATE public.print_orders
     SET auth_user_id = p_auth_user_id
   WHERE id = p_order_id;

  RETURN jsonb_build_object('linked', true, 'already_linked', false,
                            'order_id', p_order_id, 'user_id', p_auth_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.link_paid_order_to_user(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_paid_order_to_user(uuid, uuid) TO service_role;

CREATE POLICY "Customers can read their paid orders"
  ON public.print_orders FOR SELECT TO authenticated
  USING (status = 'paid' AND auth_user_id = (SELECT auth.uid()));

-- Keep the existing admin policy and tighten the collector read path so an
-- unverified session cannot inspect a registration by merely being linked.
DROP POLICY IF EXISTS "Collectors can read their own purchase messages" ON public.purchase_messages;
CREATE POLICY "Collectors can read their own purchase messages"
  ON public.purchase_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.collectors c
     WHERE c.id = purchase_messages.collector_id
       AND c.auth_user_id = (SELECT auth.uid())
       AND c.email_verified
  ));

CREATE POLICY "Collectors can read their own certificates"
  ON public.print_certificates FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
      FROM public.purchase_messages pm
      JOIN public.collectors c ON c.id = pm.collector_id
     WHERE pm.id = print_certificates.registration_id
       AND c.auth_user_id = (SELECT auth.uid())
       AND c.email_verified
  ));

GRANT SELECT ON public.registration_receipts TO authenticated;
CREATE POLICY "Collectors can read their own registration receipts"
  ON public.registration_receipts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
      FROM public.purchase_messages pm
      JOIN public.collectors c ON c.id = pm.collector_id
     WHERE pm.id = registration_receipts.registration_id
       AND c.auth_user_id = (SELECT auth.uid())
       AND c.email_verified
  ));
