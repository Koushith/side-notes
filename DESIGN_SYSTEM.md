# SideNotes Design System

Modern, clean design language for the entire app.

## Typography

- **Headings**: Inter, semibold (font-semibold), tight tracking (tracking-tight)
- **Body**: Inter, normal weight
- **Mono**: JetBrains Mono for code, file paths, timestamps
- **Sizes**: 
  - H1: 22-28px
  - H2: 16-18px
  - Body: 13-14px
  - Small: 11-12px

## Spacing

- **Component padding**: px-6 to px-8 (larger for main views)
- **Card padding**: p-4 to p-5
- **Vertical spacing**: space-y-3 to space-y-6
- **Gap between elements**: gap-2 to gap-3

## Borders & Corners

- **Rounded corners**: 
  - Small: rounded-lg (8px)
  - Medium: rounded-xl (12px)
  - Large: rounded-2xl (16px)
- **Border opacity**: border-border or border-border/50 for subtle
- **Dividers**: Use border-b with border-border/50

## Colors (Theme Variables)

Always use theme variables, never hardcoded colors:

- **Backgrounds**: bg-bg, bg-bg-elevated, bg-bg-hover
- **Text**: text-text, text-text-muted, text-text-subtle
- **Borders**: border-border, border-border-subtle
- **Accent**: bg-accent, text-accent, border-accent
- **Tags**: bg-tag-soft, text-tag
- **Links**: text-link, bg-link-bg

## Buttons

### Primary
```tsx
className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-bg rounded-lg font-semibold"
```

### Secondary
```tsx
className="px-4 py-2.5 bg-bg-elevated hover:bg-bg-hover border border-border rounded-lg"
```

### Icon Button
```tsx
className="p-2 rounded-lg hover:bg-bg-elevated transition-colors"
```

## Cards

```tsx
className="bg-bg-elevated rounded-xl border border-border/50 p-5"
```

## Inputs

```tsx
className="px-4 py-2.5 bg-bg-elevated border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
```

## Lists & Items

```tsx
// List container
className="space-y-2"

// List item
className="px-4 py-3 rounded-lg bg-bg-elevated hover:bg-bg-hover border border-border/50"
```

## Empty States

```tsx
<div className="flex flex-col items-center justify-center gap-3">
  <div className="w-16 h-16 rounded-2xl bg-accent-subtle flex items-center justify-center">
    <Icon size={28} className="text-accent-ink" />
  </div>
  <p className="text-[15px] font-semibold text-text">Title</p>
  <p className="text-[12.5px] text-text-muted">Description</p>
</div>
```

## Transitions

- **Default**: `transition-all` or `transition-colors`
- **Duration**: Built-in Tailwind defaults
- **Hover states**: Always add hover states to interactive elements

## Status Badges

```tsx
className="px-2.5 py-1 bg-tag-soft text-tag rounded-md text-[11px] font-medium"
```

## Key Principles

1. **Consistency**: Use the same patterns everywhere
2. **Spacing**: More breathing room, avoid cramped layouts
3. **Borders**: Subtle, using /50 opacity often
4. **Corners**: Rounded (lg/xl) for modern feel
5. **Typography**: Inter everywhere except code/mono
6. **Theme-aware**: Always use CSS variables, never hardcoded colors
