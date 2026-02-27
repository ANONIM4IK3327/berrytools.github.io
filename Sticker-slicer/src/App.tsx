import { useState, useRef, useCallback, useEffect } from 'react';
import JSZip from 'jszip';
import {
  Sun, Moon, Upload, Scissors, Download, Package, Check,
  Grid3X3, List, Info, X, Languages, HelpCircle,
  ArrowUpDown, CheckSquare, Square, Trash2
} from 'lucide-react';
import translations, { type Lang, type Translations } from './i18n';

// ─── Types ───────────────────────────────────────────────────────────────
interface StickerBounds { x: number; y: number; w: number; h: number }
interface StickerItem { bounds: StickerBounds; blob: Blob; url: string; selected: boolean }
type SortMode = 'default' | 'size-desc' | 'size-asc';
type ViewMode = 'grid' | 'list';

// ─── Helpers ─────────────────────────────────────────────────────────────
function findBounds(
  startX: number, startY: number,
  width: number, height: number,
  data: Uint8ClampedArray, visited: Uint8Array, threshold: number
): StickerBounds {
  let minX = startX, maxX = startX, minY = startY, maxY = startY;
  const stack: [number, number][] = [[startX, startY]];
  visited[startY * width + startX] = 1;
  const dirs: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;

    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIdx = ny * width + nx;
        if (!visited[nIdx] && data[nIdx * 4 + 3] >= threshold) {
          visited[nIdx] = 1;
          stack.push([nx, ny]);
        }
      }
    }
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function sortStickers(stickers: StickerItem[], mode: SortMode): StickerItem[] {
  const sorted = [...stickers];
  if (mode === 'size-desc') sorted.sort((a, b) => (b.bounds.w * b.bounds.h) - (a.bounds.w * a.bounds.h));
  else if (mode === 'size-asc') sorted.sort((a, b) => (a.bounds.w * a.bounds.h) - (b.bounds.w * b.bounds.h));
  return sorted;
}

