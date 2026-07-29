import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  COLOR_WALK_SAVED_MAX,
  deleteColorWalkSavedColor,
  fetchColorWalkSavedColors,
  saveColorWalkColor,
} from '../lib/colorWalkApi';
import { ApiError } from '../lib/apiClient';

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

function cacheKey(userId) {
  return `genom:color-walk-saved:${userId}`;
}

function readCache(userId) {
  if (!userId || typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortRows(parsed.map(mapRow).filter(Boolean)).slice(0, COLOR_WALK_SAVED_MAX);
  } catch {
    return [];
  }
}

function writeCache(userId, rows) {
  if (!userId || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(rows.slice(0, COLOR_WALK_SAVED_MAX)));
  } catch {
    // ignore quota
  }
}

function ensureHexRow(list, hex, id) {
  const norm = normalizeHex(hex);
  if (!norm) return list;
  const key = hexKey(norm);
  if (list.some((r) => hexKey(r.hex) === key)) return list;
  if (list.length >= COLOR_WALK_SAVED_MAX) return list;
  return sortRows([
    ...list,
    {
      id: id || `local-${norm}-${Date.now()}`,
      hex: norm,
      createdAt: new Date().toISOString(),
      sortOrder: list.length,
    },
  ]);
}

/**
 * Account-backed Color Walk saved colors (max 5), with local cache for instant UI.
 * @param {{ userId?: string | null, enabled?: boolean }} opts
 */
export default function useColorWalkSavedColors({ userId = null, enabled = true } = {}) {
  const [rows, setRows] = useState(() => (enabled && userId ? readCache(userId) : []));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);

  const commitRows = useCallback((next, uid = userId) => {
    const mapped = sortRows((next || []).map((r) => (r?.hex ? r : mapRow(r))).filter(Boolean))
      .slice(0, COLOR_WALK_SAVED_MAX);
    setRows(mapped);
    if (uid) writeCache(uid, mapped);
    return mapped;
  }, [userId]);

  const applyServerRows = useCallback((next, uid = userId) => {
    const mapped = sortRows((next || []).map(mapRow).filter(Boolean)).slice(0, COLOR_WALK_SAVED_MAX);
    setRows(mapped);
    if (uid) writeCache(uid, mapped);
    return mapped;
  }, [userId]);

  const reload = useCallback(async () => {
    if (!enabled || !userId) {
      setRows([]);
      setLoading(false);
      setError(null);
      return [];
    }
    // Seed from cache immediately
    const cached = readCache(userId);
    if (cached.length) setRows(cached);

    setLoading(true);
    setError(null);
    const { rows: next, error: err } = await fetchColorWalkSavedColors();
    if (err) {
      setError(err);
      setLoading(false);
      return cached;
    }
    const mapped = applyServerRows(next, userId);
    setLoading(false);
    return mapped;
  }, [enabled, userId, applyServerRows]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const full = rows.length >= COLOR_WALK_SAVED_MAX;

  const slots = useMemo(() => {
    const list = [...rows];
    while (list.length < COLOR_WALK_SAVED_MAX) list.push(null);
    return list.slice(0, COLOR_WALK_SAVED_MAX);
  }, [rows]);

  const hasHex = useCallback((hex) => {
    const key = hexKey(hex);
    if (!key) return false;
    return rows.some((r) => hexKey(r.hex) === key);
  }, [rows]);

  /**
   * Save hex: update local slots immediately, then sync to API.
   * Returns { ok, full, unauthorized, existing, rows }.
   */
  const saveHex = useCallback(
    async (hex) => {
      if (!userId) return { ok: false, unauthorized: true, full: false, rows };
      const norm = normalizeHex(hex);
      if (!norm) {
        return { ok: false, unauthorized: false, full: false, error: new Error('invalid_hex'), rows };
      }

      if (hasHex(norm)) {
        return { ok: true, unauthorized: false, full, existing: true, rows };
      }

      if (rows.length >= COLOR_WALK_SAVED_MAX) {
        return { ok: false, unauthorized: false, full: true, rows };
      }

      setSaving(true);
      setError(null);

      // 1) Optimistic local write so UI can navigate immediately
      const optimistic = ensureHexRow(rows, norm, `local-${norm}-${Date.now()}`);
      commitRows(optimistic, userId);

      // 2) Sync to server
      const res = await saveColorWalkColor({ hex: norm });

      if (res.error instanceof ApiError && (res.error.status === 401 || res.error.code === 'unauthorized')) {
        // Keep optimistic local so user still sees it; flag unauthorized for login
        setSaving(false);
        return {
          ok: true,
          unauthorized: true,
          full: optimistic.length >= COLOR_WALK_SAVED_MAX,
          existing: false,
          rows: optimistic,
          error: res.error,
        };
      }

      if (res.full) {
        // Roll back optimistic add
        commitRows(rows, userId);
        setSaving(false);
        return { ok: false, unauthorized: false, full: true, error: res.error, rows };
      }

      if (res.error) {
        // Keep local optimistic row so the page still shows the color
        setError(res.error);
        setSaving(false);
        return {
          ok: true,
          unauthorized: false,
          full: optimistic.length >= COLOR_WALK_SAVED_MAX,
          existing: false,
          rows: optimistic,
          error: res.error,
          offline: true,
        };
      }

      // Refresh from server when possible; fall back to optimistic
      const { rows: next, error: fetchErr } = await fetchColorWalkSavedColors();
      let latest = optimistic;
      if (!fetchErr) {
        latest = applyServerRows(next, userId);
        // Ensure hex present even if replication lag
        if (!latest.some((r) => hexKey(r.hex) === hexKey(norm))) {
          latest = commitRows(ensureHexRow(latest, norm, res.id), userId);
        } else if (res.id) {
          // Prefer server id for the matching hex
          latest = commitRows(
            latest.map((r) => (hexKey(r.hex) === hexKey(norm) ? { ...r, id: res.id } : r)),
            userId,
          );
        }
      } else if (res.id) {
        latest = commitRows(
          optimistic.map((r) => (hexKey(r.hex) === hexKey(norm) ? { ...r, id: res.id } : r)),
          userId,
        );
      }

      setSaving(false);
      return {
        ok: true,
        unauthorized: false,
        full: latest.length >= COLOR_WALK_SAVED_MAX,
        existing: Boolean(res.existing),
        id: res.id,
        rows: latest,
      };
    },
    [userId, rows, full, hasHex, commitRows, applyServerRows],
  );

  const removeById = useCallback(
    async (id) => {
      if (!userId || !id) return { ok: false };
      setDeletingId(id);
      setError(null);

      const prev = rows;
      const nextLocal = prev.filter((r) => r.id !== id);
      commitRows(nextLocal, userId);

      const { error: err } = await deleteColorWalkSavedColor(id);
      if (err) {
        // Keep local delete if offline; only restore on hard auth failure
        if (err instanceof ApiError && err.status === 401) {
          commitRows(prev, userId);
          setError(err);
          setDeletingId(null);
          return { ok: false, error: err };
        }
        setError(err);
        setDeletingId(null);
        return { ok: true, offline: true };
      }

      const refreshed = await fetchColorWalkSavedColors();
      if (!refreshed.error) applyServerRows(refreshed.rows, userId);
      setDeletingId(null);
      return { ok: true };
    },
    [userId, rows, commitRows, applyServerRows],
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
    hasHex,
  };
}
