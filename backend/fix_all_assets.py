from PIL import Image, ImageDraw, ImageFont

def create_image(filename, width, height, color, text):
    img = Image.new('RGB', (width, height), color=color)
    draw = ImageDraw.Draw(img)
    # Draw a simple circle or shapes
    draw.ellipse([width//4, height//4, width*3//4, height*3//4], fill='white')
    
    # Save
    output_path = f"c:\\Users\\SRI RAM\\.gemini\\antigravity\\scratch\\SafeRoute\\mobile_app\\assets\\{filename}"
    img.save(output_path, "PNG")
    print(f"Generated {filename}")

def fix_all_assets():
    # Icon (1024x1024)
    create_image("icon.png", 1024, 1024, "#1A73E8", "SR")
    
    # Adaptive Icon (1024x1024)
    create_image("adaptive-icon.png", 1024, 1024, "#1A73E8", "SR")
    
    # Splash Screen (1284x2778) - Typical mobile size
    create_image("splash-icon.png", 1284, 2778, "#1A73E8", "SafeRoute")
    
    # Favicon (48x48)
    create_image("favicon.png", 48, 48, "#1A73E8", "S")

if __name__ == "__main__":
    fix_all_assets()
