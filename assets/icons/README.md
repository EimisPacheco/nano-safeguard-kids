# SafeGuard Kids - Extension Icons

## Icon Requirements

Chrome extensions need icons in the following sizes:
- 16x16 - Extension toolbar
- 32x32 - Windows computers
- 48x48 - Extension management page
- 128x128 - Chrome Web Store

## Design Guidelines

### Icon Concept: Shield with Child Protection

**Visual elements**:
- 🛡️ Shield shape (protection)
- 👦 Child silhouette (who we protect)
- 🤖 AI element (technology used)
- Colors: Blue/Purple gradient (trust, safety, technology)

### Color Palette

Primary: `#667eea` (Purple-blue)
Secondary: `#764ba2` (Deep purple)
Accent: `#4CAF50` (Green - safe)
Alert: `#D32F2F` (Red - danger)

## Creating Icons

### Option 1: Use Icon Generator

1. Go to https://www.favicon-generator.org/
2. Upload your logo/design
3. Generate all sizes
4. Download and place in this directory

### Option 2: Design in Figma/Photoshop

**Template**:
- Canvas: 128x128px
- Safe area: 96x96px (center)
- Export at 1x, 2x for retina
- Format: PNG with transparency

### Option 3: Use Unicode Shield Emoji

For quick testing, you can use the shield emoji converted to image:
1. Go to https://favicon.io/emoji-favicons/shield/
2. Download shield icon set
3. Rename files to match requirements

## Temporary Solution

Until custom icons are created, you can use:
- Placeholder colored squares
- Unicode emoji conversions
- Free icon from https://icons8.com (shield + child)

## Files Needed

Place these files in this directory:
```
assets/icons/
├── icon16.png   (16x16)
├── icon32.png   (32x32)
├── icon48.png   (48x48)
└── icon128.png  (128x128)
```

## Quick Fix

Create placeholder icons using this online tool:
https://png-pixel.com/

Generate solid color squares:
- 16x16: Purple (#667eea)
- 32x32: Purple (#667eea)
- 48x48: Purple (#667eea)
- 128x128: Purple (#667eea)

The extension will work with any valid PNG images.
