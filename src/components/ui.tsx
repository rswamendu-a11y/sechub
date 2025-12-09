import React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={twMerge(
        "bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 transition-all",
        className
      )}
    >
      {children}
    </div>
  );
};

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }> = ({ className, variant = 'primary', ...props }) => {
  const base = "px-4 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700",
    secondary: "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-white",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
  };

  return <button className={twMerge(base, variants[variant], className)} {...props} />;
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => {
  return (
    <input
      className={twMerge(
        "w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-700 dark:text-white font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500 outline-none transition-colors",
        className
      )}
      {...props}
    />
  );
};

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className, ...props }) => {
  return (
    <select
      className={twMerge(
        "w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-700 dark:text-white font-bold text-sm border-none focus:ring-2 focus:ring-indigo-500 outline-none transition-colors",
        className
      )}
      {...props}
    />
  );
};
