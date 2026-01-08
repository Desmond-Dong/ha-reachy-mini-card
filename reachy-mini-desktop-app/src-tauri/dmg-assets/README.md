# 🎨 Guide for Creating DMG Background Image

## Image Dimensions

**⚠️ IMPORTANT: To avoid offset, use an image slightly larger than the window!**

- **Window**: 800×600 points (standard logical size)
- **Recommended image**: **864×664 pixels** (800+64 × 600+64)
  - The +64 pixels compensate for Finder's internal margins
  - This is the standard method recommended by the community
- **Format**: PNG (transparency possible)
- **Resolution**: 72 DPI

**Note**: Finder has internal margins that cause offset if the image is exactly 800×600. Using 864×664 px, the image fills the window correctly without offset.

## Coordinate System

**Important**: macOS uses a coordinate system from the **bottom left** of the window.

### Conversion for Your Image

When you create your image in an editor (Photoshop, Figma, etc.), you think from the **top left** (0,0 at top).

**To convert macOS coordinates to your image:**

- **macOS**: (0,0) = bottom left
- **Your image**: (0,0) = top left

**Conversion formula:**
```
Image Y = Image height - macOS Y
```

### Standard Icon Positions

**For an 864×664 px image (recommended, compensates for Finder margins)**:
- **App icon**:
  - Position in your image (top left): **x=200, y=236**
  - macOS coordinates (bottom left): x=200, y=236
  - Icon is vertically centered (128px height)

- **Applications link**:
  - Position in your image (top left): **x=550, y=236**
  - macOS coordinates (bottom left): x=550, y=236
  - Icon is vertically centered (128px height)

**For a 1600×1200 px image (Retina 2x, better quality)**:
- **App icon**:
  - Position in your image (top left): **x=400, y=472**
  - Script will use 800×600 point window, icons at x=200, y=236

- **Applications link**:
  - Position in your image (top left): **x=1100, y=472**
  - Script will use 800×600 point window, icons at x=550, y=236

**For a 2400×1800 px image (Retina 3x, maximum quality)**:
- **App icon**:
  - Position in your image (top left): **x=600, y=708**
  - Script will use 800×600 point window, icons at x=200, y=236

- **Applications link**:
  - Position in your image (top left): **x=1650, y=708**
  - Script will use 800×600 point window, icons at x=550, y=236

## Visual Guide for Creating the Image (864×664 px recommended)

```
┌─────────────────────────────────────────────────────────┐
│                    (0,0) - Top left                     │
│                                                          │
│                                                          │
│  [App]                    [Applications]                │
│  x=200                    x=550                         │
│  y=236                    y=236                         │
│  (from top)               (from top)                    │
│  (128×128 icon)           (128×128 icon)                │
│                                                          │
│                                                          │
│                                                          │
│                    (800,600) - Bottom right             │
└─────────────────────────────────────────────────────────┘
```

## Icon Sizes

- **Display size**: 128×128 px (points)
- **Recommended spacing**: ~20–30 px between icons
- **Margin from edges**: ~50 px

## Tips for Creating the Image

1. **Create an image** in your editor:
   - **864×664 px** (recommended, compensates for Finder margins)
   - Or **800×600 px** if you accept small margins
2. **Place visual guides** at standard positions:
   - **App**: x=200, y=236 (from top left) for 800×600
   - **Applications**: x=550, y=236 (from top left) for 800×600
   - For 1600×1200: multiply by 2 (x=400, y=472)
3. **Add an arrow or instructions** between the two (optional)
4. **Leave margin** on edges (50 px minimum)
5. **Export as PNG**: `background.png`
6. **The script automatically detects** the size and adjusts everything!

## Test

Once the image is created, test with:
```bash
./scripts/build/customize-dmg.sh \
  "src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Reachy Mini Control.app" \
  "test-dmg.dmg" \
  "src-tauri/dmg-assets/background.png"
```

If positions aren't perfect, adjust `x` and `y` values in `scripts/build/customize-dmg.sh`.
