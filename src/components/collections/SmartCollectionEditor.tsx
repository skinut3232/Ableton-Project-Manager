import { useState, useEffect } from 'react';
import { useSmartCollectionRules, useSetSmartCollectionRules } from '../../hooks/useCollections';
import { Button } from '../ui/Button';
import type { SmartCollectionRuleInput } from '../../types';

interface SmartCollectionEditorProps {
  collectionId: number;
  isOpen: boolean;
  onClose: () => void;
}

const FIELD_OPTIONS = [
  { value: 'bpm', label: 'BPM', type: 'number' },
  { value: 'rating', label: 'Rating', type: 'number' },
  { value: 'progress', label: 'Progress', type: 'number' },
  { value: 'key', label: 'Key', type: 'string' },
  { value: 'genre', label: 'Genre', type: 'string' },
  { value: 'status', label: 'Status', type: 'string' },
  { value: 'tag', label: 'Tag', type: 'tag' },
  { value: 'plugin', label: 'Plugin', type: 'plugin' },
  { value: 'in_rotation', label: 'In Rotation', type: 'boolean' },
  { value: 'has_missing_deps', label: 'Missing Deps', type: 'boolean' },
  { value: 'last_worked_on', label: 'Last Worked On', type: 'date' },
];

const OPERATORS_BY_TYPE: Record<string, { value: string; label: string }[]> = {
  number: [
    { value: 'gt', label: '>' },
    { value: 'lt', label: '<' },
    { value: 'eq', label: '=' },
    { value: 'gte', label: '>=' },
    { value: 'lte', label: '<=' },
    { value: 'between', label: 'between' },
  ],
  string: [
    { value: 'is', label: 'is' },
    { value: 'is_not', label: 'is not' },
  ],
  tag: [
    { value: 'has', label: 'has' },
    { value: 'has_not', label: 'has not' },
  ],
  plugin: [
    { value: 'contains', label: 'contains' },
  ],
  boolean: [
    { value: 'is', label: 'is' },
  ],
  date: [
    { value: 'within_days', label: 'within days' },
    { value: 'older_than_days', label: 'older than days' },
  ],
};

function getFieldType(field: string): string {
  return FIELD_OPTIONS.find(f => f.value === field)?.type || 'string';
}

export function SmartCollectionEditor({ collectionId, isOpen, onClose }: SmartCollectionEditorProps) {
  const { data: existingRules } = useSmartCollectionRules(collectionId);
  const setRules = useSetSmartCollectionRules();
  const [rules, setLocalRules] = useState<SmartCollectionRuleInput[]>([]);

  useEffect(() => {
    if (existingRules) {
      setLocalRules(existingRules.map(r => ({ field: r.field, operator: r.operator, value: r.value })));
    }
  }, [existingRules]);

  const addRule = () => {
    setLocalRules([...rules, { field: 'bpm', operator: 'gt', value: '' }]);
  };

  const removeRule = (index: number) => {
    setLocalRules(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, updates: Partial<SmartCollectionRuleInput>) => {
    setLocalRules(rules.map((r, i) => {
      if (i !== index) return r;
      const updated = { ...r, ...updates };
      // Reset operator when field changes
      if (updates.field) {
        const type = getFieldType(updates.field);
        const ops = OPERATORS_BY_TYPE[type] || [];
        if (!ops.find(o => o.value === updated.operator)) {
          updated.operator = ops[0]?.value || 'eq';
        }
      }
      return updated;
    }));
  };

  const handleSave = () => {
    setRules.mutate(
      { collectionId, rules },
      { onSuccess: () => onClose() }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[520px] max-h-[80vh] overflow-auto rounded-lg border border-border-default bg-bg-secondary p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Smart Collection Rules</h2>
        <p className="text-xs text-text-muted mb-4">All rules are combined with AND logic.</p>

        <div className="space-y-3">
          {rules.map((rule, i) => {
            const fieldType = getFieldType(rule.field);
            const operators = OPERATORS_BY_TYPE[fieldType] || [];

            return (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={rule.field}
                  onChange={(e) => updateRule(i, { field: e.target.value })}
                  className="rounded border border-border-default bg-bg-elevated px-2 py-1.5 text-sm text-text-primary"
                >
                  {FIELD_OPTIONS.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>

                <select
                  value={rule.operator}
                  onChange={(e) => updateRule(i, { operator: e.target.value })}
                  className="rounded border border-border-default bg-bg-elevated px-2 py-1.5 text-sm text-text-primary"
                >
                  {operators.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>

                {fieldType === 'boolean' ? (
                  <select
                    value={rule.value}
                    onChange={(e) => updateRule(i, { value: e.target.value })}
                    className="flex-1 rounded border border-border-default bg-bg-elevated px-2 py-1.5 text-sm text-text-primary"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : (
                  <input
                    type={fieldType === 'number' || fieldType === 'date' ? 'number' : 'text'}
                    value={rule.value}
                    onChange={(e) => updateRule(i, { value: e.target.value })}
                    placeholder={fieldType === 'date' ? 'days' : 'value'}
                    className="flex-1 rounded border border-border-default bg-bg-elevated px-2 py-1.5 text-sm text-text-primary placeholder-text-muted"
                  />
                )}

                <button
                  onClick={() => removeRule(i)}
                  className="text-text-muted hover:text-red-400 text-sm px-1"
                  title="Remove rule"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={addRule}
          className="mt-3 text-sm text-brand-400 hover:text-brand-300"
        >
          + Add Rule
        </button>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={setRules.isPending}>
            Save Rules
          </Button>
        </div>
      </div>
    </div>
  );
}
