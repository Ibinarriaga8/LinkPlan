type TagSelectorProps = {
  tags: string[];
  selected: string[];
  onToggle: (tag: string) => void;
  single?: boolean;
};

export function TagSelector({ tags, selected, onToggle }: TagSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        const active = selected.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onToggle(tag)}
            aria-pressed={active}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition active:scale-95 ${
              active
                ? 'border-navy bg-navy text-white shadow-soft'
                : 'border-hair bg-white text-navy hover:border-royal hover:text-royal'
            }`}
          >
            {active ? '✓ ' : ''}
            {tag}
          </button>
        );
      })}
    </div>
  );
}
