/**
 * Client helpers for Daily Color Hunt (tables from supabase/migrations/005_color_hunt.sql).
 */

export async function uploadColorHuntImage(supabase, userId, huntDateKey, dataUrl) {
  if (!/^data:image\//.test(dataUrl || '')) {
    return { publicUrl: null, error: new Error('Not an image data URL.') };
  }
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const ext = blob.type.includes('png')
      ? 'png'
      : blob.type.includes('webp')
        ? 'webp'
        : blob.type.includes('gif')
          ? 'gif'
          : 'jpg';
    const path = `${userId}/color-hunt/${huntDateKey}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('style-images').upload(path, blob, {
      cacheControl: '3600',
      upsert: false,
      contentType: blob.type || 'image/jpeg',
    });
    if (upErr) return { publicUrl: null, error: upErr };
    const { data } = supabase.storage.from('style-images').getPublicUrl(path);
    return { publicUrl: data.publicUrl, error: null };
  } catch (e) {
    return { publicUrl: null, error: e };
  }
}

export async function insertColorHuntSubmission(supabase, row) {
  const { data, error } = await supabase
    .from('color_hunt_submissions')
    .insert({
      hunt_date: row.huntDate,
      user_id: row.userId,
      image_url: row.imageUrl,
      palette: row.palette,
      submitter_display_name: row.submitterDisplayName || null,
    })
    .select('id')
    .single();
  return { id: data?.id ?? null, error };
}

export async function fetchSubmissionsForDate(supabase, huntDate) {
  const { data, error } = await supabase
    .from('color_hunt_submissions')
    .select('id, hunt_date, user_id, image_url, palette, submitter_display_name, created_at')
    .eq('hunt_date', huntDate)
    .order('created_at', { ascending: true });
  return { rows: Array.isArray(data) ? data : [], error };
}

export async function fetchVotesForSubmissions(supabase, submissionIds) {
  if (!submissionIds.length) return { bySubmission: {}, error: null };
  const { data, error } = await supabase
    .from('color_hunt_votes')
    .select('submission_id, voter_user_id')
    .in('submission_id', submissionIds);
  if (error) return { bySubmission: {}, error };
  const bySubmission = {};
  for (const row of data || []) {
    const sid = row.submission_id;
    if (!bySubmission[sid]) bySubmission[sid] = [];
    bySubmission[sid].push(row.voter_user_id);
  }
  return { bySubmission, error: null };
}

export async function castHuntVote(supabase, submissionId, voterUserId) {
  const { error } = await supabase.from('color_hunt_votes').insert({
    submission_id: submissionId,
    voter_user_id: voterUserId,
  });
  return { error };
}

export async function fetchMySubmissionForDate(supabase, huntDate, userId) {
  if (!userId) return { row: null, error: null };
  const { data, error } = await supabase
    .from('color_hunt_submissions')
    .select('id, hunt_date, user_id, image_url, palette, created_at')
    .eq('hunt_date', huntDate)
    .eq('user_id', userId)
    .maybeSingle();
  return { row: data || null, error };
}

/**
 * Submitting user id must match reporter (RLS). Optional short reason for admins.
 */
export async function submitColorHuntReport(supabase, submissionId, reporterUserId, reason) {
  const { error } = await supabase.from('color_hunt_reports').insert({
    submission_id: submissionId,
    reporter_user_id: reporterUserId,
    reason: reason?.trim() || null,
  });
  return { error };
}

/**
 * Dates (YYYY-MM-DD) where this user tied for top votes (ties count as wins for badge / 双冠军).
 */
export async function fetchUserHuntWinDates(supabase, userId) {
  if (!userId) return { winDates: [], error: null };
  const { data: mine, error: e1 } = await supabase
    .from('color_hunt_submissions')
    .select('hunt_date')
    .eq('user_id', userId);
  if (e1) return { winDates: [], error: e1 };
  const dates = [...new Set((mine || []).map((m) => m.hunt_date))].filter(Boolean);
  if (!dates.length) return { winDates: [], error: null };
  const winDates = [];
  await Promise.all(
    dates.map(async (hunt_date) => {
      const { rows, error: e2 } = await fetchSubmissionsForDate(supabase, hunt_date);
      if (e2 || !rows?.length) return;
      const ids = rows.map((r) => r.id);
      const { bySubmission } = await fetchVotesForSubmissions(supabase, ids);
      let max = 0;
      for (const r of rows) {
        max = Math.max(max, (bySubmission[r.id] || []).length);
      }
      if (max === 0) return;
      const top = rows.filter((r) => (bySubmission[r.id] || []).length === max);
      if (top.some((t) => t.user_id === userId)) {
        winDates.push(hunt_date);
      }
    })
  );
  winDates.sort();
  return { winDates, error: null };
}
