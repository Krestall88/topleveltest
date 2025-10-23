import DynamicObjectTree from '@/components/DynamicObjectTree';

export default function TestTreePage() {
  // ID объекта ООО «ПепсиКо Холдингс» с полной структурой
  const pepsiObjectId = 'cmgzb2qtl0001vy7s2wczkws4';

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Тест динамического дерева</h1>
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Объект: ООО «ПепсиКо Холдингс»</h2>
        <DynamicObjectTree objectId={pepsiObjectId} />
      </div>
    </div>
  );
}
