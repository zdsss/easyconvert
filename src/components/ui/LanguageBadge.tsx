export default function LanguageBadge({ lang }: { lang?: string | null }) {
  if (!lang || lang === 'unknown') return null;
  const map: Record<string, { label: string; cls: string }> = {
    zh: { label: 'ZH', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    en: { label: 'EN', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    ja: { label: 'JA', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  };
  const { label, cls } = map[lang] ?? { label: lang.toUpperCase(), cls: 'bg-surface-secondary text-text-secondary' };
  return <span className={`px-1.5 py-0.5 rounded text-xs font-mono font-semibold ${cls}`}>{label}</span>;
}
