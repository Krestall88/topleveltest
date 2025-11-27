'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface ManualSection {
  id: string;
  slug: string;
  title: string;
  icon: string | null;
  order: number;
  content?: string;
}

interface ManualScreenshot {
  id: string;
  number: number;
  filename: string;
  description: string;
  alt: string;
}

interface ManualViewerProps {
  isOpen: boolean;
  onClose: () => void;
  initialSlug?: string;
}

export default function ManualViewer({ isOpen, onClose, initialSlug }: ManualViewerProps) {
  const [sections, setSections] = useState<ManualSection[]>([]);
  const [currentSection, setCurrentSection] = useState<ManualSection | null>(null);
  const [screenshots, setScreenshots] = useState<ManualScreenshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Загрузка списка разделов
  useEffect(() => {
    if (isOpen) {
      fetchSections();
      fetchScreenshots();
    } else {
      setIsMobileMenuOpen(false);
    }
  }, [isOpen]);

  // Загрузка начального раздела
  useEffect(() => {
    if (sections.length > 0 && !currentSection) {
      const initialSection = initialSlug
        ? sections.find(s => s.slug === initialSlug)
        : sections[0];
      if (initialSection) {
        loadSection(initialSection.slug);
      }
    }
  }, [sections, initialSlug]);

  const fetchSections = async () => {
    try {
      const response = await fetch('/api/manual/sections');
      if (response.ok) {
        const data = await response.json();
        setSections(data);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const fetchScreenshots = async () => {
    try {
      const response = await fetch('/api/manual/screenshots');
      if (response.ok) {
        const data = await response.json();
        setScreenshots(data);
      }
    } catch (error) {
      console.error('Error fetching screenshots:', error);
    }
  };

  const loadSection = async (slug: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/manual/sections/${slug}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentSection(data);
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
          setIsMobileMenuOpen(false);
        }
      }
    } catch (error) {
      console.error('Error loading section:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateSection = (direction: 'prev' | 'next') => {
    if (!currentSection) return;
    
    const currentIndex = sections.findIndex(s => s.slug === currentSection.slug);
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex >= 0 && newIndex < sections.length) {
      loadSection(sections[newIndex].slug);
    }
  };

  // Компонент для отображения скриншота
  const ScreenshotComponent = ({ number }: { number: number }) => {
    const screenshot = screenshots.find(s => s.number === number);
    
    if (!screenshot) {
      return (
        <div className="my-4 p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-center">
          <p className="text-gray-500">📸 Скриншот #{number}</p>
          <p className="text-sm text-gray-400 mt-1">
            Поместите файл: screenshot-{String(number).padStart(3, '0')}.png
          </p>
        </div>
      );
    }

    const imagePath = `/manual/screenshots/${screenshot.filename}`;

    return (
      <div className="my-6">
        <div 
          className="relative border rounded-lg overflow-hidden bg-gray-50 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setSelectedImage(imagePath)}
        >
          <img
            src={imagePath}
            alt={screenshot.alt}
            className="w-full h-auto"
            onError={(e) => {
              // Если изображение не найдено, показываем placeholder
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.innerHTML = `
                <div class="p-8 text-center">
                  <p class="text-gray-500">📸 ${screenshot.description}</p>
                  <p class="text-sm text-gray-400 mt-2">Файл: ${screenshot.filename}</p>
                  <p class="text-xs text-gray-400 mt-1">Изображение не найдено</p>
                </div>
              `;
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            <p className="text-white text-sm flex items-center gap-2">
              <Maximize2 className="w-4 h-4" />
              {screenshot.description}
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Нажмите для увеличения
        </p>
      </div>
    );
  };

  // Обработка контента с заменой меток скриншотов
  const renderContent = (content: string) => {
    // Заменяем метки {{SCREENSHOT:N}} на компоненты
    const parts = content.split(/(\{\{SCREENSHOT:\d+\}\})/g);
    
    return parts.map((part, index) => {
      const match = part.match(/\{\{SCREENSHOT:(\d+)\}\}/);
      if (match) {
        const screenshotNumber = parseInt(match[1]);
        return <ScreenshotComponent key={`screenshot-${screenshotNumber}`} number={screenshotNumber} />;
      }
      
      return (
        <div key={`content-${index}`} className="prose prose-sm max-w-none">
          <ReactMarkdown
            components={{
            h1: ({ children }) => <h1 className="text-3xl font-bold mt-8 mb-4 text-gray-900">{children}</h1>,
            h2: ({ children }) => <h2 className="text-2xl font-bold mt-6 mb-3 text-gray-800">{children}</h2>,
            h3: ({ children }) => <h3 className="text-xl font-semibold mt-4 mb-2 text-gray-700">{children}</h3>,
            h4: ({ children }) => <h4 className="text-lg font-semibold mt-3 mb-2 text-gray-700">{children}</h4>,
            p: ({ children }) => <p className="mb-4 text-gray-700 leading-relaxed">{children}</p>,
            ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>,
            li: ({ children }) => <li className="text-gray-700">{children}</li>,
            code: ({ children, className }) => {
              const isInline = !className;
              return isInline ? (
                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-pink-600">
                  {children}
                </code>
              ) : (
                <code className={`block bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto ${className}`}>
                  {children}
                </code>
              );
            },
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 text-gray-700 italic">
                {children}
              </blockquote>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-gray-300">
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th className="border border-gray-300 bg-gray-100 px-4 py-2 text-left font-semibold">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-gray-300 px-4 py-2">
                {children}
              </td>
            ),
            a: ({ children, href }) => {
              // Обрабатываем внутренние ссылки на разделы
              if (href?.startsWith('./') || href?.includes('.md')) {
                const handleClick = (e: React.MouseEvent) => {
                  e.preventDefault();
                  
                  // Извлекаем slug из ссылки (например, ./02_УПРАВЛЕНИЕ_ОБЪЕКТАМИ.md -> 02-upravlenie-obektami)
                  const match = href.match(/\.\/(\d+)_([^.#]+)/);
                  if (match) {
                    const number = match[1];
                    const titlePart = match[2]
                      .toLowerCase()
                      .replace(/_/g, '-')
                      .replace(/а/g, 'a').replace(/б/g, 'b').replace(/в/g, 'v')
                      .replace(/г/g, 'g').replace(/д/g, 'd').replace(/е/g, 'e')
                      .replace(/ё/g, 'yo').replace(/ж/g, 'zh').replace(/з/g, 'z')
                      .replace(/и/g, 'i').replace(/й/g, 'y').replace(/к/g, 'k')
                      .replace(/л/g, 'l').replace(/м/g, 'm').replace(/н/g, 'n')
                      .replace(/о/g, 'o').replace(/п/g, 'p').replace(/р/g, 'r')
                      .replace(/с/g, 's').replace(/т/g, 't').replace(/у/g, 'u')
                      .replace(/ф/g, 'f').replace(/х/g, 'h').replace(/ц/g, 'ts')
                      .replace(/ч/g, 'ch').replace(/ш/g, 'sh').replace(/щ/g, 'sch')
                      .replace(/ъ/g, '').replace(/ы/g, 'y').replace(/ь/g, '')
                      .replace(/э/g, 'e').replace(/ю/g, 'yu').replace(/я/g, 'ya');
                    
                    const slug = `${number}-${titlePart}`;
                    const targetSection = sections.find(s => s.slug === slug);
                    
                    if (targetSection) {
                      loadSection(targetSection.slug);
                    }
                  }
                };
                
                return (
                  <a 
                    href="#" 
                    onClick={handleClick}
                    className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
                  >
                    {children}
                  </a>
                );
              }
              
              // Внешние ссылки открываем как обычно
              return (
                <a 
                  href={href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  {children}
                </a>
              );
            },
          }}
        >
          {part}
        </ReactMarkdown>
        </div>
      );
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-white z-50 flex flex-col lg:flex-row">
        {/* Мобильная шапка */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b bg-white">
          <div>
            <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <span>📚</span>
              Инструкция
            </p>
            <p className="text-xs text-gray-500">Руководство пользователя</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMobileMenuOpen(prev => !prev)}
            >
              {isMobileMenuOpen ? 'Скрыть разделы' : 'Разделы'}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Левое меню с разделами */}
        <div
          className={`bg-gray-50 flex flex-col border-b lg:border-b-0 lg:border-r w-full lg:w-80 lg:h-full
          ${isMobileMenuOpen ? 'flex' : 'hidden'} lg:flex`}
        >
          <div className="hidden lg:flex items-center justify-between p-4 border-b bg-white">
            <div>
              <h2 className="text-xl font-bold text-gray-900">📚 Инструкция</h2>
              <p className="text-sm text-gray-600">Руководство пользователя</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <ScrollArea className="flex-1 max-h-[50vh] lg:max-h-none">
            <div className="p-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => loadSection(section.slug)}
                  className={`w-full text-left p-3 rounded-lg mb-1 transition-colors ${
                    currentSection?.slug === section.slug
                      ? 'bg-blue-100 text-blue-900 font-semibold'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{section.icon}</span>
                    <span className="text-sm">{section.title}</span>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Основная область контента */}
        <div className="flex-1 flex flex-col min-h-0">
          {currentSection && (
            <div className="hidden lg:block p-4 border-b bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{currentSection.icon}</span>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {currentSection.title}
                  </h1>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateSection('prev')}
                    disabled={sections.findIndex(s => s.slug === currentSection.slug) === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Назад
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateSection('next')}
                    disabled={sections.findIndex(s => s.slug === currentSection.slug) === sections.length - 1}
                  >
                    Вперед
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {currentSection && (
            <div className="lg:hidden px-4 pt-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{currentSection.icon}</span>
                <h1 className="text-xl font-semibold text-gray-900">
                  {currentSection.title}
                </h1>
              </div>
            </div>
          )}

          {/* Контент раздела */}
          <ScrollArea className="flex-1">
            <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Загрузка...</p>
                </div>
              ) : currentSection?.content ? (
                renderContent(currentSection.content)
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">Выберите раздел из меню</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Модальное окно для увеличенного изображения */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
          <div className="relative bg-black">
            <div className="absolute top-2 right-2 z-10 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setImageZoom(Math.max(0.5, imageZoom - 0.25))}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setImageZoom(1)}
              >
                100%
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setImageZoom(Math.min(3, imageZoom + 0.25))}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
            <div className="overflow-auto max-h-[95vh] flex items-center justify-center p-4">
              {selectedImage && (
                <img
                  src={selectedImage}
                  alt="Увеличенное изображение"
                  style={{ transform: `scale(${imageZoom})` }}
                  className="transition-transform"
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
