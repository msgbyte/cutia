# Code Review Checklist

Review every point below carefully to ensure files follow consistent code style and best practices.

---

## Function Signatures & Parameters

- [ ] Every function accepts a single object parameter with destructuring in the signature (for readability and future extensibility)
  - Exception: tiny one-liner callbacks (e.g. `array.find(x => ...)`, `map`, `filter`, `sort`) do not need destructuring if it hurts readability

  ```tsx
  // ❌ wrong
  function formatTime(seconds: number, fps: number) { ... }

  // ✅ correct
  function formatTime({ seconds, fps }: { seconds: number; fps: number }) { ... }
  ```

## TypeScript & Type Safety

- [ ] No `any` references
- [ ] General interfaces are in the `types` folder, not scattered in components
  - Example: `TimelineTrack` interface belongs in `src/types/timeline.ts`, not `src/components/timeline/index.tsx`

## JSX & Components

- [ ] JSX is clean — no comments explaining what each part does
- [ ] Complex/reusable JSX is extracted into sub-components (placed below the main component)
- [ ] Components shared across multiple files are in separate files
- [ ] File order: constants specific to file (top) -> utils specific to file -> main component → sub-components (bottom)
- [ ] Components render UI only — domain logic lives in hooks, utilities, or managers
  - Simple interaction logic (gestures, modifier keys) can stay if not complex

## Code Organization & File Structure

- [ ] Each file has one single purpose/responsibility
  - Example: `timeline/index.tsx` should not define `validateElementTrackCompatibility` — that belongs in a lib file
  - Example: `lib/timeline-utils.ts` should not declare `TRACK_COLORS` — that belongs in `constants/`
- [ ] Business logic lives in either `src/lib`, `src/core` or `src/services` folder

## Comments

- [ ] No AI comments — only human comments that explain _why_, not _what_
  - Bad: changelog-style comments, explaining readable code, using more words than necessary
- [ ] All comments are lowercase

## Naming Conventions

- [ ] Readability over brevity — use `element` not `el`, `event` not `e`
- [ ] Booleans are named `isSomething`, `hasSomething`, or `shouldSomething` — not `something`
- [ ] No title case in text/UI — use `Hello world` not `Hello World`

## Tailwind & Styling

- [ ] Use `gap-*` instead of `mb-*` or `mt-*` for consistent spacing
- [ ] Use `size-*` instead of `h-* w-*` when width and height are the same
- [ ] When using `size-*` on icons inside `<Button>`, use `!` modifier to override default `size-4`
  ```tsx
  <Button>
    <PlusIcon className="!size-6" /> {/* ✅ correct */}
    <PlusIcon className="size-6" /> {/* ❌ wrong */}
    <PlusIcon className="!size-4" /> {/* ❌ unnecessary, size-4 is default */}
  </Button>
  ```

## State Management (Zustand)

- [ ] React components never use `someStore.getState()` — use the `useSomeStore` hook instead
- [ ] Store/manager methods are not passed as props — sub-components access them directly

  ```tsx
  // ❌ wrong
  function Parent() {
    const { selectedElements } = useTimelineStore();
    return <Child selectedElements={selectedElements} />;
  }

  // ✅ correct
  function Parent() {
    return <Child />;
  }
  function Child() {
    const { selectedElements } = useTimelineStore();
  }
  ```

- [ ] Components and hooks should use the `useEditor` hook. Only use `EditorCore.getInstance()` if you are outside of a react component/hook. Eg: in a utility function, event handler.

## Code Quality

- [ ] Code is scannable — use variables and helper functions to make intent clear at a glance
- [ ] Complex logic is extracted into well-named variables or helpers
- [ ] No redundant single/plural function variants — if a function can operate on multiple items, it should accept an array and handle both cases. Don't create `doThing()` + `doThings()`.

  ```tsx
  // ❌ wrong — redundant variants
  function updateElement({ element }: { element: Element }) { ... }
  function updateElements({ elements }: { elements: Element[] }) { ... }

  // ✅ correct — one function, accepts array
  function updateElements({ elements }: { elements: Element[] }) { ... }
  ```

---

## Function Keywords

| Context                           | Keyword                   |
| --------------------------------- | ------------------------- |
| Next.js page components           | `export default function` |
| Main react component              | `export function`         |
| Sub-components                    | `function`                |
| Utility functions                 | `export function`         |
| Functions inside react components | `const`                   |

---

> Every decision, every edit must be carefully considered. Everything matters.