// ─── Main App ────────────────────────────────────────────────────────────
export default function App() {
  // Persisted state
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('lang') as Lang) || 'ru');

  // Image state
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string>('');
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [status, setStatus] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Controls
  const [threshold, setThreshold] = useState(15);
  const [minSize, setMinSize] = useState(20);
  const [padding, setPadding] = useState(2);
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showAbout, setShowAbout] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const t: Translations = translations[lang];

  // Persist theme / lang
  useEffect(() => { localStorage.setItem('theme', dark ? 'dark' : 'light'); }, [dark]);
  useEffect(() => { localStorage.setItem('lang', lang); }, [lang]);

  // ─── File handling ──────────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setOriginalImage(img);
        setOriginalPreviewUrl(e.target!.result as string);
        setStickers([]);
        setStatus(t.loaded(img.width, img.height));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  }, [t]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  // ─── Process image ─────────────────────────────────────────────────
  const processImage = useCallback(async () => {
    if (!originalImage) return;
    setProcessing(true);
    setStickers([]);
    setStatus(t.searching);

    await new Promise(r => setTimeout(r, 50)); // let UI update

    const width = originalImage.width;
    const height = originalImage.height;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(originalImage, 0, 0);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const visited = new Uint8Array(width * height);
    const foundBounds: StickerBounds[] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (data[idx * 4 + 3] >= threshold && !visited[idx]) {
          const bounds = findBounds(x, y, width, height, data, visited, threshold);
          if (bounds.w >= minSize && bounds.h >= minSize) {
            foundBounds.push(bounds);
          }
        }
      }
    }

    if (foundBounds.length === 0) {
      setStatus(t.notFound);
      setProcessing(false);
      return;
    }

    // Cut stickers
    const items: StickerItem[] = [];
    for (const b of foundBounds) {
      const pad = padding;
      const sx = Math.max(0, b.x - pad);
      const sy = Math.max(0, b.y - pad);
      const sw = Math.min(width - sx, b.w + pad * 2);
      const sh = Math.min(height - sy, b.h + pad * 2);

      const c = document.createElement('canvas');
      c.width = sw;
      c.height = sh;
      const sCtx = c.getContext('2d')!;
      sCtx.drawImage(originalImage, sx, sy, sw, sh, 0, 0, sw, sh);

      const blob: Blob = await new Promise(res => c.toBlob(b => res(b!), 'image/png'));
      const url = URL.createObjectURL(blob);
      items.push({ bounds: { x: sx, y: sy, w: sw, h: sh }, blob, url, selected: true });
    }

    setStickers(items);
    setStatus(t.done(items.length));
    setProcessing(false);
  }, [originalImage, threshold, minSize, padding, t]);

  // ─── Selection helpers ─────────────────────────────────────────────
  const toggleSelect = (i: number) =>
    setStickers(prev => prev.map((s, idx) => idx === i ? { ...s, selected: !s.selected } : s));
  const selectAll = () => setStickers(prev => prev.map(s => ({ ...s, selected: true })));
  const deselectAll = () => setStickers(prev => prev.map(s => ({ ...s, selected: false })));
  const deleteSelected = () => {
    setStickers(prev => {
      const remaining = prev.filter(s => !s.selected);
      return remaining;
    });
  };
  const selectedCount = stickers.filter(s => s.selected).length;

  // ─── Download ZIP ──────────────────────────────────────────────────
  const downloadZip = useCallback(async () => {
    const selected = stickers.filter(s => s.selected);
    if (selected.length === 0) return;

    const zip = new JSZip();
    selected.forEach((item, i) => {
      zip.file(`sticker_${i + 1}.png`, item.blob);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'stickers_pack.zip';
    link.click();
    URL.revokeObjectURL(url);
  }, [stickers]);

  // ─── Sorted stickers ──────────────────────────────────────────────
  const displayStickers = sortStickers(stickers, sortMode);

  // ─── Clear / Reset ────────────────────────────────────────────────
  const clearAll = () => {
    setOriginalImage(null);
    setOriginalPreviewUrl('');
    setStickers([]);
    setStatus('');
  };

  // ─── Theme classes ────────────────────────────────────────────────
  const bg = dark ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900';
  const card = dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100';
  const cardHover = dark ? 'hover:bg-gray-800' : 'hover:bg-gray-50';
  const inputBg = dark ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900';
  const dropBg = dark
    ? `border-gray-700 ${dragOver ? 'border-blue-400 bg-blue-950/30' : 'bg-gray-900 hover:border-blue-500'}`
    : `border-gray-300 ${dragOver ? 'border-blue-500 bg-blue-50' : 'bg-white hover:border-blue-500'}`;
  const muted = dark ? 'text-gray-400' : 'text-gray-500';
  const mutedBg = dark ? 'bg-gray-800' : 'bg-gray-100';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${bg}`}>
      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav className={`sticky top-0 z-50 backdrop-blur-xl border-b ${dark ? 'bg-gray-950/80 border-gray-800' : 'bg-white/80 border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✂️</span>
            <span className="font-black text-lg tracking-tight">{t.title}</span>
          </div>
          <div className="flex items-center gap-1">
            {/* About */}
            <button
              onClick={() => setShowAbout(true)}
              className={`p-2 rounded-xl transition-colors ${cardHover} ${muted}`}
              title={t.aboutTitle}
            >
              <HelpCircle size={18} />
            </button>
            {/* Language toggle */}
            <button
              onClick={() => setLang(l => l === 'ru' ? 'en' : 'ru')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors ${cardHover} ${muted}`}
            >
              <Languages size={16} />
              <span className="uppercase">{lang}</span>
            </button>
            {/* Theme toggle */}
            <button
              onClick={() => setDark(d => !d)}
              className={`p-2 rounded-xl transition-colors ${cardHover}`}
              title={t.theme}
            >
              {dark ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-gray-500" />}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-3 bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            {t.title}
          </h1>
          <p className={`text-lg ${muted}`}>{t.subtitle}</p>
        </header>

        {/* ── Drop zone ──────────────────────────────────────────── */}
        <div
          className={`relative border-4 border-dashed rounded-3xl p-12 text-center mb-8 cursor-pointer transition-all group ${dropBg}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          {originalPreviewUrl ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="transparency-grid rounded-2xl overflow-hidden inline-block">
                  <img src={originalPreviewUrl} alt="original" className="max-h-48 object-contain" />
                </div>
                <button
                  onClick={e => { e.stopPropagation(); clearAll(); }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <p className={`text-sm ${muted}`}>{t.previewOriginal} • {originalImage?.width}×{originalImage?.height}</p>
              <p className={`text-xs ${muted}`}>{t.dropTitle}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform ${dark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                <Upload size={36} className="text-blue-500" />
              </div>
              <p className={`text-xl font-medium ${dark ? 'text-gray-200' : 'text-gray-700'}`}>
                {dragOver ? t.dragActive : t.dropTitle}
              </p>
              <p className={`text-sm ${muted}`}>{t.dropHint}</p>
            </div>
          )}
        </div>

        {/* ── Controls ───────────────────────────────────────────── */}
        <div className={`${card} border p-6 rounded-3xl shadow-sm mb-8`}>
          <div className="flex flex-wrap gap-6 items-end justify-between">
            <div className="flex flex-wrap gap-6">
              {/* Threshold */}
              <div className="flex flex-col gap-1.5">
                <label className={`text-xs font-bold uppercase ${muted}`}>{t.sensitivity}</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={1} max={255} value={threshold}
                    onChange={e => setThreshold(+e.target.value)}
                    className="w-40 h-2 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    style={{ background: dark ? '#374151' : '#e5e7eb' }}
                  />
                  <span className={`text-sm font-mono w-8 text-right ${muted}`}>{threshold}</span>
                </div>
              </div>
              {/* Min size */}
              <div className="flex flex-col gap-1.5">
                <label className={`text-xs font-bold uppercase ${muted}`}>{t.minSize}</label>
                <input
                  type="number" value={minSize}
                  onChange={e => setMinSize(+e.target.value)}
                  className={`border-2 rounded-xl px-3 py-1.5 w-24 outline-none transition-colors focus:border-blue-500 ${inputBg}`}
                />
              </div>
              {/* Padding */}
              <div className="flex flex-col gap-1.5">
                <label className={`text-xs font-bold uppercase ${muted}`}>{t.padding}</label>
                <input
                  type="number" value={padding} min={0} max={50}
                  onChange={e => setPadding(+e.target.value)}
                  className={`border-2 rounded-xl px-3 py-1.5 w-24 outline-none transition-colors focus:border-blue-500 ${inputBg}`}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={processImage}
                disabled={!originalImage || processing}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-30 flex items-center gap-2"
              >
                {processing ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <Scissors size={18} />
                )}
                <span>{processing ? t.processing : t.process}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Status ─────────────────────────────────────────────── */}
        {status && (
          <div className={`mb-6 p-4 rounded-2xl text-center font-medium ${processing ? 'animate-pulse' : ''} ${dark ? 'bg-blue-950/50 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
            {status}
          </div>
        )}

        {/* ── Toolbar ────────────────────────────────────────────── */}
        {stickers.length > 0 && (
          <div className={`${card} border p-4 rounded-2xl shadow-sm mb-6 flex flex-wrap gap-3 items-center justify-between`}>
            <div className="flex flex-wrap items-center gap-3">
              {/* Select controls */}
              <button
                onClick={selectedCount === stickers.length ? deselectAll : selectAll}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${mutedBg} ${cardHover}`}
              >
                {selectedCount === stickers.length ? <CheckSquare size={15} /> : <Square size={15} />}
                <span>{selectedCount === stickers.length ? t.deselectAll : t.selectAll}</span>
              </button>

              {selectedCount > 0 && (
                <button
                  onClick={deleteSelected}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              )}

              <span className={`text-sm ${muted}`}>
                {t.selected(selectedCount)} / {t.totalStickers(stickers.length)}
              </span>

              {/* Sort */}
              <div className="relative">
                <button
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${mutedBg} ${cardHover}`}
                  onClick={() => {
                    const modes: SortMode[] = ['default', 'size-desc', 'size-asc'];
                    const idx = modes.indexOf(sortMode);
                    setSortMode(modes[(idx + 1) % modes.length]);
                  }}
                >
                  <ArrowUpDown size={14} />
                  <span>{sortMode === 'default' ? t.sortDefault : sortMode === 'size-desc' ? t.sortSizeLarge : t.sortSizeSmall}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* View mode */}
              <div className={`flex rounded-lg overflow-hidden border ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : mutedBg}`}
                >
                  <Grid3X3 size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : mutedBg}`}
                >
                  <List size={16} />
                </button>
              </div>

              {/* Download ZIP */}
              <button
                onClick={downloadZip}
                disabled={selectedCount === 0}
                className="bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-600 transition-colors disabled:opacity-30 flex items-center gap-2"
              >
                <Package size={16} />
                <span>{t.downloadAll}</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Results Grid ───────────────────────────────────────── */}
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5'
          : 'flex flex-col gap-3'
        }>
          {displayStickers.map((sticker, i) => {
            const globalIdx = stickers.indexOf(sticker);
            return viewMode === 'grid' ? (
              <div
                key={globalIdx}
                className={`group relative ${card} border p-4 rounded-2xl shadow-sm flex flex-col items-center transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${sticker.selected ? 'ring-2 ring-blue-500' : ''}`}
              >
                {/* Selection checkbox */}
                <button
                  onClick={() => toggleSelect(globalIdx)}
                  className={`absolute top-2 left-2 p-1 rounded-lg transition-all ${sticker.selected
                    ? 'bg-blue-500 text-white'
                    : `${mutedBg} ${muted} opacity-0 group-hover:opacity-100`
                  }`}
                >
                  {sticker.selected ? <Check size={14} /> : <Square size={14} />}
                </button>

                <div className="transparency-grid rounded-xl mb-3 w-full aspect-square flex items-center justify-center overflow-hidden">
                  <img src={sticker.url} className="max-w-full max-h-full object-contain p-1" alt={`sticker ${i + 1}`} />
                </div>
                <div className={`text-[10px] font-mono mb-2 uppercase ${muted}`}>
                  {sticker.bounds.w}×{sticker.bounds.h} px
                </div>
                <a
                  href={sticker.url}
                  download={`sticker_${globalIdx + 1}.png`}
                  className={`w-full text-center py-2 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-1.5 ${dark ? 'bg-gray-800 hover:bg-blue-600 text-blue-400 hover:text-white' : 'bg-gray-50 hover:bg-blue-50 text-blue-600'}`}
                >
                  <Download size={14} />
                  {t.download}
                </a>
              </div>
            ) : (
              <div
                key={globalIdx}
                className={`group flex items-center gap-4 ${card} border p-3 rounded-2xl shadow-sm transition-all ${sticker.selected ? 'ring-2 ring-blue-500' : ''}`}
              >
                <button onClick={() => toggleSelect(globalIdx)} className={`p-1.5 rounded-lg transition-colors ${sticker.selected ? 'bg-blue-500 text-white' : `${mutedBg} ${muted}`}`}>
                  {sticker.selected ? <Check size={14} /> : <Square size={14} />}
                </button>
                <div className="transparency-grid rounded-lg w-16 h-16 flex items-center justify-center overflow-hidden shrink-0">
                  <img src={sticker.url} className="max-w-full max-h-full object-contain" alt="" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">sticker_{globalIdx + 1}.png</p>
                  <p className={`text-xs ${muted}`}>{sticker.bounds.w}×{sticker.bounds.h} px</p>
                </div>
                <a
                  href={sticker.url}
                  download={`sticker_${globalIdx + 1}.png`}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                >
                  <Download size={14} />
                  {t.download}
                </a>
              </div>
            );
          })}
        </div>

        {/* ── Help tip ────────────────────────────────────────────── */}
        {!originalImage && stickers.length === 0 && (
          <div className={`mt-12 max-w-xl mx-auto text-center ${muted}`}>
            <Info size={24} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm leading-relaxed">{t.helpTip}</p>
          </div>
        )}
      </div>

      {/* ── About Modal ────────────────────────────────────────────── */}
      {showAbout && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowAbout(false)}>
          <div className={`${card} border rounded-3xl p-8 max-w-md w-full shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{t.aboutTitle}</h2>
              <button onClick={() => setShowAbout(false)} className={`p-1.5 rounded-xl ${cardHover}`}><X size={18} /></button>
            </div>
            <p className={`leading-relaxed ${muted}`}>{t.aboutText}</p>
            <div className="mt-6 text-center">
              <span className={`text-xs ${muted}`}>Made with ❤️ • Sticker Slicer Pro</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
