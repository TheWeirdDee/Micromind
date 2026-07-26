'use client';

import { useParams } from 'next/navigation';
import { JournalEntryEditor } from '@/components/app/JournalEntryEditor';

export default function JournalEntryPage() {
  const params = useParams();
  const id = params.id as string;
  return <JournalEntryEditor mode="edit" entryId={id} />;
}
