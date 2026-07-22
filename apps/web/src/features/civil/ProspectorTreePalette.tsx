import React, { useState } from 'react';
import type { ProspectorNode } from './types';
import { getTreeIndentStyle, CIVIL_STYLES } from './styles/civilDesignSystem';

export const ProspectorTreePalette: React.FC = () => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'node-sites': true,
    'node-pointgroups': true,
    'node-vfg': true,
    'node-surfaces': true,
  });

  const toggleNode = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const prospectorData: ProspectorNode[] = [
    {
      id: 'node-pointgroups',
      label: 'Point Groups (REQ-007 to REQ-010, REQ-106)',
      type: 'folder',
      children: [
        { id: 'pg-1', label: '_All Points (Non-deletable default)', type: 'pointgroup', badge: 'Default' },
        { id: 'pg-2', label: 'ALL OFF (Point & label styles <none>)', type: 'pointgroup', badge: 'Hidden' },
        { id: 'pg-3', label: 'Trees & Vegetation (*TREE*)', type: 'pointgroup' },
        { id: 'pg-4', label: 'High Elevation Survey Control (>150ft)', type: 'pointgroup', badge: 'Query' },
      ],
    },
    {
      id: 'node-sites',
      label: 'Sites Container (REQ-023 to REQ-025)',
      type: 'folder',
      children: [
        {
          id: 'site-1',
          label: 'Site 1 - Subdivision Master',
          type: 'site',
          children: [
            { id: 's1-p1', label: 'Parcels (Lot 101 to Lot 115)', type: 'folder' },
            { id: 's1-fl', label: '3D Feature Lines & Ridge Lines', type: 'folder' },
          ],
        },
      ],
    },
    {
      id: 'node-vfg',
      label: 'View Frame Groups (REQ-060, REQ-142)',
      type: 'folder',
      children: [
        { id: 'vfg-1', label: 'Main Alignment VFG (Plan & Profile)', type: 'vfg', badge: '5 Sheets' },
      ],
    },
    {
      id: 'node-surfaces',
      label: 'Surfaces (REQ-096 to REQ-097, REQ-200)',
      type: 'folder',
      children: [
        { id: 'surf-1', label: 'Existing Ground TIN (Breaklines Active)', type: 'surface', badge: 'TIN' },
        { id: 'surf-2', label: 'Finished Grade Paste Composite', type: 'surface', badge: 'Pasted' },
      ],
    },
  ];

  const renderNode = (node: ProspectorNode, depth: number = 0) => {
    const isFolder = node.children && node.children.length > 0;
    const isExp = expanded[node.id];

    return (
      <div key={node.id} className="flex flex-col">
        <div
          onClick={() => isFolder && toggleNode(node.id)}
          style={getTreeIndentStyle(depth)}
          className="flex items-center justify-between py-1.5 px-2 hover:bg-slate-800/60 rounded cursor-pointer transition text-xs select-none"
        >
          <div className="flex items-center gap-1.5 text-slate-200">
            {isFolder ? (
              <span className="text-slate-400 font-mono text-[10px] w-3 text-center">
                {isExp ? '▼' : '►'}
              </span>
            ) : (
              <span className="w-3" />
            )}

            <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 002 2z" />
            </svg>

            <span className="font-medium text-slate-200">{node.label}</span>
          </div>

          {node.badge && (
            <span className={CIVIL_STYLES.badgeCyan}>
              {node.badge}
            </span>
          )}
        </div>

        {isFolder && isExp && (
          <div className="flex flex-col">
            {node.children!.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-72 bg-slate-900 border-r border-slate-800 text-slate-100 flex flex-col h-full shadow-2xl">
      <div className="p-3 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Prospector Tree</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">Civil 3D Suite</span>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-0.5">
        {prospectorData.map(node => renderNode(node, 0))}
      </div>
    </div>
  );
};
