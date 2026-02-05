import os
from PIL import Image

def fix_images():
    assets_dir = r"c:\Users\SRI RAM\.gemini\antigravity\scratch\SafeRoute\mobile_app\assets"
    
    # List of files to check/fix based on standard expo assets
    targets = ["icon.png", "adaptive-icon.png", "splash-icon.png", "favicon.png"]
    
    for filename in targets:
        path = os.path.join(assets_dir, filename)
        if not os.path.exists(path):
            print(f"Skipping {filename}: Not found")
            continue
            
        try:
            with Image.open(path) as img:
                print(f"Checking {filename} - Format: {img.format}")
                
                # If it's not a PNG, or if we just want to ensure it is standard PNG
                if img.format != 'PNG':
                    print(f"Converting {filename} from {img.format} to PNG...")
                    # Convert to RGBA to handle transparency if present/needed
                    img = img.convert("RGBA")
                    img.save(path, "PNG")
                    print(f"Saved {filename} as valid PNG.")
                else:
                    # Even if it says PNG, sometimes the extension lies. 
                    # PIL open() reads the header. If we are here, PIL thinks it is a PNG.
                    # But the doctor said it was JPG. Let's force re-save to be sure.
                    print(f"Re-saving {filename} to ensure integrity...")
                    img.save(path, "PNG")
                    
        except Exception as e:
            print(f"Error processing {filename}: {e}")

if __name__ == "__main__":
    fix_images()
