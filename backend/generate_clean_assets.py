from PIL import Image, ImageDraw

def create_clean_icon(filename, size, color):
    img = Image.new('RGBA', size, color)
    d = ImageDraw.Draw(img)
    # Draw an X
    d.line([(0,0), size], fill="white", width=10)
    d.line([(0, size[1]), (size[0], 0)], fill="white", width=10)
    
    path = f"c:\\Users\\SRI RAM\\.gemini\\antigravity\\scratch\\SafeRoute\\mobile_app\\assets\\{filename}"
    img.save(path, "PNG")
    print(f"Created clean {filename}")

if __name__ == "__main__":
    # Standard Expo sizes
    create_clean_icon("icon.png", (1024, 1024), "blue")
    create_clean_icon("adaptive-icon.png", (1024, 1024), "blue")
    create_clean_icon("splash-icon.png", (1242, 2436), "white")
    create_clean_icon("favicon.png", (48, 48), "blue")
