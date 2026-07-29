import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  COLOR_WALK_SAVED_MAX,
  deleteColorWalkSavedColor,
  fetchColorWalkSavedColors,
  saveColorWalkColor,
} from '../lib/colorWalkApi';

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    hex: String(row.hex || '').toUpperCase(),
    createdAt: row.created_at || row.createdAt || null,
    sortOrder: typeof row.sort_order === 'number' ? row.sort_order : row.sortOrder,
  };
}

/**
 * Account-backed Color Walk saved colors (max 5).
 * @param {{ userId?: string | null, enabled?: boolean }} opts
 */
export default function useColorWalkSavedColors({ userId = null, enabled = true } = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!enabled || !userId) {
      setRows([]);
      setLoading(false);
      setError(null);
      return [];
    }
    setLoading(true);
    setError(null);
    const { rows: next, error: err } = await fetchColorWalkSavedColors();
    if (err) {
      setError(err);
      setRows([]);
      setLoading(false);
      return [];
    }
    const mapped = (next || []).map(mapRow).filter(Boolean);
    setRows(mapped);
    setLoading(false);
    return mapped;
  }, [enabled, userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const full = rows.length >= COLOR_WALK_SAVED_MAX;

  const slots = useMemo(() => {
    const list = [...rows];
    while (list.length < COLOR_WALK_SAVED_MAX) list.push(null);
    return list.slice(0, COLOR_WALK_SAVED_MAX);
  }, [rows]);

  const saveHex = useCallback(
    async (hex) => {
      if (!userId) return { ok: false, unauthorized: true, full: false };
      setSaving(true);
      setError(null);
      const res = await saveColorWalkColor({ hex });
      if (res.full) {
        await reload();
        setSaving(false);
        return { ok: false, unauthorized: false, full: true, error: res.error };
      }
      if (res.error) {
        setError(res.error);
        setSaving(false);
        return { ok: false, unauthorized: false, full: false, error: res.error };
      }
      await reload();
      setSaving(false);
      return { ok: true, unauthorized: false, full: false, existing: res.existing, id: res.id };
    },
    [userId, reload],
  );

  const removeById = useCallback(
    async (id) => {
      if (!userId || !id) return { ok: false };
      setDeletingId(id);
      setError(null);
      const { error: err } = await deleteColorWalkSavedColor(id);
      if (err) {
        setError(err);
        setDeletingId(null);
        return { ok: false, error: err };
      }
      await reload();
      setDeletingId(null);
      return { ok: true };
    },
    [userId, reload],
  );

  return {
    rows,
    slots,
    count: rows.length,
    max: COLOR_WALK_SAVED_MAX,
    full,
    loading,
    saving,
    deletingId,
    error,
    reload,
    saveHex,
    removeById,
  };
}
