import React, { useState } from 'react';
import { Wand2, Check, Clock, Sparkles, Ticket, BarChart3 } from 'lucide-react';
import {
  iconStrokeFromIconography,
  iconPxFromScale,
  mergeIconography,
} from '../../lib/interactionSpec';

const SCALE_LABELS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

const STATUS_ITEMS = ['Newsletter', 'Existing customers', 'Trial users'];

const SCHEDULE_ROWS = [
  { time: '9:15 AM', title: 'Weekly Team Sync', sub: 'Video · 30 min' },
  { time: '11:00 AM', title: 'Design critique', sub: 'Room B' },
  { time: '2:30 PM', title: 'Client review', sub: 'External' },
];

const FEATURE_SOLID = [
  { icon: Sparkles, title: 'Manage team access', sub: 'Roles & SSO' },
  { icon: Ticket, title: 'Support queue', sub: 'SLA dashboards' },
  { icon: BarChart3, title: 'Usage insights', sub: 'Export anytime' },
];

function cardStyle(t, geom, bw, extra = {}) {
  return {
    backgroundColor: t.surface,
    borderColor: t.border,
    borderWidth: bw,
    borderStyle: 'solid',
    borderRadius: geom.radiusCard,
    boxShadow: geom.shadowCard === 'none' ? undefined : geom.shadowCard,
    ...extra,
  };
}

