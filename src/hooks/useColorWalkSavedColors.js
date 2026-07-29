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

function normalizeHex(raw) {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(String(raw || '').trim());
  return m ? `#${m[1].toUpperCase()}` : null;
}

function hexKey(raw) {
  const n = normalizeHex(raw);
  return n ? n.slice(1) : '';
}

/** Ensure a mapped row for hex exists at the end (max 5). */
function ensureHexRow(list, hex, id) {
  const norm = normalizeHex(hex);
  if (!norm) return list;
  const key = hexKey(norm);
  if (list.some((r) => hexKey(r.hex) === key)) return list;
  if (list.length >= COLOR_WALK_SAVED_MAX) return list;
  return sortRows([
    ...list,
    {
      id: id || `local-${norm}-${list.length}`,
      hex: norm,
      createdAt: new Date().toISOString(),
      sortOrder: list.length,
    },
  ]);
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
      setLoading(false);
      // Do not wipe existing rows on transient fetch failure
      return null;
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
      const norm = normalizeHex(hex);
      if (!norm) {
        return { ok: false, unauthorized: false, full: false, error: new Error('invalid_hex') };
      }

      setSaving(true);
      setError(null);
      const res = await saveColorWalkColor({ hex: norm });

      // Quiet refresh: update ordered slots without flipping into "加载中".
      const { rows: next, error: fetchErr } = await fetchColorWalkSavedColors();
      let latest = null;
      if (!fetchErr) {
        latest = applyRows(next);
      } else {
        setError(fetchErr);
      }

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
          full: (latest?.length ?? 0) >= COLOR_WALK_SAVED_MAX,
          error: res.error,
          rows: latest,
        };
      }

      // POST succeeded: guarantee the hex appears in local slots
      if (!latest) {
        setRows((prev) => {
          latest = ensureHexRow(prev, norm, res.id);
          return latest;
        });
      } else if (!res.existing) {
        const ensured = ensureHexRow(latest, norm, res.id);
        if (ensured !== latest) {
          latest = ensured;
          setRows(ensured);
        }
      }

      const isFull = (latest?.length ?? 0) >= COLOR_WALK_SAVED_MAX;
      setSaving(false);
      return {
        ok: true,
        unauthorized: false,
        full: isFull,
        existing: Boolean(res.existing),
        id: res.id,
        rows: latest,
        refreshError: fetchErr || null,
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
