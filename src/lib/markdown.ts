/**
 * Simple markdown-to-HTML converter for MVP.
 * Handles: headers, bold, italic, code, links, lists, blockquotes, horizontal rules, paragraphs.
 */
export function markdownToHtml(md: string): string {
  let html = md;

  // Escape HTML entities (but not our generated tags)
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    return `<pre class="bg-slate-900 rounded-lg p-4 my-4 overflow-x-auto text-sm"><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-emerald-400">$1</code>');

  // Headers
  html = html.replace(/^######\s+(.+)$/gm, '<h6 class="text-lg font-semibold mt-6 mb-2 text-slate-200">$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5 class="text-xl font-semibold mt-6 mb-2 text-slate-200">$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4 class="text-2xl font-semibold mt-6 mb-2 text-slate-200">$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3 class="text-2xl font-bold mt-8 mb-3 text-slate-100">$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2 class="text-3xl font-bold mt-10 mb-4 text-white">$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1 class="text-4xl font-bold mt-10 mb-4 text-white">$1</h1>');

  // Horizontal rules
  html = html.replace(/^(---|\*\*\*|___)\s*$/gm, '<hr class="border-slate-700 my-8" />');

  // Blockquotes
  html = html.replace(/^&gt;\s+(.+)$/gm, '<blockquote class="border-l-4 border-emerald-500 pl-4 my-4 text-slate-400 italic">$1</blockquote>');

  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-100">$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del class="text-slate-500">$1</del>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-emerald-400 hover:text-emerald-300 underline" target="_blank" rel="noopener noreferrer">$1</a>');

  // Unordered lists
  html = html.replace(/^[\*\-]\s+(.+)$/gm, '<li class="ml-4 text-slate-300">$1</li>');
  html = html.replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul class="list-disc my-4 space-y-1">$1</ul>');

  // Ordered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-4 text-slate-300">$1</li>');

  // Paragraphs: double newline separated blocks
  html = html.replace(/\n\n(?!<)/g, '</p><p class="my-4 text-slate-300 leading-relaxed">');

  // Single newlines to <br> (only if not already inside a tag)
  html = html.replace(/(?<!>)\n(?!<)/g, '<br/>');

  // Wrap in paragraph if not already wrapped
  if (!html.startsWith('<')) {
    html = `<p class="my-4 text-slate-300 leading-relaxed">${html}</p>`;
  }

  return html;
}