export default function UiKitShowcase({
  analysisResult,
  t,
  geom,
  fontStacks,
  bw,
  interactive,
  previewHints,
  btnInteractive,
  ir,
}) {
  const ig = mergeIconography(analysisResult);
  const stroke = iconStrokeFromIconography(ig);
  const iconPx = iconPxFromScale(ig);

  const [statusSel, setStatusSel] = useState(1);
  const swatches = t.swatches && t.swatches.length ? t.swatches.slice(0, 11) : [];
  const n = swatches.length || 1;
  const gridCols = `repeat(${n}, minmax(0, 1fr))`;

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h2
            className={`text-2xl sm:text-3xl leading-tight ${
              previewHints.headingCaps ? 'font-black uppercase tracking-tighter' : 'font-bold tracking-tight'
            } ${previewHints.headingSquash ? 'inline-block origin-left scale-y-110' : ''}`}
            style={{ fontFamily: fontStacks.headingCSS, color: t.textMain }}
          >
            Component gallery
          </h2>
          <p className="text-sm mt-1 max-w-xl" style={{ color: t.textMuted, fontFamily: fontStacks.bodyCSS }}>
            Curated blocks: palette ramp, button states, hero, audiences, schedule, and feature tiles — all from this
            extraction.
          </p>
        </div>
        <span
          className="shrink-0 self-start text-xs font-semibold px-3 py-1.5 border"
          style={{
            backgroundColor: t.primarySoft,
            color: t.primary,
            borderColor: t.border,
            borderWidth: bw,
            borderRadius: geom.radiusSmall,
            fontFamily: fontStacks.accentCSS,
          }}
        >
          {analysisResult?.aesthetic || 'Extracted'} · kit
        </span>
      </div>

      <div className="mb-6">
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: t.textMuted, fontFamily: fontStacks.accentCSS }}
        >
          Palette scale
        </p>
        <div
          className="flex overflow-hidden border h-11"
          style={{
            borderColor: t.border,
            borderWidth: bw,
            borderRadius: geom.radiusPaletteOuter,
          }}
          role="img"
          aria-label="Palette ramp from extraction"
        >
          {swatches.map((hex, i) => (
            <div
              key={`sw-${i}-${hex}`}
              className="flex-1 min-w-0 h-full"
              style={{
                backgroundColor: hex,
                borderRadius:
                  i === 0
                    ? `${geom.radiusPaletteInner} 0 0 ${geom.radiusPaletteInner}`
                    : i === n - 1
                      ? `0 ${geom.radiusPaletteInner} ${geom.radiusPaletteInner} 0`
                      : '0',
              }}
              title={`${SCALE_LABELS[i] ?? i}: ${hex}`}
            />
          ))}
        </div>
        <div
          className="grid mt-1 text-center gap-0"
          style={{ gridTemplateColumns: gridCols }}
          aria-hidden
        >
          {swatches.map((_, i) => (
            <span
              key={`lb-${i}`}
              className="text-[9px] font-semibold tabular-nums truncate px-0.5"
              style={{ color: t.textMuted, fontFamily: fontStacks.accentCSS }}
            >
              {SCALE_LABELS[i] ?? i}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-8 overflow-x-auto">
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: t.textMuted, fontFamily: fontStacks.accentCSS }}
        >
          Buttons — state matrix (demo columns)
        </p>
        <table className="w-full text-left text-xs border-collapse min-w-[520px]" style={{ fontFamily: fontStacks.bodyCSS }}>
          <thead>
            <tr style={{ color: t.textMuted }}>
              <th className="py-2 pr-3 font-semibold">Variant</th>
              <th className="py-2 px-2 font-semibold">Default</th>
              <th className="py-2 px-2 font-semibold">Hover</th>
              <th className="py-2 px-2 font-semibold">Active</th>
              <th className="py-2 pl-2 font-semibold">Disabled</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Primary', kind: 'primary' },
              { label: 'Secondary', kind: 'secondary' },
              { label: 'Tertiary', kind: 'tertiary' },
            ].map((row) => {
              const baseSolid = {
                borderRadius: geom.radiusButton,
                boxShadow: geom.shadowButton === 'none' ? undefined : geom.shadowButton,
                borderWidth: bw,
                borderStyle: 'solid',
                fontFamily: fontStacks.bodyCSS,
              };
              const primaryStyle = { ...baseSolid, backgroundColor: t.primary, color: '#fff', borderColor: 'transparent' };
              const secondaryStyle = {
                ...baseSolid,
                backgroundColor: t.secondaryBtn,
                color: t.textMain,
                borderColor: t.border,
              };
              const tertiaryStyle = {
                ...baseSolid,
                backgroundColor: 'transparent',
                color: t.primary,
                borderColor: t.primary,
              };
              const cell = (style) => (
                <button
                  type="button"
                  disabled={!interactive}
                  className={`px-4 py-2 text-xs font-semibold border ${interactive ? btnInteractive : ''}`}
                  style={style}
                >
                  Label
                </button>
              );
              let defStyle;
              let hoverStyle;
              let activeStyle;
              let disStyle;
              if (row.kind === 'primary') {
                defStyle = { ...primaryStyle };
                hoverStyle = { ...primaryStyle, filter: 'brightness(0.95)', transform: 'translateY(-1px)', boxShadow: '0 6px 16px rgba(15,23,42,0.12)' };
                activeStyle = { ...primaryStyle, backgroundColor: t.primaryHover || t.primary, transform: 'scale(0.97)' };
                disStyle = { ...primaryStyle, opacity: 0.4 };
              } else if (row.kind === 'secondary') {
                defStyle = { ...secondaryStyle };
                hoverStyle = { ...secondaryStyle, filter: 'brightness(0.97)', transform: 'translateY(-1px)' };
                activeStyle = { ...secondaryStyle, backgroundColor: t.secondaryHover || t.secondaryBtn, transform: 'scale(0.97)' };
                disStyle = { ...secondaryStyle, opacity: 0.4 };
              } else {
                defStyle = { ...tertiaryStyle };
                hoverStyle = { ...tertiaryStyle, backgroundColor: t.primarySoft };
                activeStyle = { ...tertiaryStyle, backgroundColor: t.primarySoft, transform: 'scale(0.97)' };
                disStyle = { ...tertiaryStyle, opacity: 0.4 };
              }
              return (
                <tr key={row.kind} style={{ borderTop: `${bw} solid ${t.border}` }}>
                  <td className="py-3 pr-3 font-semibold" style={{ color: t.textMain }}>
                    {row.label}
                  </td>
                  <td className="py-3 px-2">{cell(defStyle)}</td>
                  <td className="py-3 px-2">{cell(hoverStyle)}</td>
                  <td className="py-3 px-2">{cell(activeStyle)}</td>
                  <td className="py-3 pl-2">
                    <button
                      type="button"
                      disabled
                      className="px-4 py-2 text-xs font-semibold border cursor-not-allowed"
                      style={disStyle}
                    >
                      Label
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="text-[10px] mt-2" style={{ color: t.textMuted }}>
          Hover/Active columns illustrate states; use design tokens from extraction for production components.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-8">
        <div className="lg:col-span-7 space-y-5">
          <div
            className="p-5 sm:p-6"
            style={{
              ...cardStyle(t, geom, bw),
              backgroundColor: t.primarySoft,
            }}
          >
            <div
              className="w-10 h-10 mb-4 flex items-center justify-center"
              style={{ backgroundColor: t.primary, borderRadius: ir, color: '#fff' }}
            >
              <Wand2 size={iconPx} strokeWidth={stroke} />
            </div>
            <h3
              className="text-xl sm:text-2xl font-bold mb-2"
              style={{ fontFamily: fontStacks.headingCSS, color: t.textMain }}
            >
              {previewHints.italicEmphasis ? (
                <>
                  <span className="italic">Grow</span> — increase your revenue by 3×
                </>
              ) : (
                'Increase your revenue by 3×'
              )}
            </h3>
            <p className="text-sm mb-5 max-w-lg leading-relaxed" style={{ color: t.textMuted, fontFamily: fontStacks.bodyCSS }}>
              Hero CTA block: soft surface, icon tile, headline, supporting copy, and primary action.
            </p>
            <button
              type="button"
              disabled={!interactive}
              className={`px-6 py-2.5 text-sm font-semibold text-white ${interactive ? btnInteractive : ''}`}
              style={{
                backgroundColor: t.primary,
                borderRadius: geom.radiusButton,
                boxShadow: geom.shadowButton === 'none' ? undefined : geom.shadowButton,
                fontFamily: fontStacks.bodyCSS,
              }}
            >
              Start growing
            </button>
          </div>

          <div style={cardStyle(t, geom, bw)} className="p-5">
            <p className="text-sm font-bold mb-3" style={{ fontFamily: fontStacks.headingCSS, color: t.textMain }}>
              Audiences
            </p>
            <ul className="space-y-2" role="listbox" aria-label="Selectable audience">
              {STATUS_ITEMS.map((label, i) => {
                const selected = statusSel === i;
                return (
                  <li key={label}>
                    <button
                      type="button"
                      disabled={!interactive}
                      onClick={() => interactive && setStatusSel(i)}
                      aria-selected={selected}
                      className={`w-full text-left px-4 py-3 rounded-xl border flex items-center gap-3 ${interactive ? 'transition-[border-color,box-shadow] duration-150' : ''}`}
                      style={{
                        borderColor: selected ? t.primary : t.border,
                        borderWidth: bw,
                        backgroundColor: selected ? t.primarySoft : t.surface,
                        fontFamily: fontStacks.bodyCSS,
                        color: t.textMain,
                        boxShadow: selected ? `0 0 0 1px ${t.primary}` : undefined,
                      }}
                    >
                      {selected ? <Check size={18} strokeWidth={stroke} style={{ color: t.primary }} /> : <span className="w-[18px]" />}
                      <span className="text-sm font-semibold">{label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div style={cardStyle(t, geom, bw)} className="p-5">
            <p className="text-sm font-bold mb-4 flex items-center gap-2" style={{ fontFamily: fontStacks.headingCSS, color: t.textMain }}>
              <Clock size={16} strokeWidth={stroke} style={{ color: t.primary }} />
              Today
            </p>
            <ul className="space-y-3">
              {SCHEDULE_ROWS.map((ev) => (
                <li
                  key={ev.title}
                  className="flex gap-3 p-3 rounded-xl border-l-4"
                  style={{
                    borderLeftColor: t.primary,
                    backgroundColor: t.primarySoft,
                    borderTop: `${bw} solid ${t.border}`,
                    borderRight: `${bw} solid ${t.border}`,
                    borderBottom: `${bw} solid ${t.border}`,
                    borderTopRightRadius: geom.radiusSmall,
                    borderBottomRightRadius: geom.radiusSmall,
                  }}
                >
                  <span className="text-xs font-bold tabular-nums shrink-0 w-14" style={{ color: t.primary }}>
                    {ev.time}
                  </span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: t.textMain, fontFamily: fontStacks.bodyCSS }}>
                      {ev.title}
                    </p>
                    <p className="text-xs" style={{ color: t.textMuted }}>
                      {ev.sub}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
        {FEATURE_SOLID.map(({ icon: Icon, title, sub }) => (
          <div
            key={title}
            className={`p-5 text-white ${interactive ? 'hover:brightness-110 transition-[filter] duration-150' : ''}`}
            style={{
              backgroundColor: t.primary,
              borderRadius: geom.radiusCard,
              boxShadow: geom.shadowCard === 'none' ? undefined : geom.shadowButton,
              fontFamily: fontStacks.bodyCSS,
            }}
          >
            <Icon size={22} strokeWidth={stroke} className="mb-3 opacity-95" />
            <p className="text-sm font-bold" style={{ fontFamily: fontStacks.headingCSS }}>
              {title}
            </p>
            <p className="text-xs opacity-90 mt-1">{sub}</p>
          </div>
        ))}
      </div>
    </>
  );
}
