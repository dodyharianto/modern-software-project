import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  closestCorners,
  pointerWithin,
  rectIntersection,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragOverlay,
  defaultDropAnimation,
  CollisionDetection,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import axios from 'axios';
import CandidateCard from './CandidateCard';
import { FiUpload, FiMove } from 'react-icons/fi';

interface KanbanBoardProps {
  roleId: string;
  roleTitle?: string;
  candidates: any[];
  onUpdate: () => void;
}

interface Column {
  id: string;
  title: string;
}

const columns: Column[] = [
  { id: 'outreach', title: 'Outreach' },
  { id: 'follow-up', title: 'Outreach Follow-Up' },
  { id: 'evaluation', title: 'Evaluation' },
];

/**
 * Custom collision detection for Kanban cross-column drops.
 * Prioritizes column droppables when dragging across columns so empty columns are valid targets.
 */
function createKanbanCollisionDetection(
  getActiveColumn: (activeId: string) => string | undefined
): CollisionDetection {
  return (args) => {
    const rectCollisions = rectIntersection(args);
    const pointerCollisions = pointerWithin(args);
    const cornerCollisions = closestCorners(args);

    const allCollisions = rectCollisions.length > 0 ? rectCollisions
      : pointerCollisions.length > 0 ? pointerCollisions
      : cornerCollisions;

    if (allCollisions.length === 0) return [];

    const activeColumn = getActiveColumn(String(args.active.id));
    const isColumnId = (id: string) => COLUMN_IDS.includes(id);

    // When cross-column: prioritize column droppables so empty columns work
    if (activeColumn && allCollisions.some((c) => isColumnId(String(c.id)))) {
      const columnCollisions = allCollisions.filter((c) => isColumnId(String(c.id)));
      const otherCollisions = allCollisions.filter((c) => !isColumnId(String(c.id)));
      const targetColumnCollision = columnCollisions.find((c) => c.id !== activeColumn);
      if (targetColumnCollision) {
        return [targetColumnCollision, ...otherCollisions];
      }
    }

    return allCollisions;
  };
}

const COLUMN_IDS = ['outreach', 'follow-up', 'evaluation'];

