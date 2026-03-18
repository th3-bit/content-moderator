import fs from 'fs';

let content = fs.readFileSync('src/pages/ContentManagement.tsx', 'utf8');

// 1. Add grip icon
content = content.replace("  Search\n} from \"lucide-react\";", "  Search,\n  GripVertical\n} from \"lucide-react\";");

// 2. Add dnd-kit imports
const dndImports = `
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableRowProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

function SortableRow({ id, children, className, style, onClick }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const combinedStyle = {
    ...style,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: isDragging ? 'relative' : 'static',
    zIndex: isDragging ? 50 : 'auto',
  };
  return (
    <div ref={setNodeRef} style={combinedStyle} className={cn(className, "flex flex-row items-stretch")} onClick={onClick}>
      <div {...attributes} {...listeners} className="flex items-center justify-center px-1 cursor-grab active:cursor-grabbing hover:bg-white/10 transition-colors z-10" onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
        <GripVertical className="w-4 h-4 text-muted-foreground opacity-50 hover:opacity-100" />
      </div>
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
`;

content = content.replace('import { Skeleton } from "@/components/ui/skeleton";', dndImports + '\nimport { Skeleton } from "@/components/ui/skeleton";');

// 3. Replace reorder functions with handleDragEnd* and sensors
const oldReorderFuncsRegex = /const reorderSubjects = async [\s\S]*?fetchLessons\(selectedTopicId\);\n    }\n  };/m;

const newReorderFuncs = `
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEndSubjects = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = subjects.findIndex((s) => s.id === active.id);
      const newIndex = subjects.findIndex((s) => s.id === over?.id);
      const newSubjects = arrayMove(subjects, oldIndex, newIndex);
      setSubjects(newSubjects);
      try {
        const updates = newSubjects.map((s, i) => ({ id: s.id, order_index: i }));
        const results = await Promise.all(
          updates.map(update => supabase.from('subjects').update({ order_index: update.order_index }).eq('id', update.id))
        );
        const errors = results.filter(r => r.error).map(r => r.error);
        if (errors.length > 0) throw errors[0];
      } catch (err: any) {
        toast.error(err.message || "Failed to save subject order");
        console.error(err);
        fetchInitialData();
      }
    }
  };

  const handleDragEndTopics = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = topics.findIndex((t) => t.id === active.id);
      const newIndex = topics.findIndex((t) => t.id === over?.id);
      const newTopics = arrayMove(topics, oldIndex, newIndex);
      setTopics(newTopics);
      try {
        const updates = newTopics.map((t, i) => ({ id: t.id, order_index: i }));
        const results = await Promise.all(
          updates.map(update => supabase.from('topics').update({ order_index: update.order_index }).eq('id', update.id))
        );
        const errors = results.filter(r => r.error).map(r => r.error);
        if (errors.length > 0) throw errors[0];
        if (selectedSubjectId) fetchTopics(selectedSubjectId); // fetch refreshed created_at if necessary
      } catch (err: any) {
        toast.error(err.message || "Failed to save course order");
        console.error(err);
        if (selectedSubjectId) fetchTopics(selectedSubjectId);
      }
    }
  };

  const handleDragEndLessons = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = lessons.findIndex((l) => l.id === active.id);
      const newIndex = lessons.findIndex((l) => l.id === over?.id);
      const newLessons = arrayMove(lessons, oldIndex, newIndex);
      setLessons(newLessons);
      try {
        const updates = newLessons.map((l, i) => ({ id: l.id, order_index: i }));
        const results = await Promise.all(
          updates.map(update => supabase.from('lessons').update({ order_index: update.order_index }).eq('id', update.id))
        );
        const errors = results.filter(r => r.error).map(r => r.error);
        if (errors.length > 0) throw errors[0];
        if (selectedTopicId) fetchLessons(selectedTopicId);
      } catch (err: any) {
        toast.error(err.message || "Failed to save topic order");
        console.error(err);
        if (selectedTopicId) fetchLessons(selectedTopicId);
      }
    }
  };
`;

