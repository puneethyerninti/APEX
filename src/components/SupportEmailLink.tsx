import { SUPPORT_EMAIL } from '@/config/support';

export default function SupportEmailLink({ className = '', subject, children }: {
  className?: string;
  subject?: string;
  children?: React.ReactNode;
}) {
  const href = `mailto:${SUPPORT_EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
  return <a href={href} className={`break-words [overflow-wrap:anywhere] ${className}`}>{children || SUPPORT_EMAIL}</a>;
}
