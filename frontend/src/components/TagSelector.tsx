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
            className={`rounded-full border px-3 py-1 text-sm transition ${active ? 'bg-[#0A2E6E] text-[#EAF1FB]' : 'border-[#C7D8EE] text-[#0A2E6E] hover:border-[#0E4DA4] hover:text-[#0E4DA4]'}`}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
