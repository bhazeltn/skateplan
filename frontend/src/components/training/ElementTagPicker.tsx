import { Button } from "@/components/ui/button";
import { techTagsFor } from "@/lib/elementTaxonomy";

interface Props {
  elementCode: string;
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}

/** Category-aware technical "call" tags for an element. Tapping a tag toggles it;
 *  selected tags render in amber (the "completed with calls" colour). Renders
 *  nothing until an element code resolves to a category with tags. */
export function ElementTagPicker({ elementCode, selectedTags, onChange }: Props) {
  const tags = techTagsFor(elementCode);
  if (tags.length === 0) return null;

  const toggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter((t) => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  return (
    <div data-testid="tag-picker" className="flex flex-wrap items-center gap-1">
      <span className="mr-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
        Calls
      </span>
      {tags.map((tag) => {
        const active = selectedTags.includes(tag);
        return (
          <Button
            key={tag}
            type="button"
            size="sm"
            variant="outline"
            className={
              active ? "border-amber-500 bg-amber-100 text-amber-800 hover:bg-amber-200" : ""
            }
            aria-pressed={active}
            onClick={() => toggle(tag)}
          >
            {tag}
          </Button>
        );
      })}
    </div>
  );
}