content = content.replace(oldReorderFuncsRegex, newReorderFuncs);

// Remove specific arrow buttons from subject rows
content = content.replace(/<button[^>]*onClick={\(e\) => { e\.stopPropagation\(\); reorderSubjects\('up', s\); }}[^>]*>[\s\S]*?<\/button>/g, '');
content = content.replace(/<button[^>]*onClick={\(e\) => { e\.stopPropagation\(\); reorderSubjects\('down', s\); }}[^>]*>[\s\S]*?<\/button>/g, '');

content = content.replace(/<button[^>]*onClick={\(e\) => { e\.stopPropagation\(\); reorderTopics\('up', t\); }}[^>]*>[\s\S]*?<\/button>/g, '');
content = content.replace(/<button[^>]*onClick={\(e\) => { e\.stopPropagation\(\); reorderTopics\('down', t\); }}[^>]*>[\s\S]*?<\/button>/g, '');

content = content.replace(/<button[^>]*onClick={\(e\) => { e\.stopPropagation\(\); reorderLessons\('up', l\); }}[^>]*>[\s\S]*?<\/button>/g, '');
content = content.replace(/<button[^>]*onClick={\(e\) => { e\.stopPropagation\(\); reorderLessons\('down', l\); }}[^>]*>[\s\S]*?<\/button>/g, '');


// Wrap map functions in JSX logic.
// Subjects map
content = content.replace(
  /subjects\.map\(\(s\) => \([\s\S]*?id={\`subject-\$\{s\.id\}\`}/,
  (match) => \`
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndSubjects}>
      <SortableContext items={subjects.map(s => s.id)} strategy={verticalListSortingStrategy}>
        {subjects.map((s) => (
          <SortableRow 
            key={s.id} 
            id={s.id}
  \`
);
// fix the closing for subjects
content = content.replace(
  /                  \)\)\n                \)\}/g,
  (match) => \`                  ))}
      </SortableContext>
    </DndContext>
                )}\`
);


// Topics map
content = content.replace(
  /topics\.map\(\(t\) => \([\s\S]*?id={\`course-\$\{t\.id\}\`}/,
  (match) => \`
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndTopics}>
      <SortableContext items={topics.map(t => t.id)} strategy={verticalListSortingStrategy}>
        {topics.map((t) => (
          <SortableRow 
            key={t.id} 
            id={t.id}
  \`
);

// fix the closing for topics
content = content.replace(
  /                  \)\)\n                \)\}\n              <\/div>\n            \)\}/g,
  (match) => \`                  ))}
      </SortableContext>
    </DndContext>
                )}
              </div>
            )}\`
);


// Lessons map
content = content.replace(
  /lessons\.map\(\(l\) => \([\s\S]*?id={\`lesson-\$\{l\.id\}\`}/,
  (match) => \`
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndLessons}>
      <SortableContext items={lessons.map(l => l.id)} strategy={verticalListSortingStrategy}>
        {lessons.map((l) => (
          <SortableRow 
            key={l.id} 
            id={l.id}
  \`
);

// fix the closing for lessons
content = content.replace(
  /                  \)\)\n                \)\}\n              <\/div>\n            \)\}\n          <\/GlassCard>\n        <\/div>\n      <\/div>\n    <\/div>\n  \);\n};\n/g,
  (match) => \`                  ))}
      </SortableContext>
    </DndContext>
                )}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
\`
);


// Further replace <div ... with <SortableRow inside maps. But wait, I've already replaced className/key logic partially in the map match above... 
// Actually I just mapped it inside the replace string. Wait, no I didn't replace the \`div\` itself string directly, I replaced up to \`id={...}\`. Let's manually replace the remaining \`<div\` -> \`<SortableRow\` components closures.
content = content.replace(/<\/div>\n                \)\)\n                \)\}/, '</SortableRow>\n                ))\n                )}');

fs.writeFileSync('src/pages/ContentManagement.tsx', content);

console.log("Done");