export default function KanbanBoard({ roleId, roleTitle, candidates, onUpdate }: KanbanBoardProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [activeCandidate, setActiveCandidate] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const candidate = candidates.find((c) => c.id === event.active.id);
    setActiveCandidate(candidate || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCandidate(null);
    const { active, over } = event;
    if (!over) return;

    const candidateId = active.id as string;
    const validColumns = ['outreach', 'follow-up', 'evaluation'];

    // Resolve target column: over.id can be a column id OR a candidate id (when dropping on another card)
    let newColumn: string;
    if (validColumns.includes(over.id as string)) {
      newColumn = over.id as string;
    } else {
      const targetCandidate = candidates.find((c) => c.id === over.id);
      if (!targetCandidate?.column) return;
      newColumn = targetCandidate.column;
    }

    // Find candidate's current column
    const candidate = candidates.find((c) => c.id === candidateId);
    if (!candidate) {
      console.error('Candidate not found:', candidateId);
      return;
    }

    // Don't update if already in the same column
    if (candidate.column === newColumn) {
      return;
    }

    try {
      // Update color based on column
      let newColor = candidate.color;
      if (newColumn === 'outreach') {
        newColor = 'amber-transparent';
      } else if (newColumn === 'follow-up') {
        newColor = 'amber-solid';
      } else if (newColumn === 'evaluation') {
        newColor = 'amber-solid';
      }

      // Update both column and color in one call
      await axios.put(`/api/roles/${roleId}/candidates/${candidateId}/status`, {
        column: newColumn,
        color: newColor,
      });

      // Refresh the candidate list
      onUpdate();
    } catch (error) {
      console.error('Error updating candidate status:', error);
      alert('Failed to move candidate. Please try again.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please upload a PDF file');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`/api/roles/${roleId}/candidates`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('Candidate uploaded successfully:', response.data);
      onUpdate();
      alert('Candidate uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading candidate:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to upload candidate PDF';
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const getCandidatesForColumn = (columnId: string) => {
    return candidates.filter((c) => c.column === columnId);
  };

  const getActiveColumn = (activeId: string) => {
    return candidates.find((c) => c.id === activeId)?.column;
  };

  const kanbanCollisionDetection = useMemo(
    () => createKanbanCollisionDetection(getActiveColumn),
    [candidates]
  );

  const getColorClass = (
    candidate: { column?: string; color?: string; sent_to_client?: boolean; not_pushing_forward?: boolean }
  ) => {
    // Status overrides (sent to client, not pushing forward)
    if (candidate.sent_to_client) return 'bg-green-100 border-green-500';
    if (candidate.not_pushing_forward) return 'bg-red-100 border-red-500';
    // Column-based colors for clear pipeline stages
    switch (candidate.column) {
      case 'outreach':
        return 'bg-slate-100 border-slate-400';
      case 'follow-up':
        return 'bg-amber-100 border-amber-500';
      case 'evaluation':
        return 'bg-blue-100 border-blue-500';
      default:
        return 'bg-slate-100 border-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Candidate Pipeline</h2>
        <label className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer">
          <FiUpload className="w-4 h-4" />
          {isUploading ? 'Uploading...' : 'Upload Candidate PDF'}
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isUploading}
          />
        </label>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={kanbanCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-3 gap-6">
          {columns.map((column) => {
            const columnCandidates = getCandidatesForColumn(column.id);
            return (
              <Column
                key={column.id}
                id={column.id}
                title={column.title}
                candidates={columnCandidates}
                getColorClass={getColorClass}
                roleId={roleId}
                roleTitle={roleTitle}
                onUpdate={onUpdate}
              />
            );
          })}
        </div>

        <DragOverlay
          dropAnimation={{
            ...defaultDropAnimation,
            duration: 200,
          }}
        >
          {activeCandidate ? (
            <DraggingCard
              candidate={activeCandidate}
              getColorClass={getColorClass}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function DraggingCard({
  candidate,
  getColorClass,
}: {
  candidate: any;
  getColorClass: (c: any) => string;
}) {
  return (
    <div
      className={`border-2 rounded-lg p-4 shadow-xl cursor-grabbing rotate-1 ${getColorClass(candidate)}`}
      style={{
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.15), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <FiMove className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <h4 className="font-semibold text-gray-900 truncate">{candidate.name || 'Unknown'}</h4>
      </div>
      <p className="text-sm text-gray-600 line-clamp-2">{candidate.summary || 'No summary available'}</p>
    </div>
  );
}

function Column({
  id,
  title,
  candidates,
  getColorClass,
  roleId,
  roleTitle,
  onUpdate,
}: {
  id: string;
  title: string;
  candidates: any[];
  getColorClass: (candidate: { column?: string; color?: string; sent_to_client?: boolean; not_pushing_forward?: boolean }) => string;
  roleId: string;
  roleTitle?: string;
  onUpdate: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { type: 'column', columnId: id },
  });

  return (
    <div className="bg-gray-50 rounded-lg p-4 min-h-[400px] flex flex-col">
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-3 min-h-[350px] rounded-lg transition-all duration-200 ease-out ${
          isOver ? 'bg-blue-50/80 ring-2 ring-blue-400 ring-inset' : ''
        }`}
      >
        <SortableContext items={candidates.map((c) => c.id)} strategy={verticalListSortingStrategy} id={id}>
          {candidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              roleId={roleId}
              roleTitle={roleTitle}
              getColorClass={getColorClass}
              onUpdate={onUpdate}
            />
          ))}
        </SortableContext>
        {candidates.length === 0 && (
          <div className="text-center text-gray-400 py-8 text-sm">No candidates</div>
        )}
      </div>
    </div>
  );
}

