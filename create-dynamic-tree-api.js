const fs = require('fs');
const path = require('path');

// Создаем API для динамического дерева
const apiContent = `import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const objectId = searchParams.get('objectId');

    if (!objectId) {
      return NextResponse.json({ error: 'objectId is required' }, { status: 400 });
    }

    // Получаем все записи для объекта
    const records = await prisma.objectStructure.findMany({
      where: { objectId },
      orderBy: [
        { siteName: 'asc' },
        { zoneName: 'asc' },
        { roomGroupName: 'asc' },
        { roomName: 'asc' },
        { cleaningObjectName: 'asc' },
        { techCardName: 'asc' }
      ]
    });

    // Строим динамическое дерево
    const tree = buildDynamicTree(records);

    return NextResponse.json({
      success: true,
      data: tree,
      totalRecords: records.length
    });

  } catch (error) {
    console.error('Error building dynamic tree:', error);
    return NextResponse.json(
      { error: 'Failed to build dynamic tree' },
      { status: 500 }
    );
  }
}

function buildDynamicTree(records: any[]) {
  const tree: any = {};

  records.forEach(record => {
    // Определяем путь в дереве на основе заполненных полей
    const path = [];
    
    if (record.siteName) path.push({ type: 'site', name: record.siteName, id: record.siteId });
    if (record.zoneName) path.push({ type: 'zone', name: record.zoneName, id: record.zoneId });
    if (record.roomGroupName) path.push({ type: 'roomGroup', name: record.roomGroupName, id: record.roomGroupId });
    if (record.roomName) path.push({ type: 'room', name: record.roomName, id: record.roomId });
    if (record.cleaningObjectName) path.push({ type: 'cleaningObject', name: record.cleaningObjectName, id: record.cleaningObjectId });
    
    // Техкарта всегда есть
    path.push({ 
      type: 'techCard', 
      name: record.techCardName, 
      id: record.techCardId,
      frequency: record.frequency,
      workType: record.workType,
      description: record.description,
      notes: record.notes,
      period: record.period
    });

    // Строим дерево по пути
    let current = tree;
    
    path.forEach((node, index) => {
      const key = \`\${node.type}:\${node.name}\`;
      
      if (!current[key]) {
        current[key] = {
          type: node.type,
          name: node.name,
          id: node.id,
          children: {},
          // Дополнительные поля для техкарт
          ...(node.type === 'techCard' && {
            frequency: node.frequency,
            workType: node.workType,
            description: node.description,
            notes: node.notes,
            period: node.period
          })
        };
      }
      
      current = current[key].children;
    });
  });

  return convertTreeToArray(tree);
}

function convertTreeToArray(tree: any): any[] {
  return Object.values(tree).map((node: any) => ({
    ...node,
    children: node.children && Object.keys(node.children).length > 0 
      ? convertTreeToArray(node.children) 
      : []
  }));
}
`;

// Создаем директорию API если не существует
const apiDir = path.join(__dirname, 'src', 'app', 'api', 'object-structure');
if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
}

// Записываем API файл
fs.writeFileSync(path.join(apiDir, 'route.ts'), apiContent);

