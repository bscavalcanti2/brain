import { getNote, getBacklinks } from '@/app/actions';
import NoteViewClient from './NoteViewClient';
import { notFound } from 'next/navigation';

export default async function ViewNotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let note: Awaited<ReturnType<typeof getNote>>;
  let backlinks: Awaited<ReturnType<typeof getBacklinks>> = [];

  try {
    const [noteData, backlinkData] = await Promise.all([
      getNote(id),
      getBacklinks(id),
    ]);
    if (!noteData) notFound();
    note = noteData;
    backlinks = backlinkData;
  } catch {
    notFound();
  }

  return <NoteViewClient note={note} backlinks={backlinks} />;
}
