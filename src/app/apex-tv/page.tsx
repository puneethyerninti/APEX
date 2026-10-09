import type { Metadata } from 'next';
import ApexTv from '@/components/ApexTv';

export const metadata: Metadata = {
  title: 'APEX TV | APEX',
  description: 'APEX updates and advertisements on the official YouTube channel.',
};

export default function ApexTvPage() {
  return <ApexTv />;
}
