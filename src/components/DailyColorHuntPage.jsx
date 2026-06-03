import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload,
  Loader2,
  Trophy,
  CalendarDays,
  ThumbsUp,
  ChevronLeft,
  ImageIcon,
  Sparkles,
  Flag,
} from 'lucide-react';
import { getDailyPalette, formatDailyPaletteDateKey } from '../lib/dailyPalette';
import {
  fetchSubmissionsForDate,
  fetchVotesForSubmissions,
  castHuntVote,
  fetchMySubmissionForDate,
  submitColorHuntReport,
} from '../lib/colorHuntApi';

function localDateKey(d = new Date()) {
  return formatDailyPaletteDateKey(d);
}

function addDaysKey(key, deltaDays) {
  const [y, m, day] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, day + deltaDays);
  return formatDailyPaletteDateKey(dt);
}

function huntTargetFromPalette(palette) {
  const c0 = palette?.colors?.[0];
  if (!c0) return { hex: '#14b8a6', name: '今日之色', overview: palette?.overview || '' };
  return {
    hex: String(c0.hex || '#888888').toUpperCase(),
    name: c0.name || '目标色',
    overview: palette?.overview || '',
    title: palette?.title || '',
  };
}

export default function DailyColorHuntPage({
  user,
  supabase,
  supabaseConfigured,
  displayUserName,
  onBeginHuntExtractFromFile,
}) {
  const todayKey = useMemo(() => localDateKey(new Date()), []);
  const yesterdayKey = useMemo(() => addDaysKey(todayKey, -1), [todayKey]);
  const [viewDate, setViewDate] = useState(todayKey);
  const [mode, setMode] = useState('live');
  const galleryRef = useRef(null);

  const viewPalette = useMemo(() => {
    const [y, m, d] = viewDate.split('-').map(Number);
    return getDailyPalette(new Date(y, m - 1, d));
  }, [viewDate]);
  const target = useMemo(() => huntTargetFromPalette(viewPalette), [viewPalette]);

  const [submissions, setSubmissions] = useState([]);
  const [votesBySub, setVotesBySub] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [mySubmission, setMySubmission] = useState(null);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [voteBusyId, setVoteBusyId] = useState(null);
  const [optimisticBump, setOptimisticBump] = useState({});
  const [upvoteAnimId, setUpvoteAnimId] = useState(null);
  /** @type {null | { winners: { submission: object; votes: number }[]; tied: boolean; targetHex: string; targetName: string; targetOverview: string }} */
  const [yesterdaySpotlight, setYesterdaySpotlight] = useState(null);
  const [reportBusyId, setReportBusyId] = useState(null);

  const refreshAll = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      setSubmissions([]);
      return;
    }
    setLoadError(null);
    setLoading(true);
    try {
      const { rows, error } = await fetchSubmissionsForDate(supabase, viewDate);
      if (error) {
        setLoadError(error.message || '无法加载挑战数据');
        setSubmissions([]);
        setVotesBySub({});
      } else {
        setSubmissions(rows);
        const ids = rows.map((r) => r.id);
        const { bySubmission } = await fetchVotesForSubmissions(supabase, ids);
        setVotesBySub(bySubmission);
      }
      if (user?.id) {
        const { row } = await fetchMySubmissionForDate(supabase, viewDate, user.id);
        setMySubmission(row);
      } else {
        setMySubmission(null);
      }
    } finally {
      setLoading(false);
    }
  }, [supabase, viewDate, user?.id]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!supabase || viewDate !== todayKey) {
      setYesterdaySpotlight(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { rows } = await fetchSubmissionsForDate(supabase, yesterdayKey);
      if (!rows?.length || cancelled) {
        setYesterdaySpotlight(null);
        return;
      }
      const ids = rows.map((r) => r.id);
      const { bySubmission } = await fetchVotesForSubmissions(supabase, ids);
      let maxScore = 0;
      for (const s of rows) {
        maxScore = Math.max(maxScore, (bySubmission[s.id] || []).length);
      }
      if (maxScore === 0 || cancelled) {
        setYesterdaySpotlight(null);
        return;
      }
      const top = rows.filter((s) => (bySubmission[s.id] || []).length === maxScore);
      const [yy, mm, dd] = yesterdayKey.split('-').map(Number);
      const yPal = getDailyPalette(new Date(yy, mm - 1, dd));
      const yt = huntTargetFromPalette(yPal);
      setYesterdaySpotlight({
        winners: top.map((submission) => ({ submission, votes: maxScore })),
        tied: top.length > 1,
        targetHex: yt.hex,
        targetName: yt.name,
        targetOverview: yt.overview,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, viewDate, todayKey, yesterdayKey]);

  useEffect(() => {
    if (!supabase || !submissions.length) return;
    const channel = supabase
      .channel(`color-hunt-votes-${viewDate}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'color_hunt_votes' },
        () => {
          void (async () => {
            const ids = submissions.map((r) => r.id);
            const { bySubmission } = await fetchVotesForSubmissions(supabase, ids);
            setVotesBySub(bySubmission);
          })();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, viewDate, submissions]);

  const voteCount = useCallback(
    (submissionId) => {
      const base = (votesBySub[submissionId] || []).length;
      return base + (optimisticBump[submissionId] || 0);
    },
    [votesBySub, optimisticBump]
  );

  const hasVoted = useCallback(
    (submissionId) => {
      const voters = votesBySub[submissionId] || [];
      return user?.id && voters.includes(user.id);
    },
    [votesBySub, user?.id]
  );

  const onVote = async (submission) => {
    if (!user || !supabase || submission.user_id === user.id) return;
    if (hasVoted(submission.id)) return;
    setVoteBusyId(submission.id);
    setOptimisticBump((o) => ({ ...o, [submission.id]: (o[submission.id] || 0) + 1 }));
    setUpvoteAnimId(submission.id);
    setTimeout(() => setUpvoteAnimId(null), 480);
    const { error } = await castHuntVote(supabase, submission.id, user.id);
    if (error) {
      setOptimisticBump((o) => ({ ...o, [submission.id]: Math.max(0, (o[submission.id] || 0) - 1) }));
      console.error(error);
    } else {
      const ids = submissions.map((r) => r.id);
      const { bySubmission } = await fetchVotesForSubmissions(supabase, ids);
      setVotesBySub(bySubmission);
      setOptimisticBump((o) => {
        const next = { ...o };
        delete next[submission.id];
        return next;
      });
    }
    setVoteBusyId(null);
  };

  const onReport = async (submission) => {
    if (!user || !supabase || !submission?.id) return;
    if (submission.user_id === user.id) return;
    const reason = window.prompt(
      '如遇不当内容可在此举报。请简要说明原因（选填），管理员将在后台审核处理。'
    );
    if (reason === null) return;
    setReportBusyId(submission.id);
    const { error } = await submitColorHuntReport(supabase, submission.id, user.id, reason);
    setReportBusyId(null);
    if (error) {
      const msg = String(error.message || '');
      if (/duplicate|unique|23505/i.test(msg)) {
        window.alert('您已对该作品提交过举报。');
      } else {
        window.alert(msg || '举报提交失败。请确认已应用迁移 006_color_hunt_reports.sql。');
      }
    } else {
      window.alert('举报已记录，感谢反馈。');
    }
  };

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onBeginHuntExtractFromFile) return;
    setSubmitBusy(true);
    try {
      await onBeginHuntExtractFromFile(file, {
        huntDate: viewDate,
        targetHex: target.hex,
        targetName: target.name,
      });
    } catch (err) {
      console.error(err);
      window.alert(err?.message || '无法进入取色流程，请重试。');
    } finally {
      setSubmitBusy(false);
    }
  };

  const hallWinners = useMemo(() => {
    const out = [];
    for (let i = 1; i <= 28; i++) {
      out.push(addDaysKey(todayKey, -i));
    }
    return out;
  }, [todayKey]);

  const isViewingToday = viewDate === todayKey;
  /** 登录用户已投过则禁用；未登录也可选图进入析色，发布作品墙时再登录。 */
  const canSubmit = Boolean(supabaseConfigured && isViewingToday && !(user?.id && mySubmission));

  return (
    <div className="max-w-6xl mx-auto pb-24 font-zenSans font-extralight text-zen-ink">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div>
          <p className="zen-eyebrow mb-1 text-zen-vermilion/90">逐日观色</p>
          <h1 className="font-zenSerif text-3xl md:text-4xl font-medium tracking-tight text-zen-ink">
            每日色彩挑战
          </h1>
          <p className="text-sm text-zen-ink/60 mt-2 max-w-xl leading-relaxed">
            以今日主题色为灵感进行拍摄创作；每人每日限投一件。社区点赞决胜，次日揭晓优胜。平票时并列展示，最终可由管理员裁定。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setMode('live');
              setViewDate(todayKey);
            }}
            className={`px-4 py-2 rounded-full text-[10px] font-extralight uppercase tracking-[0.2em] border transition-all duration-[2000ms] ${
              mode === 'live' && isViewingToday
                ? 'bg-zen-ink text-white border-zen-ink/20'
                : 'bg-zen-paper text-zen-ink border-zen-ink/10 hover:bg-zen-ink/[0.04]'
            }`}
          >
            今日挑战
          </button>
          <button
            type="button"
            onClick={() => setMode('hall')}
            className={`px-4 py-2 rounded-full text-[10px] font-extralight uppercase tracking-[0.2em] border transition-all duration-[2000ms] ${
              mode === 'hall'
                ? 'bg-zen-vermilion text-white border-zen-vermilion/30'
                : 'bg-zen-paper text-zen-ink border-zen-ink/10 hover:bg-zen-ink/[0.04]'
            }`}
          >
            荣誉殿堂 · 过往挑战
          </button>
        </div>
      </div>

      {!supabaseConfigured ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50/80 text-amber-950 text-sm font-extralight px-4 py-3">
          配置 Supabase（VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY）后即可投稿与点赞。
        </p>
      ) : null}

      {loadError ? (
        <p className="rounded-2xl border border-red-200 bg-red-50/80 text-red-800 text-sm font-extralight px-4 py-3 mb-6">
          {loadError} — 请确认已在库中执行 <code className="font-mono text-xs">005_color_hunt.sql</code>
          ；举报功能需 <code className="font-mono text-xs">006_color_hunt_reports.sql</code>。
        </p>
      ) : null}

      {mode === 'hall' ? (
        <section className="mb-10 zen-panel p-6">
          <h2 className="text-lg font-zenSerif font-medium tracking-tight flex items-center gap-2 mb-4">
            <CalendarDays size={22} className="text-zen-vermilion/85" aria-hidden />
            按日期浏览历史挑战
          </h2>
          <p className="text-sm text-zen-ink/60 mb-4 leading-relaxed">
            选择日期可查看当日主题色与全部投稿。优胜者为当日最高票数（可并列）；亦可在下方按色彩快捷跳转。
          </p>
          <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto overscroll-y-contain pr-1">
            {hallWinners.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setViewDate(key);
                  setMode('live');
                }}
                className={`px-3 py-2 rounded-xl text-xs font-extralight border transition-colors duration-[2000ms] ${
                  viewDate === key
                    ? 'bg-zen-ink text-white border-zen-ink/20'
                    : 'bg-zen-mist text-zen-ink border-zen-ink/10 hover:bg-zen-ink/[0.04]'
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* 今日焦点：主题色 */}
      <section className="mb-10 rounded-[2rem] overflow-hidden border border-zen-ink/10 bg-zen-paper shadow-none">
        <div className="grid lg:grid-cols-12 gap-0 lg:min-h-[min(52vw,420px)] lg:max-h-[480px]">
          <div
            className="lg:col-span-5 min-h-[200px] lg:min-h-0 order-first lg:order-last border-b lg:border-b-0 lg:border-l border-zen-ink/10"
            style={{ backgroundColor: target.hex }}
            aria-hidden
          />
          <div className="lg:col-span-7 p-6 md:p-10 flex flex-col justify-center order-last lg:order-first">
            <p className="zen-eyebrow text-zen-vermilion/90 mb-2">
              {isViewingToday ? '今日挑战色' : `${viewDate} 主题`}
            </p>
            <h2 className="font-zenSerif text-2xl md:text-3xl font-medium text-zen-ink tracking-tight mb-2">
              {target.name}
            </h2>
            <p className="font-mono text-xl md:text-2xl text-zen-ink/90 tabular-nums mb-4">{target.hex}</p>
            {target.title ? (
              <p className="text-xs font-extralight text-zen-vermilion/90 mb-2">{target.title}</p>
            ) : null}
            <p className="text-sm text-zen-ink/65 leading-relaxed max-w-prose">{target.overview}</p>
            {isViewingToday ? (
              <p className="mt-3 text-xs text-zen-ink/50 leading-relaxed max-w-prose">
                点「我要投稿」上传照片后进入与「析色」相同的工作区；系统会比对五色与今日主题色，符合者才可发布到作品墙；不符时仍可保存色卡至「藏」。
              </p>
            ) : null}

            <div className="mt-8 flex flex-col sm:flex-row flex-wrap gap-3">
              {!isViewingToday ? (
                <p className="text-sm font-extralight text-zen-ink/50 flex items-center gap-2 w-full">
                  <ChevronLeft size={18} aria-hidden />
                  历史日期的挑战仅可浏览作品墙，不再开放投稿。
                </p>
              ) : null}
              {isViewingToday ? (
                user?.id && mySubmission ? (
                  <button
                    type="button"
                    disabled
                    className="px-8 py-4 rounded-2xl bg-zen-ink/[0.06] text-zen-ink/45 font-extralight text-[10px] uppercase tracking-[0.2em] cursor-not-allowed border border-zen-ink/10"
                  >
                    今日已投稿
                  </button>
                ) : (
                  <label
                    className={`inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border border-zen-vermilion/35 font-extralight text-[10px] uppercase tracking-[0.2em] cursor-pointer transition-all duration-[2000ms] touch-manipulation min-h-[48px] ${
                      canSubmit && !submitBusy && onBeginHuntExtractFromFile
                        ? 'bg-zen-vermilion text-white hover:opacity-95'
                        : 'opacity-50 pointer-events-none bg-zen-mist'
                    }`}
                  >
                    {submitBusy ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                    我要投稿
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onPickFile}
                      disabled={!canSubmit || submitBusy || !onBeginHuntExtractFromFile}
                    />
                  </label>
                )
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* 昨日优胜焦点 */}
      {isViewingToday && yesterdaySpotlight?.winners?.length ? (
        <section className="mb-10 rounded-2xl overflow-hidden border border-zen-ink/10 bg-zen-paper">
          <div className="px-5 py-4 border-b border-zen-ink/10 bg-zen-mist/90 backdrop-blur-sm flex flex-wrap items-center gap-2 justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Trophy className="text-zen-vermilion shrink-0" size={24} aria-hidden />
              <div className="min-w-0">
                <p className="zen-micro-label text-zen-ink/50">昨日优胜 · 焦点展示</p>
                <p className="text-sm font-extralight text-zen-ink truncate">
                  {yesterdaySpotlight.tied ? '并列冠军 · ' : ''}
                  目标色 <span className="font-mono">{yesterdaySpotlight.targetName}</span>（
                  {yesterdaySpotlight.targetHex}）
                </p>
              </div>
            </div>
            {yesterdaySpotlight.tied ? (
              <span className="text-[10px] font-extralight uppercase tracking-widest text-zen-ink/45">
                平票并列 · 管理员可另行裁定
              </span>
            ) : null}
          </div>
          <div className="p-4 space-y-8">
            {yesterdaySpotlight.winners.map(({ submission: w, votes }) => (
              <div key={w.id} className="grid md:grid-cols-2 gap-4 md:gap-6">
                <div className="rounded-2xl overflow-hidden border border-zen-ink/10 bg-zen-mist aspect-[4/3]">
                  <img src={w.image_url} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col justify-center gap-3 py-2">
                  <p className="text-sm text-zen-ink">
                    <span className="font-zenSerif font-medium text-lg">{w.submitter_display_name || '创作者'}</span>
                    <span className="text-zen-ink/55 ml-2 tabular-nums">{votes} 票</span>
                  </p>
                  <div>
                    <p className="zen-micro-label mb-2">获胜作品提取色卡</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {(w.palette || []).map((sw, i) => (
                        <span
                          key={i}
                          className="w-11 h-11 md:w-12 md:h-12 rounded-xl border border-zen-ink/10 shrink-0"
                          style={{ backgroundColor: sw.hex }}
                          title={sw.name ? `${sw.name} ${sw.hex}` : sw.hex}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-zen-ink/10 bg-white/60 px-3 py-2 text-xs text-zen-ink/60">
                    <span className="text-zen-ink/45">当日目标色：</span>
                    <span className="font-mono">{yesterdaySpotlight.targetHex}</span>
                    <span className="mx-1">·</span>
                    {yesterdaySpotlight.targetName}
                  </div>
                  {yesterdaySpotlight.targetOverview ? (
                    <p className="text-[11px] text-zen-ink/50 leading-relaxed">{yesterdaySpotlight.targetOverview}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* 作品墙 */}
      <section ref={galleryRef} className="scroll-mt-8">
        <h2 className="text-lg font-zenSerif font-medium tracking-tight flex items-center gap-2 mb-4">
          <ImageIcon size={22} className="text-zen-ink/55" aria-hidden />
          作品墙 · {viewDate}
          {loading ? <Loader2 className="animate-spin text-zen-ink/35" size={18} /> : null}
        </h2>
        {!loading && submissions.length === 0 ? (
          <p className="text-zen-ink/50 font-extralight py-12 text-center border border-dashed border-zen-ink/15 rounded-2xl bg-zen-mist/50">
            本日尚无投稿，来做第一个吧。
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8">
            {submissions.map((s) => {
              const isMine = user?.id === s.user_id;
              const voted = hasVoted(s.id);
              const disabledVote = !user || isMine || voted || voteBusyId === s.id;
              const vc = voteCount(s.id);
              const anim = upvoteAnimId === s.id;
              return (
                <article
                  key={s.id}
                  className="rounded-2xl border border-zen-ink/10 bg-zen-paper overflow-hidden transition-opacity duration-[2000ms] hover:opacity-[0.97]"
                >
                  <div className="aspect-[4/3] bg-zen-mist relative">
                    <img src={s.image_url} alt="" className="w-full h-full object-cover" />
                    {isMine ? (
                      <span className="absolute top-2 left-2 px-2 py-1 rounded-full bg-zen-ink/75 text-white text-[9px] font-extralight uppercase tracking-widest">
                        我的
                      </span>
                    ) : null}
                    {user && !isMine ? (
                      <button
                        type="button"
                        disabled={reportBusyId === s.id}
                        onClick={() => onReport(s)}
                        className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-white/90 border border-zen-ink/10 px-2 py-1 text-[9px] font-extralight uppercase tracking-wider text-zen-ink/70 hover:bg-red-50 hover:border-red-200 hover:text-red-900 transition-colors"
                        title="举报不当内容"
                      >
                        <Flag size={12} strokeWidth={2} aria-hidden />
                        举报
                      </button>
                    ) : null}
                  </div>
                  <div className="p-4 flex flex-col gap-3">
                    <p className="text-xs font-extralight text-zen-ink truncate">
                      {s.submitter_display_name || '投稿者'}
                    </p>
                    <div className="flex gap-1">
                      {(s.palette || []).map((sw, i) => (
                        <span
                          key={i}
                          className="h-8 flex-1 min-w-0 rounded-lg border border-zen-ink/10"
                          style={{ backgroundColor: sw.hex }}
                          title={sw.name ? `${sw.name} ${sw.hex}` : sw.hex}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-extralight tabular-nums text-zen-ink/80">{vc} 票</span>
                      <button
                        type="button"
                        disabled={disabledVote}
                        onClick={() => onVote(s)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-[10px] font-extralight uppercase tracking-[0.15em] transition-all duration-[2000ms] motion-safe:transition-transform ${
                          voted
                            ? 'border-zen-ink/20 bg-zen-ink text-white'
                            : isMine
                              ? 'opacity-40 cursor-not-allowed bg-zen-mist border-zen-ink/10'
                              : 'border-zen-ink/15 bg-zen-paper hover:bg-zen-ink/[0.04]'
                        } ${anim ? 'motion-safe:animate-hunt-like' : ''}`}
                      >
                        <ThumbsUp size={16} className={voted ? 'fill-white' : ''} aria-hidden />
                        {voted ? '已赞' : '点赞'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-12 rounded-2xl border border-dashed border-zen-ink/15 p-6 bg-zen-mist/60">
        <h3 className="text-sm font-extralight uppercase tracking-[0.15em] flex items-center gap-2 text-zen-ink">
          <Sparkles size={18} className="text-zen-vermilion/80" aria-hidden />
          按色彩浏览（近日挑战）
        </h3>
        <p className="text-xs text-zen-ink/50 mt-2 mb-3 leading-relaxed">
          根据该日每日调色板的首色快捷跳转到对应挑战页，便于按色相检索过往作品。
        </p>
        <div className="flex flex-wrap gap-2">
          {hallWinners.slice(0, 14).map((key) => {
            const [y, m, d] = key.split('-').map(Number);
            const p = getDailyPalette(new Date(y, m - 1, d));
            const h = huntTargetFromPalette(p).hex;
            return (
              <button
                key={`c-${key}`}
                type="button"
                onClick={() => {
                  setViewDate(key);
                  setMode('live');
                }}
                className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-zen-ink/10 bg-zen-paper text-[10px] font-extralight hover:bg-zen-ink/[0.04] transition-colors duration-[2000ms]"
              >
                <span className="w-6 h-6 rounded-full border border-zen-ink/10 shrink-0" style={{ backgroundColor: h }} />
                {key}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
