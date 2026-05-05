import { getGraph } from '@/app/actions';
import Link from 'next/link';
import GraphPageClient from './GraphPageClient';

export default async function GraphPage() {
  let graph: Awaited<ReturnType<typeof getGraph>> | null = null;

  try {
    graph = await getGraph();
  } catch {
    // DB not configured yet
  }

  // Graph page needs full height — the parent Layout div has overflow-y-auto + padding.
  // We use a CSS trick to expand into the padded area and take full available height.
  return (
    <div className="h-full -m-4 lg:-m-6">
      <GraphPageClient graph={graph} />
    </div>
  );
}
