export type Lang = 'ru' | 'en';

export interface Translations {
  title: string;
  subtitle: string;
  dropTitle: string;
  dropHint: string;
  sensitivity: string;
  minSize: string;
  padding: string;
  process: string;
  downloadAll: string;
  download: string;
  compressing: string;
  searching: string;
  notFound: string;
  loaded: (w: number, h: number) => string;
  done: (count: number) => string;
  theme: string;
  lang: string;
  light: string;
  dark: string;
  dragActive: string;
  previewOriginal: string;
  selectAll: string;
  deselectAll: string;
  selected: (n: number) => string;
  sortBy: string;
  sortDefault: string;
  sortSizeLarge: string;
  sortSizeSmall: string;
  totalStickers: (n: number) => string;
  zoomIn: string;
  zoomOut: string;
  resetZoom: string;
  gridView: string;
  listView: string;
  processing: string;
  aboutTitle: string;
  aboutText: string;
  helpTip: string;
}

const translations: Record<Lang, Translations> = {
  ru: {
    title: 'Sticker Slicer Pro',
    subtitle: 'Автоматическая нарезка атласа без сеток и рутины',
    dropTitle: 'Перетащите атлас сюда или кликните для выбора',
    dropHint: 'Поддерживаются PNG, JPG, WebP',
    sensitivity: 'Чувствительность (Alpha)',
    minSize: 'Мин. размер (пикс)',
    padding: 'Отступ (пикс)',
    process: 'Нарезать',
    downloadAll: 'Скачать всё (.ZIP)',
    download: 'Скачать',
    compressing: '⏳ Сжимаю...',
    searching: '🔍 Ищу стикеры...',
    notFound: '❌ Ничего не найдено. Попробуйте уменьшить чувствительность.',
    loaded: (w, h) => `✅ Атлас загружен (${w}×${h})`,
    done: (count) => `🚀 Готово! Нарезано стикеров: ${count}`,
    theme: 'Тема',
    lang: 'Язык',
    light: 'Светлая',
    dark: 'Тёмная',
    dragActive: 'Отпустите файл!',
    previewOriginal: 'Оригинал',
    selectAll: 'Выбрать все',
    deselectAll: 'Снять выбор',
    selected: (n) => `Выбрано: ${n}`,
    sortBy: 'Сортировка',
    sortDefault: 'По умолчанию',
    sortSizeLarge: 'По размеру ↓',
    sortSizeSmall: 'По размеру ↑',
    totalStickers: (n) => `Всего: ${n}`,
    zoomIn: 'Увеличить',
    zoomOut: 'Уменьшить',
    resetZoom: 'Сброс',
    gridView: 'Сетка',
    listView: 'Список',
    processing: 'Обработка...',
    aboutTitle: 'О приложении',
    aboutText: 'Sticker Slicer Pro автоматически находит и вырезает отдельные элементы из атласа (sprite sheet) на прозрачном фоне. Идеально для нарезки стикеров, иконок и спрайтов.',
    helpTip: 'Загрузите изображение с прозрачным фоном (PNG). Алгоритм найдёт все непрозрачные области и вырежет их в отдельные файлы.',
  },
  en: {
    title: 'Sticker Slicer Pro',
    subtitle: 'Automatic atlas slicing without grids and hassle',
    dropTitle: 'Drag & drop your atlas here or click to browse',
    dropHint: 'Supports PNG, JPG, WebP',
    sensitivity: 'Sensitivity (Alpha)',
    minSize: 'Min size (px)',
    padding: 'Padding (px)',
    process: 'Slice',
    downloadAll: 'Download all (.ZIP)',
    download: 'Download',
    compressing: '⏳ Compressing...',
    searching: '🔍 Searching for stickers...',
    notFound: '❌ Nothing found. Try lowering sensitivity.',
    loaded: (w, h) => `✅ Atlas loaded (${w}×${h})`,
    done: (count) => `🚀 Done! Stickers found: ${count}`,
    theme: 'Theme',
    lang: 'Language',
    light: 'Light',
    dark: 'Dark',
    dragActive: 'Drop the file!',
    previewOriginal: 'Original',
    selectAll: 'Select all',
    deselectAll: 'Deselect all',
    selected: (n) => `Selected: ${n}`,
    sortBy: 'Sort',
    sortDefault: 'Default',
    sortSizeLarge: 'Size ↓',
    sortSizeSmall: 'Size ↑',
    totalStickers: (n) => `Total: ${n}`,
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    resetZoom: 'Reset',
    gridView: 'Grid',
    listView: 'List',
    processing: 'Processing...',
    aboutTitle: 'About',
    aboutText: 'Sticker Slicer Pro automatically finds and cuts individual elements from a sprite sheet with transparent background. Perfect for slicing stickers, icons and sprites.',
    helpTip: 'Upload an image with a transparent background (PNG). The algorithm will find all opaque regions and cut them into separate files.',
  },
};

export default translations;
