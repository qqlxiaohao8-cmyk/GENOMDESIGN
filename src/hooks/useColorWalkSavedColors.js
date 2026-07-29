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

function sortRows(rows) {
  return [...rows].sort((a, b) => {
    const ao = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
    const bo = typeof b.sortOrder === 'number' ? b.sortOrder : 0;
    if (ao !== bo) return ao - bo;
    return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
  });
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

  const applyRows = useCallback((next) => {
    const mapped = sortRows((next || []).map(mapRow).filter(Boolean));
    setRows(mapped);
    return mapped;
  }, []);

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
    const mapped = applyRows(next);
    setLoading(false);
    return mapped;
  }, [enabled, userId, applyRows]);

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

      // Quiet refresh: update ordered slots without flipping into "加载中"
      const { rows: next, error: fetchErr } = await fetchColorWalkSavedColors();
      let latest = [];
      if (!fetchErr) {
        latest = applyRows(next);
      }

      const isFull = latest.length >= COLOR_WALK_SAVED_MAX || Boolean(res.full);

      if (res.full) {
        setSaving(false);
        return {
          ok: false,
          unauthorized: false,
          full: true,
          error: res.error,
          rows: latest,
        };
      }
      if (res.error) {
        setError(res.error);
        setSaving(false);
        return {
          ok: false,
          unauthorized: false,
          full: isFull,
          error: res.error,
          rows: latest,
        };
      }

      setSaving(false);
      return {
        ok: true,
        unauthorized: false,
        full: isFull,
        existing: Boolean(res.existing),
        id: res.id,
        rows: latest,
      };
    },
    [userId, applyRows],
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