// Создаем компонент для отображения динамического дерева
const componentContent = `'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, FileText, Clock, AlertCircle } from 'lucide-react';

interface TreeNode {
  type: string;
  name: string;
  id: string;
  children: TreeNode[];
  frequency?: string;
  workType?: string;
  description?: string;
  notes?: string;
  period?: string;
}

interface DynamicObjectTreeProps {
  objectId: string;
}

export default function DynamicObjectTree({ objectId }: DynamicObjectTreeProps) {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTreeData();
  }, [objectId]);

  const fetchTreeData = async () => {
    try {
      setLoading(true);
      const response = await fetch(\`/api/object-structure?objectId=\${objectId}\`);
      const result = await response.json();

      if (result.success) {
        setTreeData(result.data);
        // Автоматически раскрываем первый уровень
        const firstLevelKeys = result.data.map((node: TreeNode) => \`\${node.type}:\${node.name}\`);
        setExpandedNodes(new Set(firstLevelKeys));
      } else {
        setError(result.error || 'Failed to load tree data');
      }
    } catch (err) {
      setError('Network error');
      console.error('Error fetching tree data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (nodeKey: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeKey)) {
      newExpanded.delete(nodeKey);
    } else {
      newExpanded.add(nodeKey);
    }
    setExpandedNodes(newExpanded);
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'site': return '🏗️';
      case 'zone': return '📍';
      case 'roomGroup': return '📦';
      case 'room': return '🏠';
      case 'cleaningObject': return '📋';
      case 'techCard': return '🔧';
      default: return '📄';
    }
  };

  const getNodeLabel = (type: string) => {
    switch (type) {
      case 'site': return 'Участок';
      case 'zone': return 'Зона';
      case 'roomGroup': return 'Группа помещений';
      case 'room': return 'Помещение';
      case 'cleaningObject': return 'Объект уборки';
      case 'techCard': return 'Техкарта';
      default: return type;
    }
  };

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'DAILY': return 'text-red-600 bg-red-50';
      case 'WEEKLY': return 'text-orange-600 bg-orange-50';
      case 'MONTHLY': return 'text-blue-600 bg-blue-50';
      case 'QUARTERLY': return 'text-green-600 bg-green-50';
      case 'ON_DEMAND': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const renderNode = (node: TreeNode, level: number = 0) => {
    const nodeKey = \`\${node.type}:\${node.name}\`;
    const isExpanded = expandedNodes.has(nodeKey);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={nodeKey} className="select-none">
        <div 
          className={\`flex items-center py-2 px-3 hover:bg-gray-50 cursor-pointer rounded-md transition-colors\`}
          style={{ marginLeft: \`\${level * 20}px\` }}
          onClick={() => hasChildren && toggleNode(nodeKey)}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 mr-2 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 mr-2 text-gray-500" />
            )
          ) : (
            <div className="w-4 h-4 mr-2" />
          )}
          
          <span className="mr-2">{getNodeIcon(node.type)}</span>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{node.name}</span>
              
              {node.type === 'techCard' && node.frequency && (
                <span className={\`px-2 py-1 text-xs rounded-full \${getFrequencyColor(node.frequency)}\`}>
                  {node.frequency}
                </span>
              )}
            </div>
            
            {node.type === 'techCard' && (
              <div className="mt-1 text-sm text-gray-600">
                {node.description && (
                  <div className="flex items-start gap-1">
                    <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{node.description}</span>
                  </div>
                )}
                
                {node.notes && (
                  <div className="flex items-start gap-1 mt-1">
                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span className="text-amber-600">{node.notes}</span>
                  </div>
                )}
                
                {node.period && (
                  <div className="flex items-start gap-1 mt-1">
                    <Clock className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span className="text-blue-600">{node.period}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Загрузка структуры...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">Ошибка: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Структура объекта</h3>
        <p className="text-sm text-gray-600">
          Динамическое дерево показывает только заполненные уровни
        </p>
      </div>
      
      <div className="p-4 max-h-96 overflow-y-auto">
        {treeData.length > 0 ? (
          treeData.map(node => renderNode(node))
        ) : (
          <div className="text-center text-gray-500 py-8">
            Нет данных для отображения
          </div>
        )}
      </div>
    </div>
  );
}
`;

// Создаем директорию компонентов если не существует
const componentsDir = path.join(__dirname, 'src', 'components');
if (!fs.existsSync(componentsDir)) {
  fs.mkdirSync(componentsDir, { recursive: true });
}

// Записываем компонент
fs.writeFileSync(path.join(componentsDir, 'DynamicObjectTree.tsx'), componentContent);

console.log('✅ Созданы файлы:');
console.log('📁 /src/app/api/object-structure/route.ts');
console.log('📁 /src/components/DynamicObjectTree.tsx');
console.log('');
console.log('🎯 Теперь можно использовать компонент:');
console.log('<DynamicObjectTree objectId="your-object-id" />');
console.log('');
console.log('🏗️ Компонент автоматически:');
console.log('- Показывает только заполненные уровни');
console.log('- Строит раскрывающееся дерево');
console.log('- Отображает техкарты с периодичностью и примечаниями');
console.log('- Поддерживает все варианты структуры от 2 до 7 уровней');
