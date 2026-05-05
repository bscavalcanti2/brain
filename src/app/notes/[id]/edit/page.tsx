import NoteEditor from '@/components/NoteEditor';

export default function EditNotePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div>
      <NoteEditorWrapper params={params} />
    </div>
  );
}

import { use } from 'react';

function NoteEditorWrapper({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <NoteEditor mode="edit" noteId={id} />;
}
