#!/usr/bin/env python3
"""
Script to make the black background around PNG stickers transparent
while preserving black pixels inside shapes.

Uses a flood fill algorithm from the edges to identify
only the black background connected to the image edges.
"""

import os
import sys
from PIL import Image
from collections import deque


def is_black(pixel, threshold=30):
    """
    Checks if a pixel is considered black (with tolerance).
    
    Args:
        pixel: Tuple (R, G, B) or (R, G, B, A)
        threshold: Tolerance threshold for black (0-255)
    
    Returns:
        bool: True if pixel is black
    """
    r, g, b = pixel[0], pixel[1], pixel[2]
    return r <= threshold and g <= threshold and b <= threshold


def get_border_pixels(width, height):
    """
    Generates coordinates of all pixels on the image edges.
    
    Args:
        width: Image width
        height: Image height
    
    Yields:
        Tuple (x, y) of edge pixel coordinates
    """
    # Top and bottom edges
    for x in range(width):
        yield (x, 0)
        if height > 1:
            yield (x, height - 1)
    
    # Left and right edges (without corners already covered)
    for y in range(1, height - 1):
        yield (0, y)
        if width > 1:
            yield (width - 1, y)


def flood_fill_from_borders(img, black_threshold=30):
    """
    Identifies all black pixels connected to image edges
    using a flood fill algorithm.
    
    Args:
        img: PIL Image in RGBA mode
        black_threshold: Threshold to consider a pixel as black
    
    Returns:
        set: Set of coordinates (x, y) of pixels to make transparent
    """
    width, height = img.size
    pixels = img.load()
    to_remove = set()
    visited = set()
    
    # Traverse all border pixels
    for start_x, start_y in get_border_pixels(width, height):
        if (start_x, start_y) in visited:
            continue
        
        pixel = pixels[start_x, start_y]
        
        # If border pixel is black, start a flood fill
        if is_black(pixel, black_threshold):
            queue = deque([(start_x, start_y)])
            visited.add((start_x, start_y))
            
            while queue:
                x, y = queue.popleft()
                to_remove.add((x, y))
                
                # Check 4 neighbors (top, bottom, left, right)
                for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    nx, ny = x + dx, y + dy
                    
                    # Check boundaries
                    if 0 <= nx < width and 0 <= ny < height:
                        if (nx, ny) not in visited:
                            neighbor_pixel = pixels[nx, ny]
                            if is_black(neighbor_pixel, black_threshold):
                                visited.add((nx, ny))
                                queue.append((nx, ny))
    
    return to_remove


def remove_black_background(input_path, output_path=None, black_threshold=30):
    """
    Makes the black background of a PNG image transparent.
    
    Args:
        input_path: Path to input image
        output_path: Path to output image (if None, replaces original)
        black_threshold: Threshold to consider a pixel as black (0-255)
    """
    # Open image and convert to RGBA
    img = Image.open(input_path).convert("RGBA")
    
    print(f"Processing: {os.path.basename(input_path)}")
    print(f"  Size: {img.size[0]}x{img.size[1]}")
    
    # Identify pixels to make transparent
    pixels_to_remove = flood_fill_from_borders(img, black_threshold)
    print(f"  Pixels to make transparent: {len(pixels_to_remove)}")
    
    # Make identified pixels transparent
    pixels = img.load()
    for x, y in pixels_to_remove:
        r, g, b, a = pixels[x, y]
        pixels[x, y] = (r, g, b, 0)  # Alpha = 0 for transparency
    
    # Save
    if output_path is None:
        output_path = input_path
    
    img.save(output_path, "PNG")
    print(f"  ✓ Saved: {output_path}\n")


def process_directory(directory_path, black_threshold=30, backup=True):
    """
    Processes all PNG files in a directory.
    
    Args:
        directory_path: Path to directory
        black_threshold: Threshold to consider a pixel as black
        backup: If True, creates a backup before modification
    """
    if not os.path.isdir(directory_path):
        print(f"Error: {directory_path} is not a valid directory")
        return
    
    # Find all PNG files
    png_files = [f for f in os.listdir(directory_path) 
                 if f.lower().endswith('.png')]
    
    if not png_files:
        print(f"No PNG files found in {directory_path}")
        return
    
    print(f"Found {len(png_files)} PNG file(s) to process\n")
    
    for filename in sorted(png_files):
        input_path = os.path.join(directory_path, filename)
        
        # Create backup if requested
        if backup:
            backup_path = os.path.join(directory_path, f"{filename}.backup")
            if not os.path.exists(backup_path):
                img_backup = Image.open(input_path)
                img_backup.save(backup_path, "PNG")
                print(f"  Backup created: {backup_path}")
        
        # Process image
        remove_black_background(input_path, black_threshold=black_threshold)


def main():
    """Main entry point of the script."""
    if len(sys.argv) < 2:
        print("Usage:")
        print(f"  {sys.argv[0]} <image_path.png> [threshold]")
        print(f"  {sys.argv[0]} <directory_path> [threshold] [--no-backup]")
        print("\nExamples:")
        print(f"  {sys.argv[0]} image.png")
        print(f"  {sys.argv[0]} image.png 50")
        print(f"  {sys.argv[0]} ./src/assets/reachies")
        print(f"  {sys.argv[0]} ./src/assets/reachies 30 --no-backup")
        print("\nThe threshold (0-255) determines what is considered 'black'.")
        print("Default: 30 (higher threshold means more pixels will be processed)")
        sys.exit(1)
    
    path = sys.argv[1]
    black_threshold = 30
    backup = True
    
    # Parse arguments
    for arg in sys.argv[2:]:
        if arg == "--no-backup":
            backup = False
        elif arg.isdigit():
            black_threshold = int(arg)
            if not (0 <= black_threshold <= 255):
                print(f"Error: Threshold must be between 0 and 255")
                sys.exit(1)
    
    if os.path.isfile(path):
        # Process a single file
        remove_black_background(path, black_threshold=black_threshold)
    elif os.path.isdir(path):
        # Process a directory
        process_directory(path, black_threshold=black_threshold, backup=backup)
    else:
        print(f"Error: {path} does not exist")
        sys.exit(1)


if __name__ == "__main__":
    main()
