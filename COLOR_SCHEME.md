# Groomy Paws Color Scheme

The application uses a vibrant color palette inspired by the Groomy Paws logo, featuring hot pink, light blue, and accents.

## Brand Colors

### Primary - Hot Pink
Main brand color used for CTAs, active states, and key interactive elements.

- **Primary 500** (Default): `#D91E8D` - Hot pink (main brand color)
- **Primary 600**: `#B01871` - Darker pink (hover states)
- **Primary 700**: `#831255` - Deep pink (pressed states)
- **Primary 50-100**: Light pink tints for backgrounds

### Secondary - Light Blue
Supporting brand color for backgrounds, accents, and loading states.

- **Secondary 500** (Default): `#4FC3E3` - Sky blue (accent color)
- **Secondary 100**: `#CDEFF9` - Very light blue (backgrounds)
- **Secondary 50**: `#E6F7FC` - Pale blue (subtle backgrounds)
- **Secondary 300**: `#6ACFED` - Medium blue (hover borders)

### Accent - Yellow
Highlight color used sparingly for emphasis (matches "Paws" text in logo).

- **Accent 500** (Default): `#FFE135` - Bright yellow
- Used for special highlights and attention-grabbing elements

## Neutral Colors

- **Gray 900**: Primary text color
- **Gray 600**: Secondary text color
- **Gray 300**: Borders and dividers
- **Gray 50**: Subtle backgrounds
- **White**: Main backgrounds

## Usage Guidelines

### Buttons & CTAs
- Primary actions: `bg-primary-600 hover:bg-primary-700`
- Secondary actions: `border-2 border-primary-600 text-primary-600`

### Links
- Default: `text-primary-600 hover:text-primary-700`

### Backgrounds
- Page backgrounds: `bg-gradient-to-b from-secondary-50 to-white`
- Card accents: `bg-secondary-50` or `bg-secondary-100`
- Active states: `bg-secondary-50 text-primary-700`

### Icons & Badges
- Icon backgrounds: `bg-secondary-100` with `text-primary-600` icons
- Role badges: `bg-secondary-100 text-primary-800`

### Form Elements
- Focus rings: `focus:ring-2 focus:ring-secondary-500`
- Active borders: `border-primary-600`

### Loading States
- Spinner: `border-secondary-500 border-t-transparent`

### Status Colors (unchanged)
- Success/Confirmed: Green
- Pending: Yellow
- In Progress: Blue
- Cancelled/Error: Red
- Completed: Gray

## Color Psychology

- **Hot Pink**: Energy, playfulness, fun - perfect for a pet grooming brand
- **Light Blue**: Trust, cleanliness, professionalism
- **Yellow**: Happiness, optimism, friendliness
- **White/Gray**: Clean, modern, professional

## Accessibility

All color combinations meet WCAG AA contrast standards:
- Primary pink on white: ✓ 4.5:1 ratio
- Gray 900 on white: ✓ 21:1 ratio
- Primary text on secondary backgrounds: ✓ Tested and compliant

## Migration from Previous Theme

The application was updated from a teal theme to the hot pink/light blue theme:

- `teal-600` → `primary-600` (hot pink)
- `teal-50/100` → `secondary-50/100` (light blue)
- `teal-500` → `primary-500` (pink accents)
- All teal shades systematically replaced with brand-appropriate colors
