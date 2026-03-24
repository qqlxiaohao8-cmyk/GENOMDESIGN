import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import ExtractedStyleUiPreview from './ExtractedStyleUiPreview';
import ColorCardLayout from './ColorCardLayout';

function extractionSnapshotObject(item) {
  const s = item?.extractionSnapshot;
  return s && typeof s === 'object' ? s : null;
}

export function itemColorCardData(item) {
  const snap = extractionSnapshotObject(item);
  if (snap?.colorCard === true && snap.colorCardData?.colors?.length) {
    return snap.colorCardData;
  }
  return null;
}

/** Build analysis-shaped object for Style preview / detail from a vault/community style row. */
export function styleItemToAnalysisResult(item) {
  if (!item) return null;
  const snap = extractionSnapshotObject(item);
  if (snap?.colorCard === true && snap.colorCardData && typeof snap.colorCardData === 'object') {
    const cd = snap.colorCardData;
    return {
      colorCardOnly: true,
      colorCardData: cd,
      aesthetic: snap.aesthetic ?? item.aesthetic,
      palette: Array.isArray(cd.colors) ? cd.colors.map((c) => c.hex) : item.palette,
      keywords: snap.keywords ?? item.keywords ?? ['color-extract'],
      prompt: snap.prompt ?? item.prompt ?? cd.overview,
      typography: item.typography,
      fonts: item.fonts,
    };
  }
  if (snap) {
    return {
      aesthetic: snap.aesthetic ?? item.aesthetic,
      typography: snap.typography ?? item.typography,
      fonts: snap.fonts ?? item.fonts,
      palette: snap.palette ?? item.palette,
      designLogic: snap.designLogic ?? snap.design_logic,
      keywords: snap.keywords ?? item.keywords,
      prompt: snap.prompt ?? item.prompt,
      uiGeometry: snap.uiGeometry ?? item.uiGeometry,
      colorRoles: snap.colorRoles ?? item.colorRoles,
      uiObservation: snap.uiObservation ?? item.uiObservation,
      recognizedComponents: snap.recognizedComponents ?? item.recognizedComponents,
      layoutBlueprint: snap.layoutBlueprint ?? item.layoutBlueprint,
      styleIdentification: snap.styleIdentification ?? item.styleIdentification,
      iconography: snap.iconography ?? item.iconography,
      interactionSpec: snap.interactionSpec ?? item.interactionSpec,
    };
  }
  return {
    aesthetic: item.aesthetic,
    typography: item.typography,
    fonts: item.fonts,
    palette: item.palette,
    designLogic: item.designLogic,
    keywords: item.keywords,
    prompt: item.prompt,
    uiGeometry: item.uiGeometry,
    colorRoles: item.colorRoles,
    uiObservation: item.uiObservation,
    recognizedComponents: item.recognizedComponents,
    layoutBlueprint: item.layoutBlueprint,
    styleIdentification: item.styleIdentification,
    iconography: item.iconography,
    interactionSpec: item.interactionSpec,
  };
}

function hasRenderablePalette(analysis) {
  const p = analysis?.palette;
  return Array.isArray(p) && p.length > 0;
}

/**
 * Vault / community tile: color cards use the real layout (scaled). Full styles use UI kit preview.
 */
export default function StyleUiPreviewCard({ item, className = '', scale: _scaleIgnored = 0.38, imgClassName = '' }) {
  const analysis = styleItemToAnalysisResult(item);
  const cd = itemColorCardData(item);

  const containerRef = useRef(null);
  const innerRef = useRef(null);
  const contentRef = useRef(null);
  const [coverScale, setCoverScale] = useState(0.38);
  const [kitScale, setKitScale] = useState(0.32);

  const updateCoverScale = useCallback(() => {
    const box = containerRef.current;
    const inner = innerRef.current;
    if (!box || !inner) return;
    const cw = box.clientWidth;
    const ch = box.clientHeight;
    const bw = inner.offsetWidth || 440;
    const bh = inner.offsetHeight || 520;
    if (cw < 2 || ch < 2 || bw < 2 || bh < 2) return;
    setCoverScale(Math.max(cw / bw, ch / bh));
  }, []);

  const updateKitScale = useCallback(() => {
    const box = containerRef.current;
    const inner = contentRef.current;
    if (!box || !inner) return;
    const cw = box.clientWidth;
    const ch = box.clientHeight;
    const bw = inner.offsetWidth || 540;
    const bh = inner.offsetHeight;
    if (cw < 2 || ch < 2 || bw < 2 || bh < 2) return;
    setKitScale(Math.max(cw / bw, ch / bh));
  }, []);

  useLayoutEffect(() => {
    if (!cd) return;
    updateCoverScale();
    const box = containerRef.current;
    const inner = innerRef.current;
    if (!box) return;
    const ro = new ResizeObserver(() => requestAnimationFrame(updateCoverScale));
    ro.observe(box);
    if (inner) ro.observe(inner);
    return () => ro.disconnect();
  }, [cd, item?.id, item?.imageUrl, cd?.overview, updateCoverScale]);

  useLayoutEffect(() => {
    if (cd) return;
    updateKitScale();
    const box = containerRef.current;
    const inner = contentRef.current;
    if (!box) return;
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(updateKitScale);
    });
    ro.observe(box);
    if (inner) ro.observe(inner);
    return () => ro.disconnect();
  }, [cd, item?.id, item?.imageUrl, item?.extractionSnapshot, updateKitScale]);

  if (cd) {
    return (
      <div ref={containerRef} className={`relative overflow-hidden bg-neutral-950 ${className}`}>
        <div
          ref={innerRef}
          className="absolute left-1/2 top-1/2 w-[440px] max-w-[min(440px,92vw)] will-change-transform pointer-events-none select-none"
          style={{
            transform: `translate(-50%, -50%) scale(${coverScale})`,
            transformOrigin: 'center center',
          }}
          aria-hidden
        >
          <ColorCardLayout compact imageSrc={item.imageUrl} colors={cd.colors} />
        </div>
      </div>
    );
  }

  if (!hasRenderablePalette(analysis)) {
    const imgCls = [className, imgClassName].filter(Boolean).join(' ');
    return <img src={item.imageUrl} alt="" className={imgCls || undefined} />;
  }

  return (
    <div ref={containerRef} className={`relative overflow-hidden bg-neutral-100 ${className}`}>
      <div
        ref={contentRef}
        className="absolute left-1/2 top-1/2 pointer-events-none select-none w-[1180px] max-w-[1180px] will-change-transform"
        style={{
          transform: `translate(-50%, -50%) scale(${kitScale})`,
          transformOrigin: 'center center',
        }}
        aria-hidden
      >
        <ExtractedStyleUiPreview analysisResult={analysis} interactive={false} />
      </div>
    </div>
  );
}
