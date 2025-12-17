# Agent Guidelines

## Package Manager

- Use **bun** as the package manager
- When installing dependencies, always use the latest version with a fixed version (no `^` or `~`)
  ```bash
  bun add package@latest --exact
  ```

## Web Package

### React Version

- Using **React 19** - do not use deprecated patterns:
  - No `forwardRef` - use `ref` as a regular prop instead
  - No `useContext` - use `use(Context)` instead

### Imports

- Always import React using namespace import:

  ```tsx
  // Correct
  import * as React from 'react'

  // Incorrect
  import React from 'react'
  ```

- Always use the `@` path alias for local imports:

  ```tsx
  // Correct
  import { Button } from '@/components/ui/button'
  import { cn } from '@/lib/utils'

  // Incorrect
  import { Button } from '../components/ui/button'
  import { cn } from '../../utils/cn'
  ```

### Icons

- Use **Tabler Icons** (`@tabler/icons-react`)
- Always alias icon imports with the `Icon` suffix:

  ```tsx
  // Correct
  import { IconCircle as CircleIcon } from '@tabler/icons-react'
  import { IconPlus as PlusIcon } from '@tabler/icons-react'

  // Incorrect
  import { IconCircle } from '@tabler/icons-react'
  ```

### UI Components

- Use **shadcn/ui** components from `@/components/ui`
  ```tsx
  import { Button } from '@/components/ui/button'
  import { Dialog } from '@/components/ui/dialog'
  ```
- Components are built on **Base UI** (not Radix). Use **render props** instead of `asChild`:

  ```tsx
  // Correct - Base UI render props
  <Dialog.Trigger render={<Button />}>Open Dialog</Dialog.Trigger>
  <Tooltip.Trigger render={<IconButton />} />

  // Incorrect - Radix asChild pattern
  <Dialog.Trigger asChild>
    <Button>Open Dialog</Button>
  </Dialog.Trigger>
  ```

### Styling

- Use **Tailwind CSS v4** for all styling
- Use the design tokens defined in `packages/web/src/styles.css`

#### Available Colors

| Token                                | Description               |
| ------------------------------------ | ------------------------- |
| `background`                         | Page background           |
| `foreground`                         | Primary text color        |
| `card` / `card-foreground`           | Card surfaces             |
| `popover` / `popover-foreground`     | Popover surfaces          |
| `primary` / `primary-foreground`     | Primary actions           |
| `secondary` / `secondary-foreground` | Secondary actions         |
| `muted` / `muted-foreground`         | Muted/disabled states     |
| `accent` / `accent-foreground`       | Accent highlights         |
| `destructive`                        | Destructive/error actions |
| `border`                             | Border color              |
| `input`                              | Input border color        |
| `ring`                               | Focus ring color          |
| `chart-1` to `chart-5`               | Chart colors              |
| `sidebar-*`                          | Sidebar-specific colors   |

#### Example Usage

```tsx
<div className="bg-background text-foreground border border-border rounded-lg p-4">
  <h1 className="text-primary">Title</h1>
  <p className="text-muted-foreground">Description</p>
  <button className="bg-primary text-primary-foreground rounded-md px-4 py-2">Click me</button>
</div>
```

## Icons

- Use **Tabler Icons** (`@tabler/icons-react`)
- Always alias icon imports with the `Icon` suffix:

  ```tsx
  // Correct
  import { IconCircle as CircleIcon } from '@tabler/icons-react'
  import { IconPlus as PlusIcon } from '@tabler/icons-react'

  // Incorrect
  import { IconCircle } from '@tabler/icons-react'
  ```

## UI Components

- Use **shadcn/ui** components from `@/components/ui`
  ```tsx
  import { Button } from '@/components/ui/button'
  import { Dialog } from '@/components/ui/dialog'
  ```

## Styling

- Use **Tailwind CSS v4** for all styling
- Use the design tokens defined in `@packages/web/src/styles.css`

### Available Colors

| Token                                | Description               |
| ------------------------------------ | ------------------------- |
| `background`                         | Page background           |
| `foreground`                         | Primary text color        |
| `card` / `card-foreground`           | Card surfaces             |
| `popover` / `popover-foreground`     | Popover surfaces          |
| `primary` / `primary-foreground`     | Primary actions           |
| `secondary` / `secondary-foreground` | Secondary actions         |
| `muted` / `muted-foreground`         | Muted/disabled states     |
| `accent` / `accent-foreground`       | Accent highlights         |
| `destructive`                        | Destructive/error actions |
| `border`                             | Border color              |
| `input`                              | Input border color        |
| `ring`                               | Focus ring color          |
| `chart-1` to `chart-5`               | Chart colors              |
| `sidebar-*`                          | Sidebar-specific colors   |

### Example Usage

```tsx
<div className="bg-background text-foreground border border-border rounded-lg p-4">
  <h1 className="text-primary">Title</h1>
  <p className="text-muted-foreground">Description</p>
  <button className="bg-primary text-primary-foreground rounded-md px-4 py-2">Click me</button>
</div>
```

## File Structure

- **Never use barrel files** (index.ts files that re-export from other files)
- Always import directly from the source file:

  ```tsx
  // Correct
  import { Button } from '@/components/ui/button'
  import { useAuth } from '@/context/auth'

  // Incorrect - barrel file
  import { Button, Dialog, Input } from '@/components/ui'
  import { useAuth, useSession } from '@/context'
  ```

## Imports (Web Package)

- Always use the `@` path alias for local imports in the web package:

  ```tsx
  // Correct
  import { Button } from '@/components/ui/button'
  import { cn } from '@/lib/utils'

  // Incorrect
  import { Button } from '../components/ui/button'
  import { cn } from '../../utils/cn'
  ```
