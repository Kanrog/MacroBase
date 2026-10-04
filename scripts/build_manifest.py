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
                lines = f.readlines()

            macros = []
            macro_starts = []

            # Find all macro headers and their starting comment blocks
            for i, line in enumerate(lines):
                match = re.match(r'^\[gcode_macro\s+(.+?)\]', line, re.IGNORECASE)
                if match:
                    name = match.group(1).strip()
                    # Trace upwards to find the start of the comment block for this macro
                    start_idx = i
                    while start_idx > 0:
                        prev_line = lines[start_idx-1].strip()
                        # If the line above is a comment, include it. Otherwise, stop.
                        if prev_line.startswith('#'):
                            start_idx -= 1
                        else:
                            break
                    macro_starts.append((name, start_idx, i))

            # Extract full blocks of code and descriptions
            for j, (name, start_idx, header_idx) in enumerate(macro_starts):
                end_idx = macro_starts[j+1][1] if j+1 < len(macro_starts) else len(lines)
                
                # Join lines and clean up trailing whitespace for the macro body
                macro_text = "".join(lines[start_idx:end_idx]).strip() + "\n\n"

                # Extract description for the UI
                desc = "No description provided."
                for k in range(start_idx, header_idx):
                    m = re.search(r'#\s*@DESC\s*(.+)', lines[k], re.IGNORECASE)
                    if m:
                        desc = m.group(1).strip()
                        break

                macros.append({
                    "name": name,
                    "description": desc,
                    "raw_code": macro_text
                })

            # Capture any file-level headers (everything before the first macro)
            file_header = ""
            if macro_starts and macro_starts[0][1] > 0:
                file_header = "".join(lines[0:macro_starts[0][1]]).strip()
                if file_header:
                    file_header += "\n\n"

            if macros:
                manifest.append({
                    "filename": filename,
                    "file_header": file_header,
                    "macros": macros
                })

    with open(MANIFEST_PATH, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=4)

    print(f"Manifest built successfully with {len(manifest)} categorized files.")

if __name__ == '__main__':
    build_manifest()