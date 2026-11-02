-- No elevated privileges: the RPC obeys each table's existing owner RLS.
CREATE POLICY wallets_delete_owned_non_default
  ON public.wallets FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND NOT is_default);
GRANT DELETE ON public.wallets TO authenticated;
-- Positions are derived/legacy records: keep direct client DELETE revoked.
-- Deleting the owner wallet removes them via FK instead of broadening grants.
ALTER TABLE public.positions DROP CONSTRAINT positions_wallet_owner_fk;
ALTER TABLE public.positions ADD CONSTRAINT positions_wallet_owner_fk
  FOREIGN KEY (wallet_id,user_id) REFERENCES public.wallets(id,user_id) ON DELETE CASCADE;

CREATE FUNCTION public.delete_owned_wallet(p_wallet_id uuid, p_confirmation_name text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_owner uuid := auth.uid();
  v_wallet public.wallets;
BEGIN
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  -- Serialize deletion with FK-backed writes and concurrent rename/delete.
  SELECT * INTO v_wallet FROM public.wallets
  WHERE id = p_wallet_id AND user_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet unavailable' USING ERRCODE = 'P0002';
  END IF;
  IF v_wallet.is_default THEN
    RAISE EXCEPTION 'Default wallet cannot be deleted' USING ERRCODE = '22023';
  END IF;
  IF p_confirmation_name IS NULL OR btrim(p_confirmation_name) <> v_wallet.name THEN
    RAISE EXCEPTION 'Wallet confirmation does not match' USING ERRCODE = '22023';
  END IF;

  -- Delete the journal first: its normal recalculation triggers remain active.
  DELETE FROM public.transactions WHERE wallet_id = p_wallet_id AND user_id = v_owner;
  -- Existing FKs cascade fixed-income events and imported-income records.
  DELETE FROM public.fixed_income_positions WHERE wallet_id = p_wallet_id AND user_id = v_owner;
  DELETE FROM public.wallets WHERE id = p_wallet_id AND user_id = v_owner AND NOT is_default;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet deletion failed' USING ERRCODE = 'P0002';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_owned_wallet(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_owned_wallet(uuid,text) TO authenticated;
COMMENT ON FUNCTION public.delete_owned_wallet(uuid,text) IS
  'Delete a non-default wallet owned by auth.uid() and its records atomically, after exact name confirmation; uses owner RLS.';
