import React from 'react';
import { Link } from '@tanstack/react-router';

export const TermsLink: React.FC<{ className?: string }> = ({ className }) => (
  <Link to="/terms" className={className ?? 'text-blue-400 hover:text-blue-300 underline'}>
    Términos y condiciones
  </Link>
);
