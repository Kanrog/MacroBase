import os
import json
import re

MACRO_DIR = 'macros'
MANIFEST_PATH = 'manifest.json'

def build_manifest():
    manifest = []

    if not os.path.exists(MACRO_DIR):
        os.makedirs(MACRO_DIR, exist_ok=True)
        print(f"Created {MACRO_DIR} directory.")

    for filename in os.listdir(MACRO_DIR):
        if filename.endswith('.cfg'):
            filepath = os.path.join(MACRO_DIR, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            # Matches the format in your macro_examples.cfg
            pattern = re.compile(r'#\s*@DESC\s*(.+?)\n\[gcode_macro\s*(.*?)\]', re.IGNORECASE)
            matches = pattern.findall(content)

            macros = []
            for desc, name in matches:
                macros.append({
                    "name": name.strip(),
                    "description": desc.strip()
                })

            if macros:
                manifest.append({
                    "filename": filename,
                    "macros": macros
                })

    with open(MANIFEST_PATH, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=4)

    print(f"Manifest built successfully with {len(manifest)} categorized files.")

if __name__ == '__main__':
    build_manifest()