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
  return `genom:color-walk-saved:${userId || 'guest'}`;
}

function readCache(userId) {
  if (typeof localStorage === 'undefined') return [];
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
  if (typeof localStorage === 'undefined') return;
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
 * Color Walk saved colors (max 5).
 * Local cache first for instant UI; syncs to API when userId is a real account.
 */
export default function useColorWalkSavedColors({ userId = 'guest', enabled = true } = {}) {
  const vaultId = userId || 'guest';
  const canSync = Boolean(userId) && userId !== 'guest';

  const [rows, setRows] = useState(() => (enabled ? readCache(vaultId) : []));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);

  const commitRows = useCallback((next, uid = vaultId) => {
    const mapped = sortRows(
      (next || [])
        .map((r) => {
          if (!r) return null;
          if (r.hex && r.id) return { ...r, hex: String(r.hex).toUpperCase() };
          return mapRow(r);
        })
        .filter(Boolean),
    ).slice(0, COLOR_WALK_SAVED_MAX);
    setRows(mapped);
    writeCache(uid, mapped);
    return mapped;
  }, [vaultId]);

  const applyServerRows = useCallback((next, uid = vaultId) => {
    const mapped = sortRows((next || []).map(mapRow).filter(Boolean)).slice(0, COLOR_WALK_SAVED_MAX);
    setRows(mapped);
    writeCache(uid, mapped);
    return mapped;
  }, [vaultId]);

  const reload = useCallback(async () => {
    if (!enabled) {
      setRows([]);
      setLoading(false);
      setError(null);
      return [];
    }

    const cached = readCache(vaultId);
    setRows(cached);

    if (!canSync) {
      setLoading(false);
      return cached;
    }

    setLoading(true);
    setError(null);
    const { rows: next, error: err } = await fetchColorWalkSavedColors();
    if (err) {
      setError(err);
      setLoading(false);
      return cached;
    }
    // Merge: prefer server order, keep any local-only hexes not yet synced
    const serverMapped = sortRows((next || []).map(mapRow).filter(Boolean));
    const serverKeys = new Set(serverMapped.map((r) => hexKey(r.hex)));
    const localOnly = cached.filter((r) => !serverKeys.has(hexKey(r.hex)));
    const merged = [...serverMapped, ...localOnly].slice(0, COLOR_WALK_SAVED_MAX);
    applyServerRows(merged, vaultId);
    setLoading(false);
    return merged;
  }, [enabled, vaultId, canSync, applyServerRows]);

  useEffect(() => {
    if (!enabled) return undefined;
    // Promote guest cache into account vault once on login
    if (canSync && vaultId !== 'guest') {
      const guest = readCache('guest');
      const mine = readCache(vaultId);
      if (guest.length) {
        const keys = new Set(mine.map((r) => hexKey(r.hex)));
        const merged = [...mine];
        for (const row of guest) {
          if (!keys.has(hexKey(row.hex)) && merged.length < COLOR_WALK_SAVED_MAX) {
            merged.push(row);
            keys.add(hexKey(row.hex));
          }
        }
        writeCache(vaultId, sortRows(merged).slice(0, COLOR_WALK_SAVED_MAX));
      }
    }
    void reload();
    return undefined;
  }, [reload, enabled, canSync, vaultId]);

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

  const saveHex = useCallback(
    async (hex) => {
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

      // Local-first — UI navigates immediately
      const optimistic = ensureHexRow(rows, norm, `local-${norm}-${Date.now()}`);
      commitRows(optimistic, vaultId);

      if (!canSync) {
        return {
          ok: true,
          unauthorized: false,
          full: optimistic.length >= COLOR_WALK_SAVED_MAX,
          existing: false,
          rows: optimistic,
        };
      }

      setSaving(true);
      setError(null);
      void (async () => {
        try {
          const res = await saveColorWalkColor({ hex: norm });
          if (res.full) {
            setRows((prev) => {
              const rolled = prev.filter((r) => hexKey(r.hex) !== hexKey(norm));
              writeCache(vaultId, rolled);
              return rolled;
            });
            setError(res.error || new Error('saved_colors_full'));
            return;
          }
          if (res.error) {
            setError(res.error);
            return;
          }
          const { rows: next, error: fetchErr } = await fetchColorWalkSavedColors();
          if (!fetchErr) {
            let latest = applyServerRows(next, vaultId);
            if (!latest.some((r) => hexKey(r.hex) === hexKey(norm))) {
              commitRows(ensureHexRow(latest, norm, res.id), vaultId);
            }
          } else if (res.id) {
            setRows((prev) => {
              const patched = prev.map((r) =>
                hexKey(r.hex) === hexKey(norm) ? { ...r, id: res.id } : r,
              );
              writeCache(vaultId, patched);
              return patched;
            });
          }
        } catch (e) {
          setError(e);
        } finally {
          setSaving(false);
        }
      })();

      return {
        ok: true,
        unauthorized: false,
        full: optimistic.length >= COLOR_WALK_SAVED_MAX,
        existing: false,
        rows: optimistic,
      };
    },
    [rows, full, hasHex, commitRows, applyServerRows, vaultId, canSync],
  );

  const removeById = useCallback(
    async (id) => {
      if (!id) return { ok: false };
      setDeletingId(id);
      setError(null);

      const prev = rows;
      commitRows(prev.filter((r) => r.id !== id), vaultId);

      if (!canSync || String(id).startsWith('local-')) {
        setDeletingId(null);
        return { ok: true };
      }

      try {
        const { error: err } = await deleteColorWalkSavedColor(id);
        if (err instanceof ApiError && err.status === 401) {
          commitRows(prev, vaultId);
          setError(err);
          setDeletingId(null);
          return { ok: false, error: err };
        }
        if (!err) {
          const refreshed = await fetchColorWalkSavedColors();
          if (!refreshed.error) applyServerRows(refreshed.rows, vaultId);
        } else {
          setError(err);
        }
      } catch (e) {
        setError(e);
      }
      setDeletingId(null);
      return { ok: true };
    },
    [rows, commitRows, applyServerRows, vaultId, canSync],
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
