import { apiFetch, ApiError } from './apiClient';

export const COLOR_WALK_SAVED_MAX = 5;

export async function fetchColorWalkSavedColors() {
  try {
    const { data } = await apiFetch('/color-walk/saved-colors');
    return { rows: Array.isArray(data) ? data : [], error: null };
  } catch (e) {
    return { rows: [], error: e };
  }
}

/**
 * Save a Color Walk hex. Duplicate hex is treated as success (existing: true).
 * Full vault returns error code `saved_colors_full`.
 */
export async function saveColorWalkColor({ hex, layoutId = 'mosaic', photoKeys = [] } = {}) {
  try {
    const res = await apiFetch('/color-walk/saved-colors', {
      method: 'POST',
      body: { hex, layoutId, photoKeys },
    });
    return {
      id: res?.id ?? null,
      existing: Boolean(res?.existing),
      data: res?.data ?? null,
      error: null,
      full: false,
    };
  } catch (e) {
    if (e instanceof ApiError && (e.code === 'saved_colors_full' || e.code === 'saved_colors_limit_reached')) {
      return { id: null, existing: false, data: null, error: e, full: true };
    }
    return { id: null, existing: false, data: null, error: e, full: false };
  }
}

export async function deleteColorWalkSavedColor(id) {
  try {
    await apiFetch(`/color-walk/saved-colors/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return { error: null };
  } catch (e) {
    return { error: e };
  }
}
