import React from 'react';
import { Plus } from 'lucide-react';
import { IconExtract, IconShengSe, ZhuoquInkDefs } from '../icons/HeyteaIcons';

export default function CreateFab({
  open,
  sink = false,
  onToggle,
  onShengSe,
  onExtract,
}) {
  return (
    <div className={`create-fab${open ? ' is-open' : ''}${sink ? ' is-sink' : ''}`}>
      <ZhuoquInkDefs />
      <div
        className="create-fab__menu"
        role="menu"
        aria-label="创作"
        aria-hidden={!open}
      >
        <button
          type="button"
          role="menuitem"
          className="create-fab__choice"
          tabIndex={open ? 0 : -1}
          onClick={onShengSe}
        >
          <IconShengSe />
          <span>生色</span>
        </button>
        <button
          type="button"
          role="menuitem"
          className="create-fab__choice"
          tabIndex={open ? 0 : -1}
          onClick={onExtract}
        >
          <IconExtract />
          <span>取色</span>
        </button>
      </div>
      <button
        type="button"
        className="create-fab__plus"
        onClick={onToggle}
        aria-label={open ? '收起创作' : '创作色卡'}
        aria-expanded={open}
      >
        <Plus size={24} strokeWidth={1.7} />
      </button>
    </div>
  );
}
