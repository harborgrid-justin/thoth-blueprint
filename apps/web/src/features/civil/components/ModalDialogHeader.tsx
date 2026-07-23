import React from 'react';
import { CIVIL_STYLES } from '../styles/civilDesignSystem';

export interface ModalDialogHeaderProps {
  title: string;
  colorClass?: string;
  badgeText?: string;
  onClose: () => void;
}

export const ModalDialogHeader: React.FC<ModalDialogHeaderProps> = ({
  title,
  colorClass = 'text-cyan-400',
  badgeText,
  onClose,
}) => {
  return (
    <div className={CIVIL_STYLES.sectionHeaderContainer}>
      <div className="flex items-center gap-2">
        <div className={`${CIVIL_STYLES.titlePulseDot} ${colorClass}`} />
        <h3 className={`text-base font-semibold ${colorClass}`}>{title}</h3>
        {badgeText && (
          <span className={CIVIL_STYLES.badgeDefault}>
            {badgeText}
          </span>
        )}
      </div>
      <button
        onClick={onClose}
        className="text-muted-foreground hover:text-white font-bold text-lg transition"
        title="Close Dialog"
      >
        ✕
      </button>
    </div>
  );
};
