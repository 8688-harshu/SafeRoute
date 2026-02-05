from PIL import Image, ImageDraw

def create_bg():
    # Create a 1080x1920 image (common mobile resolution)
    width, height = 1080, 1920
    # Create a white background
    img = Image.new('RGB', (width, height), color='#FFFFFF')
    draw = ImageDraw.Draw(img)
    
    # Add some subtle patterns (safe route theme)
    # Light blue/grey abstract circles or paths
    for i in range(0, height, 100):
        draw.line([(0, i), (width, i + 200)], fill='#F1F3F4', width=2)
        draw.line([(0, i + 50), (width, i + 250)], fill='#F8F9FA', width=2)
        
    output_path = r"c:\Users\SRI RAM\.gemini\antigravity\scratch\SafeRoute\mobile_app\assets\bg.png"
    img.save(output_path, "PNG")
    print(f"Created new valid background at {output_path}")

if __name__ == "__main__":
    create_bg()
